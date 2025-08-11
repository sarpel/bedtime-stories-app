#!/usr/bin/env bash
# =============================================================================
# PRODUCTION SETUP SCRIPT FOR RASPBERRY PI ZERO 2 W with IQaudio Codec Zero
# =============================================================================
# Enhanced deployment script for the Turkish Bedtime Stories app specifically
# optimized for Raspberry Pi Zero 2 W with IQaudio Codec Zero audio HAT
# (pre-Raspberry Pi acquisition model).
#
# This script provides:
# - Hardware-specific validation for Pi Zero 2W and IQaudio Codec Zero
# - Pre-deployment environment checks and validation
# - Automated backup and rollback capabilities
# - Post-deployment health verification and audio testing
# - Enhanced logging and error reporting
# - Memory and performance optimizations for Pi Zero 2W
#
# Usage: sudo bash setup.sh [options]
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# -----------------------------------------------------------------------------
# CONFIGURATION & DEFAULTS
# -----------------------------------------------------------------------------
readonly SCRIPT_VERSION="2.0.0"
readonly SCRIPT_NAME="$(basename "$0")"
readonly LOG_FILE="/var/log/storyapp-setup-$(date +%Y%m%d-%H%M%S).log"
readonly BACKUP_DIR="/root/storyapp-backups"
readonly HEALTH_CHECK_TIMEOUT=30
readonly MIN_FREE_SPACE_MB=1024
readonly MIN_FREE_MEMORY_MB=128  # Pi Zero 2W has 512MB total
readonly AUDIO_TEST_TIMEOUT=10

# Pi Zero 2W and IQaudio specific settings
readonly REQUIRED_PI_MODEL="Raspberry Pi Zero 2"
readonly SUPPORTED_AUDIO_HATS=("IQaudio" "iqaudio" "IQaudIO" "wm8960" "codec")
readonly PI_ZERO_SWAP_SIZE=512  # MB for build operations

# Setup defaults (can be overridden via environment)
APP_REPO="${APP_REPO:-https://github.com/sarpel/bedtime-stories-app.git}"
APP_PORT="${APP_PORT:-8080}"
APP_DIR="${APP_DIR:-/opt/storyapp}"
APP_HOSTNAME="${APP_HOSTNAME:-story}"
APP_ENV="${APP_ENV:-production}"
MEDIA_DIR="${MEDIA_DIR:-/var/lib/storyapp/media}"

# Script flags
DRY_RUN=0
SKIP_AUDIO_TEST=0
VERBOSE=0
FORCE=0
ROLLBACK_VERSION=""
ENABLE_SWAP_FOR_BUILD=1  # Default enabled for Pi Zero 2W
NO_AUDIO_SETUP=0

# -----------------------------------------------------------------------------
# LOGGING & UTILITY FUNCTIONS
# -----------------------------------------------------------------------------
setup_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    exec 1> >(tee -a "$LOG_FILE")
    exec 2> >(tee -a "$LOG_FILE" >&2)
    log "INFO" "Pi Zero 2W Setup Script v$SCRIPT_VERSION started"
    log "INFO" "Target: Raspberry Pi Zero 2 W with IQaudio Codec Zero"
    log "INFO" "Log file: $LOG_FILE"
}

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message"
}

log_separator() {
    log "INFO" "=============================================================="
}

error_exit() {
    log "ERROR" "$1"
    echo
    echo "❌ Setup failed! Check log file: $LOG_FILE"
    echo "   For help: https://github.com/sarpel/bedtime-stories-app/issues"
    exit 1
}

run_command() {
    local desc="$1"
    shift

    if [ "$VERBOSE" -eq 1 ]; then
        log "DEBUG" "Executing: $*"
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
        log "DRY_RUN" "$desc: $*"
        return 0
    fi

    if ! "$@" >> "$LOG_FILE" 2>&1; then
        error_exit "$desc failed: $*"
    fi

    log "INFO" "✅ $desc completed successfully"
}

# -----------------------------------------------------------------------------
# HARDWARE VALIDATION FOR PI ZERO 2W + IQAUDIO
# -----------------------------------------------------------------------------
detect_pi_zero_2w() {
    log "INFO" "Validating Raspberry Pi Zero 2 W hardware..."

    if ! [ -f /proc/device-tree/model ]; then
        error_exit "Not running on Raspberry Pi (no device tree found)"
    fi

    local model=$(cat /proc/device-tree/model 2>/dev/null | tr -d '\0')
    log "INFO" "Detected hardware: $model"

    if [[ ! "$model" =~ $REQUIRED_PI_MODEL ]]; then
        if [ "$FORCE" -eq 0 ]; then
            error_exit "Hardware mismatch: Expected '$REQUIRED_PI_MODEL', got '$model'. Use --force to override."
        else
            log "WARN" "Hardware mismatch detected but proceeding due to --force flag"
        fi
    else
        log "INFO" "✅ Confirmed Raspberry Pi Zero 2 W hardware"
    fi

    # Check architecture - Pi Zero 2W should be armhf or arm64
    local arch=$(dpkg --print-architecture 2>/dev/null || echo "unknown")
    log "INFO" "Architecture: $arch"

    if [ "$arch" != "armhf" ] && [ "$arch" != "arm64" ]; then
        error_exit "Unsupported architecture: $arch (Pi Zero 2W expected armhf or arm64)"
    fi
}

detect_iqaudio_codec_zero() {
    log "INFO" "Detecting IQaudio Codec Zero HAT..."

    if [ "$NO_AUDIO_SETUP" -eq 1 ]; then
        log "INFO" "Audio setup skipped (--no-audio flag)"
        return 0
    fi

    local audio_detected=0
    local detection_methods=()

    # Method 1: Check for existing audio cards
    if command -v aplay >/dev/null 2>&1; then
        local audio_cards=$(aplay -l 2>/dev/null || true)
        for hat in "${SUPPORTED_AUDIO_HATS[@]}"; do
            if echo "$audio_cards" | grep -qi "$hat"; then
                log "INFO" "✅ Found $hat audio device via aplay"
                audio_detected=1
                detection_methods+=("aplay-$hat")
                break
            fi
        done
    fi

    # Method 2: Check loaded kernel modules
    local loaded_modules=$(lsmod 2>/dev/null || true)
    for module in "snd_soc_wm8960" "snd_soc_iqaudio_codec"; do
        if echo "$loaded_modules" | grep -q "$module"; then
            log "INFO" "✅ Found audio module: $module"
            audio_detected=1
            detection_methods+=("module-$module")
        fi
    done

    # Method 3: Check device tree overlays
    if [ -f /boot/firmware/config.txt ] || [ -f /boot/config.txt ]; then
        local config_file="/boot/firmware/config.txt"
        [ -f /boot/config.txt ] && config_file="/boot/config.txt"

        for overlay in "iqaudio-codec" "iqaudio-dac" "wm8960-soundcard"; do
            if grep -q "dtoverlay=$overlay" "$config_file" 2>/dev/null; then
                log "INFO" "✅ Found audio overlay: $overlay in $config_file"
                audio_detected=1
                detection_methods+=("overlay-$overlay")
            fi
        done
    fi

    # Method 4: Check for HAT EEPROM (if available)
    if [ -f /proc/device-tree/hat/product ]; then
        local hat_product=$(cat /proc/device-tree/hat/product 2>/dev/null | tr -d '\0' || true)
        if echo "$hat_product" | grep -qi "iqaudio\|codec"; then
            log "INFO" "✅ Found HAT EEPROM: $hat_product"
            audio_detected=1
            detection_methods+=("eeprom-$hat_product")
        fi
    fi

    if [ "$audio_detected" -eq 1 ]; then
        log "INFO" "✅ IQaudio/compatible audio HAT detected via: ${detection_methods[*]}"
    else
        log "WARN" "⚠️  IQaudio Codec Zero not detected - audio setup will be attempted anyway"
        log "WARN" "   Make sure the HAT is properly connected and seated"
        log "WARN" "   Use --no-audio to skip audio configuration"
    fi
}

check_pi_zero_memory() {
    log "INFO" "Checking Pi Zero 2W memory configuration..."

    local total_mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local total_mem_mb=$((total_mem_kb / 1024))
    local avail_mem_kb=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    local avail_mem_mb=$((avail_mem_kb / 1024))

    log "INFO" "Memory: ${total_mem_mb}MB total, ${avail_mem_mb}MB available"

    # Pi Zero 2W has 512MB total
    if [ "$total_mem_mb" -lt 256 ]; then
        error_exit "Insufficient memory: ${total_mem_mb}MB (minimum 256MB required)"
    fi

    if [ "$total_mem_mb" -lt 450 ]; then
        log "WARN" "Low total memory detected: ${total_mem_mb}MB (Pi Zero 2W expected ~512MB)"
    fi

    if [ "$avail_mem_mb" -lt "$MIN_FREE_MEMORY_MB" ]; then
        log "WARN" "Low available memory: ${avail_mem_mb}MB (recommended: >${MIN_FREE_MEMORY_MB}MB)"
        log "WARN" "Consider closing unnecessary services before installation"
    fi

    # Check swap configuration
    local swap_total_kb=$(grep SwapTotal /proc/meminfo | awk '{print $2}')
    local swap_total_mb=$((swap_total_kb / 1024))

    if [ "$swap_total_mb" -lt 100 ] && [ "$ENABLE_SWAP_FOR_BUILD" -eq 1 ]; then
        log "WARN" "Low swap space: ${swap_total_mb}MB - will enable temporary swap for build"
    fi
}

check_sd_card_performance() {
    log "INFO" "Checking SD card performance..."

    local root_avail_kb=$(df / | awk 'NR==2 {print $4}')
    local root_avail_mb=$((root_avail_kb / 1024))
    local root_total_kb=$(df / | awk 'NR==2 {print $2}')
    local root_total_mb=$((root_total_kb / 1024))
    local root_used_pct=$(df / | awk 'NR==2 {print $5}' | tr -d '%')

    log "INFO" "Storage: ${root_total_mb}MB total, ${root_avail_mb}MB available (${root_used_pct}% used)"

    if [ "$root_avail_mb" -lt "$MIN_FREE_SPACE_MB" ]; then
        error_exit "Insufficient disk space: ${root_avail_mb}MB (minimum ${MIN_FREE_SPACE_MB}MB required)"
    fi

    # Quick write test for SD card performance
    log "INFO" "Testing SD card write performance..."
    local test_file="/tmp/sdcard-test-$$"
    local start_time=$(date +%s%N)

    if dd if=/dev/zero of="$test_file" bs=1M count=10 oflag=sync 2>/dev/null; then
        local end_time=$(date +%s%N)
        local duration_ms=$(( (end_time - start_time) / 1000000 ))
        local speed_mbps=$(( 10000 / duration_ms ))

        rm -f "$test_file"

        log "INFO" "SD card write speed: ~${speed_mbps}MB/s"

        if [ "$speed_mbps" -lt 5 ]; then
            log "WARN" "Slow SD card detected (${speed_mbps}MB/s) - build may take longer"
        fi
    else
        log "WARN" "Could not test SD card performance"
    fi
}

# -----------------------------------------------------------------------------
# NETWORK & CONNECTIVITY VALIDATION
# -----------------------------------------------------------------------------
check_network_connectivity() {
    log "INFO" "Checking network connectivity..."

    # Test DNS resolution
    if ! nslookup github.com >/dev/null 2>&1; then
        error_exit "DNS resolution failed - check network configuration"
    fi

    # Test HTTPS connectivity to GitHub
    if ! curl -sSf --max-time 10 https://github.com >/dev/null 2>&1; then
        error_exit "Cannot reach GitHub - check internet connectivity"
    fi

    # Test Node.js repository access
    if ! curl -sSf --max-time 10 https://deb.nodesource.com >/dev/null 2>&1; then
        log "WARN" "Cannot reach NodeSource repository - Node.js installation may fail"
    fi

    log "INFO" "✅ Network connectivity verified"
}

# -----------------------------------------------------------------------------
# VALIDATION ORCHESTRATION
# -----------------------------------------------------------------------------
validate_environment() {
    log_separator
    log "INFO" "VALIDATING DEPLOYMENT ENVIRONMENT"
    log_separator

    # Check root privileges
    if [ "$EUID" -ne 0 ]; then
        error_exit "This script must be run as root (use sudo)"
    fi

    detect_pi_zero_2w
    detect_iqaudio_codec_zero
    check_pi_zero_memory
    check_sd_card_performance
    check_network_connectivity

    # Check for existing installation
    if [ -d "$APP_DIR" ] && [ ! "$FORCE" -eq 1 ]; then
        log "WARN" "Existing installation found at $APP_DIR"

        if [ -f "$APP_DIR/current/package.json" ]; then
            local current_version=$(grep '"version"' "$APP_DIR/current/package.json" | cut -d'"' -f4 2>/dev/null || echo "unknown")
            log "INFO" "Current version: $current_version"
        fi

        if [ -z "$ROLLBACK_VERSION" ]; then
            log "WARN" "Use --force to overwrite or --rollback <backup> to restore previous version"
            list_backups
            exit 1
        fi
    fi

    log "INFO" "✅ Environment validation completed successfully"
}

# -----------------------------------------------------------------------------
# BACKUP & ROLLBACK MANAGEMENT
# -----------------------------------------------------------------------------
create_backup() {
    if [ ! -d "$APP_DIR" ]; then
        log "INFO" "No existing installation to backup"
        return 0
    fi

    log "INFO" "Creating backup of existing installation..."

    local backup_name="storyapp-backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"

    run_command "Create backup directory" mkdir -p "$BACKUP_DIR"

    # Create comprehensive backup
    run_command "Create installation backup" tar -czf "${backup_path}.tar.gz" \
        --ignore-failed-read \
        -C / \
        opt/storyapp/current \
        var/lib/storyapp \
        etc/storyapp \
        etc/systemd/system/storyapp.service \
        etc/systemd/system/storyaudio.service \
        etc/alsa/conf.d/99-storycard.conf \
        boot/firmware/config.txt \
        boot/config.txt \
        2>/dev/null || true

    # Create metadata file
    cat > "${backup_path}.info" << EOF
Backup created: $(date)
Backup script: $SCRIPT_NAME v$SCRIPT_VERSION
System: $(uname -a)
Pi Model: $(cat /proc/device-tree/model 2>/dev/null | tr -d '\0' || echo "unknown")
App version: $(grep '"version"' "$APP_DIR/current/package.json" 2>/dev/null | cut -d'"' -f4 || echo "unknown")
Backup size: $(du -h "${backup_path}.tar.gz" | cut -f1)
Audio devices: $(aplay -l 2>/dev/null | grep -E "card|device" || echo "none")
EOF

    log "INFO" "✅ Backup created: ${backup_path}.tar.gz"
    echo "${backup_path}.tar.gz" > /tmp/storyapp-last-backup
}

list_backups() {
    log "INFO" "Available backups:"

    if [ ! -d "$BACKUP_DIR" ]; then
        log "INFO" "No backups found"
        return 0
    fi

    find "$BACKUP_DIR" -name "*.tar.gz" -type f | sort -r | head -10 | while read backup; do
        local info_file="${backup%.tar.gz}.info"
        local size=$(du -h "$backup" | cut -f1)
        local date=$(stat -c %y "$backup" | cut -d' ' -f1)

        echo "  📦 $backup (${size}, $date)"

        if [ -f "$info_file" ]; then
            grep "App version:" "$info_file" 2>/dev/null | sed 's/^/      /' || true
        fi
    done
}

perform_rollback() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        error_exit "Backup file not found: $backup_file"
    fi

    log "INFO" "Rolling back to: $backup_file"

    # Stop services
    systemctl stop storyapp.service 2>/dev/null || true
    systemctl stop storyaudio.service 2>/dev/null || true

    # Create rollback point
    create_backup

    # Restore from backup
    run_command "Extract backup" tar -xzf "$backup_file" -C /

    # Restart services
    run_command "Reload systemd" systemctl daemon-reload
    run_command "Start services" systemctl start storyapp.service

    log "INFO" "✅ Rollback completed successfully"
}

# -----------------------------------------------------------------------------
# DEPLOYMENT EXECUTION
# -----------------------------------------------------------------------------
setup_pi_zero_optimizations() {
    log "INFO" "Applying Pi Zero 2W optimizations..."

    # Temporarily increase swap for build operations if needed
    if [ "$ENABLE_SWAP_FOR_BUILD" -eq 1 ]; then
        local current_swap=$(free -m | awk '/^Swap:/ {print $2}')
        if [ "$current_swap" -lt 256 ]; then
            log "INFO" "Creating temporary swap file for build operations..."

            if ! swapon --show | grep -q "/swapfile"; then
                dd if=/dev/zero of=/swapfile bs=1M count=$PI_ZERO_SWAP_SIZE 2>/dev/null || true
                chmod 600 /swapfile 2>/dev/null || true
                mkswap /swapfile 2>/dev/null || true
                swapon /swapfile 2>/dev/null || true
                echo "TEMP_SWAP_CREATED=1" > /tmp/storyapp-temp-swap
            fi
        fi
    fi

    # Set conservative CPU governor during installation
    if [ -f /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor ]; then
        echo "conservative" > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || true
    fi
}

cleanup_pi_zero_optimizations() {
    log "INFO" "Cleaning up temporary optimizations..."

    # Remove temporary swap if we created it
    if [ -f /tmp/storyapp-temp-swap ]; then
        swapoff /swapfile 2>/dev/null || true
        rm -f /swapfile 2>/dev/null || true
        rm -f /tmp/storyapp-temp-swap
    fi

    # Reset CPU governor
    if [ -f /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor ]; then
        echo "ondemand" > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || true
    fi
}

run_installer() {
    log_separator
    log "INFO" "EXECUTING MAIN INSTALLATION"
    log_separator

    setup_pi_zero_optimizations

    # Prepare installer command arguments
    local installer_args=()

    if [ "$DRY_RUN" -eq 1 ]; then
        installer_args+=("--dry-run")
    fi

    if [ "$NO_AUDIO_SETUP" -eq 1 ]; then
        installer_args+=("--no-audio")
    fi

    if [ "$ENABLE_SWAP_FOR_BUILD" -eq 1 ]; then
        installer_args+=("--swap-during-build")
    fi

    # Execute the main installer with environment variables
    log "INFO" "Starting core installation process..."
    env APP_REPO="$APP_REPO" \
        APP_PORT="$APP_PORT" \
        APP_DIR="$APP_DIR" \
        APP_HOSTNAME="$APP_HOSTNAME" \
        APP_ENV="$APP_ENV" \
        MEDIA_DIR="$MEDIA_DIR" \
        bash "$0" "${installer_args[@]}"

    cleanup_pi_zero_optimizations

    log "INFO" "✅ Core installation completed"
}

# -----------------------------------------------------------------------------
# POST-DEPLOYMENT VALIDATION & TESTING
# -----------------------------------------------------------------------------
verify_installation() {
    log_separator
    log "INFO" "VERIFYING INSTALLATION"
    log_separator

    # Check services are running
    log "INFO" "Checking system services..."

    if systemctl is-active --quiet storyapp.service; then
        log "INFO" "✅ storyapp.service is running"
    else
        error_exit "❌ storyapp.service is not running"
    fi

    if systemctl is-enabled --quiet storyapp.service; then
        log "INFO" "✅ storyapp.service is enabled"
    else
        log "WARN" "⚠️  storyapp.service is not enabled for auto-start"
    fi

    # Check HTTP endpoint
    log "INFO" "Testing HTTP endpoint..."
    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sSf --max-time 5 "http://localhost:$APP_PORT/healthz" >/dev/null 2>&1; then
            log "INFO" "✅ HTTP endpoint responding on port $APP_PORT"
            break
        else
            log "WARN" "Attempt $attempt/$max_attempts: HTTP endpoint not ready, waiting..."
            sleep 3
            ((attempt++))
        fi
    done

    if [ $attempt -gt $max_attempts ]; then
        error_exit "❌ HTTP endpoint failed to respond after $max_attempts attempts"
    fi
}

test_audio_functionality() {
    if [ "$SKIP_AUDIO_TEST" -eq 1 ] || [ "$NO_AUDIO_SETUP" -eq 1 ]; then
        log "INFO" "Audio testing skipped"
        return 0
    fi

    log "INFO" "Testing audio functionality..."

    # Check audio devices
    if command -v aplay >/dev/null 2>&1; then
        local audio_devices=$(aplay -l 2>/dev/null || true)
        if [ -n "$audio_devices" ]; then
            log "INFO" "✅ Audio devices detected:"
            echo "$audio_devices" | grep -E "card|device" | sed 's/^/    /'
        else
            log "WARN" "⚠️  No audio devices detected by aplay"
        fi
    fi

    # Test ALSA configuration
    if amixer info >/dev/null 2>&1; then
        log "INFO" "✅ ALSA mixer functional"

        # Try to set a safe volume level
        amixer sset Master 70% unmute >/dev/null 2>&1 || true
        amixer sset Headphone 70% unmute >/dev/null 2>&1 || true
        amixer sset Speaker 70% unmute >/dev/null 2>&1 || true
    else
        log "WARN" "⚠️  ALSA mixer not responding"
    fi

    # Test audio playback capability
    local test_audio="/usr/share/sounds/alsa/Front_Center.wav"
    if [ -f "$test_audio" ] && command -v aplay >/dev/null 2>&1; then
        log "INFO" "Testing audio playback with system test file..."

        if timeout $AUDIO_TEST_TIMEOUT aplay -q "$test_audio" 2>/dev/null; then
            log "INFO" "✅ Audio playback test successful"
        else
            log "WARN" "⚠️  Audio playback test failed (may require reboot for HAT recognition)"
        fi
    else
        log "INFO" "No system test audio file available for playback test"
    fi

    # Check play_story utility
    if [ -x /usr/local/bin/play_story ] && [ -f "$test_audio" ]; then
        log "INFO" "Testing play_story utility..."
        if timeout $AUDIO_TEST_TIMEOUT /usr/local/bin/play_story --timeout 3 "$test_audio" 2>/dev/null; then
            log "INFO" "✅ play_story utility working"
        else
            log "WARN" "⚠️  play_story utility test failed"
        fi
    fi
}

run_health_checks() {
    log "INFO" "Running comprehensive health checks..."

    # Memory usage check
    local mem_usage=$(free | awk '/^Mem:/ {printf "%.1f", $3/$2 * 100}')
    log "INFO" "Memory usage: ${mem_usage}%"

    if (( $(echo "$mem_usage > 80" | bc -l) )); then
        log "WARN" "High memory usage: ${mem_usage}%"
    fi

    # Disk usage check
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
    log "INFO" "Disk usage: ${disk_usage}%"

    if [ "$disk_usage" -gt 85 ]; then
        log "WARN" "High disk usage: ${disk_usage}%"
    fi

    # Check for any systemd failures
    local failed_services=$(systemctl --failed --no-legend | wc -l)
    if [ "$failed_services" -gt 0 ]; then
        log "WARN" "Found $failed_services failed systemd services"
        systemctl --failed --no-legend | sed 's/^/    /'
    else
        log "INFO" "✅ No failed systemd services"
    fi

    # Temperature check (if available)
    if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
        local temp=$(cat /sys/class/thermal/thermal_zone0/temp)
        local temp_c=$((temp / 1000))
        log "INFO" "CPU temperature: ${temp_c}°C"

        if [ "$temp_c" -gt 70 ]; then
            log "WARN" "High CPU temperature: ${temp_c}°C"
        fi
    fi
}

# -----------------------------------------------------------------------------
# ARGUMENT PARSING & MAIN EXECUTION
# -----------------------------------------------------------------------------
show_usage() {
    cat << EOF
Pi Zero 2W Bedtime Stories Setup Script v$SCRIPT_VERSION

USAGE:
    sudo bash $SCRIPT_NAME [OPTIONS]

OPTIONS:
    --help                  Show this help message
    --version              Show script version
    --dry-run              Show what would be done without executing
    --verbose              Enable verbose logging
    --force                Overwrite existing installation
    --no-audio             Skip audio HAT configuration
    --skip-audio-test      Skip audio functionality testing
    --no-swap              Disable temporary swap during build
<<<<<<< HEAD
    --swap-during-build    Enable temporary swap during build (default)
=======
>>>>>>> 97f23b3c26cddd2257d9679ec8125c37238a7b23
    --rollback BACKUP      Rollback to specified backup file

ENVIRONMENT VARIABLES:
    APP_REPO               Git repository URL (default: GitHub repo)
    APP_PORT               HTTP port (default: 8080)
    APP_HOSTNAME           Hostname for mDNS (default: story)
    APP_DIR                Installation directory (default: /opt/storyapp)

EXAMPLES:
    # Standard installation
    sudo bash $SCRIPT_NAME

    # Installation with custom hostname
    sudo APP_HOSTNAME=masal bash $SCRIPT_NAME

    # Dry run to see what would be done
    sudo bash $SCRIPT_NAME --dry-run

    # Skip audio setup for headless testing
    sudo bash $SCRIPT_NAME --no-audio

    # Rollback to previous version
    sudo bash $SCRIPT_NAME --rollback /root/storyapp-backups/backup.tar.gz

HARDWARE REQUIREMENTS:
    - Raspberry Pi Zero 2 W
    - IQaudio Codec Zero HAT (pre-acquisition model)
    - MicroSD card (8GB+ recommended, Class 10)
    - Network connectivity

For more information: https://github.com/sarpel/bedtime-stories-app
EOF
}

parse_arguments() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --help|-h)
                show_usage
                exit 0
                ;;
            --version)
                echo "$SCRIPT_NAME version $SCRIPT_VERSION"
                exit 0
                ;;
            --dry-run)
                DRY_RUN=1
                ;;
            --verbose)
                VERBOSE=1
                ;;
            --force)
                FORCE=1
                ;;
            --no-audio)
                NO_AUDIO_SETUP=1
                ;;
            --skip-audio-test)
                SKIP_AUDIO_TEST=1
                ;;
            --no-swap)
                ENABLE_SWAP_FOR_BUILD=0
                ;;
            --rollback)
                shift
                if [ $# -eq 0 ]; then
                    error_exit "--rollback requires a backup file path"
                fi
                ROLLBACK_VERSION="$1"
                ;;
            --list-backups)
                setup_logging
                list_backups
                exit 0
                ;;
            *)
                error_exit "Unknown option: $1 (use --help for usage)"
                ;;
        esac
        shift
    done
}

main() {
    parse_arguments "$@"
    setup_logging

    log_separator
    log "INFO" "RASPBERRY PI ZERO 2W BEDTIME STORIES SETUP"
    log "INFO" "Version: $SCRIPT_VERSION"
    log "INFO" "Target Hardware: Pi Zero 2W + IQaudio Codec Zero"
    log_separator

    # Handle rollback mode
    if [ -n "$ROLLBACK_VERSION" ]; then
        perform_rollback "$ROLLBACK_VERSION"
        exit 0
    fi

    # Standard installation flow
    validate_environment
    create_backup
    run_installer
    verify_installation
    test_audio_functionality
    run_health_checks

    log_separator
    log "INFO" "INSTALLATION COMPLETED SUCCESSFULLY!"
    log_separator

    # Final summary
    local app_url="http://$(hostname -I | awk '{print $1}'):$APP_PORT"
    local mdns_url="http://${APP_HOSTNAME}.local:$APP_PORT"

    cat << EOF

🎉 Turkish Bedtime Stories App Successfully Installed!

📍 ACCESS POINTS:
   Local IP:  $app_url
   mDNS:      $mdns_url

🔧 MANAGEMENT:
   Status:    sudo systemctl status storyapp
   Logs:      sudo journalctl -u storyapp -f
   Restart:   sudo systemctl restart storyapp

🎵 AUDIO:
   Test:      /usr/local/bin/play_story /usr/share/sounds/alsa/Front_Center.wav
   Config:    /etc/alsa/conf.d/99-storycard.conf

📁 IMPORTANT PATHS:
   App:       $APP_DIR/current
   Media:     $MEDIA_DIR
   Logs:      /var/log/storyapp
   Config:    /etc/storyapp

🛠️  MAINTENANCE:
   Backup:    sudo bash $SCRIPT_NAME --list-backups
   Update:    sudo APP_REPO=$APP_REPO bash $SCRIPT_NAME --force

If audio doesn't work immediately, try rebooting the Pi Zero 2W:
   sudo reboot

Setup log saved to: $LOG_FILE
EOF

    # Check if reboot is recommended
    if [ -f /tmp/storyapp-reboot-needed ]; then
        echo
        log "INFO" "⚠️  A reboot is recommended to finalize audio HAT configuration"
        echo "   Run: sudo reboot"
    fi
}

# Trap cleanup on exit
trap cleanup_pi_zero_optimizations EXIT

# Execute main function with all arguments
main "$@"
