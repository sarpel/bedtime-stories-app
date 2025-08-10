#!/usr/bin/env bash
# =============================================================================
# PRODUCTION SETUP SCRIPT FOR RASPBERRY PI ZERO 2 W
# =============================================================================
# This script provides enhanced deployment capabilities for the bedtime stories
# app, building on the existing install_pi_zero_host.sh with additional
# production-ready features and validation.
#
# Usage: sudo bash setup.sh [options]
# 
# This script wraps and enhances the existing installer with:
# - Pre-deployment validation and environment checks
# - Post-deployment health verification
# - Rollback capabilities
# - Enhanced logging and reporting
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# -----------------------------------------------------------------------------
# CONFIGURATION & DEFAULTS
# -----------------------------------------------------------------------------
readonly SCRIPT_VERSION="1.5.0"
readonly SCRIPT_NAME="$(basename "$0")"
readonly LOG_FILE="/var/log/storyapp-setup-$(date +%Y%m%d-%H%M%S).log"
readonly BACKUP_DIR="/root/storyapp-backups"
readonly HEALTH_CHECK_TIMEOUT=30
readonly MIN_FREE_SPACE_MB=1024
readonly MIN_FREE_MEMORY_MB=64

# Setup defaults (can be overridden via environment)
APP_REPO="${APP_REPO:-https://github.com/sarpel/bedtime-stories-app.git}"
APP_PORT="${APP_PORT:-8080}"
APP_DIR="${APP_DIR:-/opt/storyapp}"
APP_HOSTNAME="${APP_HOSTNAME:-story}"
APP_ENV="${APP_ENV:-production}"

# Script flags
DRY_RUN=0
SKIP_AUDIO_TEST=0
VERBOSE=0
FORCE=0
ROLLBACK_VERSION=""

# -----------------------------------------------------------------------------
# LOGGING & UTILITY FUNCTIONS
# -----------------------------------------------------------------------------
setup_logging() {
    exec 1> >(tee -a "$LOG_FILE")
    exec 2> >(tee -a "$LOG_FILE" >&2)
    log "INFO" "Setup script started - Version $SCRIPT_VERSION"
    log "INFO" "Log file: $LOG_FILE"
}

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message"
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
    
    log "INFO" "$desc completed successfully"
}

# -----------------------------------------------------------------------------
# VALIDATION FUNCTIONS
# -----------------------------------------------------------------------------
check_root_privileges() {
    if [ "$EUID" -ne 0 ]; then
        error_exit "This script must be run as root (use sudo)"
    fi
}

detect_raspberry_pi() {
    log "INFO" "Detecting Raspberry Pi hardware..."
    
    if ! [ -f /proc/device-tree/model ]; then
        error_exit "Not running on Raspberry Pi (no device tree found)"
    fi
    
    local model=$(cat /proc/device-tree/model 2>/dev/null | tr -d '\0')
    log "INFO" "Detected: $model"
    
    if [[ ! "$model" =~ "Raspberry Pi Zero 2" ]]; then
        log "WARN" "Not running on Pi Zero 2 W - performance may vary"
    fi
    
    # Check architecture
    local arch=$(dpkg --print-architecture 2>/dev/null || echo "unknown")
    log "INFO" "Architecture: $arch"
    
    if [ "$arch" != "armhf" ] && [ "$arch" != "arm64" ]; then
        error_exit "Unsupported architecture: $arch (expected armhf or arm64)"
    fi
}

check_memory_requirements() {
    log "INFO" "Checking memory requirements..."
    
    local total_mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local total_mem_mb=$((total_mem_kb / 1024))
    local avail_mem_kb=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    local avail_mem_mb=$((avail_mem_kb / 1024))
    
    log "INFO" "Total memory: ${total_mem_mb}MB, Available: ${avail_mem_mb}MB"
    
    if [ "$total_mem_mb" -lt 256 ]; then
        error_exit "Insufficient memory: ${total_mem_mb}MB (minimum 256MB required)"
    fi
    
    if [ "$avail_mem_mb" -lt "$MIN_FREE_MEMORY_MB" ]; then
        log "WARN" "Low available memory: ${avail_mem_mb}MB (recommended: >${MIN_FREE_MEMORY_MB}MB)"
    fi
}

check_disk_space() {
    log "INFO" "Checking disk space..."
    
    local root_avail_kb=$(df / | awk 'NR==2 {print $4}')
    local root_avail_mb=$((root_avail_kb / 1024))
    
    log "INFO" "Available disk space: ${root_avail_mb}MB"
    
    if [ "$root_avail_mb" -lt "$MIN_FREE_SPACE_MB" ]; then
        error_exit "Insufficient disk space: ${root_avail_mb}MB (minimum ${MIN_FREE_SPACE_MB}MB required)"
    fi
}

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
    
    log "INFO" "Network connectivity verified"
}

validate_environment() {
    log "INFO" "Validating deployment environment..."
    
    check_root_privileges
    detect_raspberry_pi
    check_memory_requirements
    check_disk_space
    check_network_connectivity
    
    # Check for existing installation
    if [ -d "$APP_DIR" ] && [ ! "$FORCE" -eq 1 ]; then
        log "WARN" "Existing installation found at $APP_DIR"
        log "WARN" "Use --force to overwrite or --rollback to restore previous version"
        
        # Show current version if available
        if [ -f "$APP_DIR/current/package.json" ]; then
            local current_version=$(grep '"version"' "$APP_DIR/current/package.json" | cut -d'"' -f4)
            log "INFO" "Current version: $current_version"
        fi
    fi
    
    log "INFO" "Environment validation completed"
}

# -----------------------------------------------------------------------------
# BACKUP & ROLLBACK FUNCTIONS
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
    
    run_command "Create installation backup" tar -czf "${backup_path}.tar.gz" \
        -C / \
        opt/storyapp/current \
        var/lib/storyapp \
        etc/storyapp \
        etc/systemd/system/storyapp.service \
        etc/systemd/system/storyaudio.service \
        2>/dev/null || true
        
    # Create metadata file
    cat > "${backup_path}.info" << EOF
Backup created: $(date)
Backup script: $SCRIPT_NAME v$SCRIPT_VERSION
System: $(uname -a)
App version: $(grep '"version"' "$APP_DIR/current/package.json" 2>/dev/null | cut -d'"' -f4 || echo "unknown")
Backup size: $(du -h "${backup_path}.tar.gz" | cut -f1)
EOF
    
    log "INFO" "Backup created: ${backup_path}.tar.gz"
    echo "${backup_path}.tar.gz" > /tmp/storyapp-last-backup
}

list_backups() {
    log "INFO" "Available backups:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log "INFO" "No backups found"
        return 0
    fi
    
    find "$BACKUP_DIR" -name "*.tar.gz" -type f | sort -r | while read backup; do
        local info_file="${backup%.tar.gz}.info"
        local size=$(du -h "$backup" | cut -f1)
        local date=$(stat -c %y "$backup" | cut -d' ' -f1)
        
        echo "  $backup (${size}, $date)"
        
        if [ -f "$info_file" ]; then
            grep "App version:" "$info_file" 2>/dev/null | sed 's/^/    /' || true
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
    systemctl stop storyapp.service || true
    systemctl stop storyaudio.service || true
    
    # Create rollback point
    create_backup
    
    # Restore from backup
    run_command "Extract backup" tar -xzf "$backup_file" -C /
    
    # Restart services
    run_command "Reload systemd" systemctl daemon-reload
    run_command "Start services" systemctl start storyapp.service
    
    log "INFO" "Rollback completed successfully"
}

# -----------------------------------------------------------------------------
# DEPLOYMENT FUNCTIONS
# -----------------------------------------------------------------------------
run_installer() {
    log "INFO" "Executing main installer..."
    
    # Prepare installer command
    local installer_cmd="bash"
    local installer_args=()
    
    # Add environment variables
    env APP_REPO="$APP_REPO" \
        APP_PORT="$APP_PORT" \
        APP_DIR="$APP_DIR" \
        APP_HOSTNAME="$APP_HOSTNAME" \
        APP_ENV="$APP_ENV" \
        installer_cmd "./install_pi_zero_host.sh"
        
    # Add flags based on setup options
    if [ "$DRY_RUN" -eq 1 ]; then
        installer_args+=("--dry-run")
    fi
    
    if [ "$SKIP_AUDIO_TEST" -eq 1 ]; then
        installer_args+=("--no-audio")
    fi
    
    # Always use swap during build on Pi Zero 2 W for better success rate
    installer_args+=("--swap-during-build")
    
    log "INFO" "Installer command: $installer_cmd ${installer_args[*]}"
    
    if [ "$DRY_RUN" -eq 1 ]; then
        log "DRY_RUN" "Would execute installer with args: ${installer_args[*]}"
        return 0
    fi
    
    # Download installer if not present
    if [ ! -f "./install_pi_zero_host.sh" ]; then
        log "INFO" "Downloading installer script..."
        curl -fsSL "${APP_REPO%%.git}/raw/main/install_pi_zero_host.sh" -o install_pi_zero_host.sh
        chmod +x install_pi_zero_host.sh
    fi
    
    # Execute installer
    if ! env APP_REPO="$APP_REPO" \
            APP_PORT="$APP_PORT" \
            APP_DIR="$APP_DIR" \
            APP_HOSTNAME="$APP_HOSTNAME" \
            APP_ENV="$APP_ENV" \
            bash ./install_pi_zero_host.sh "${installer_args[@]}" >> "$LOG_FILE" 2>&1; then
        error_exit "Main installer failed - see log for details"
    fi
    
    log "INFO" "Main installer completed successfully"
}

# -----------------------------------------------------------------------------
# HEALTH CHECK & VALIDATION FUNCTIONS
# -----------------------------------------------------------------------------
wait_for_service() {
    local service_name="$1"
    local timeout="${2:-30}"
    
    log "INFO" "Waiting for $service_name to become active (timeout: ${timeout}s)..."
    
    local count=0
    while [ $count -lt $timeout ]; do
        if systemctl is-active --quiet "$service_name"; then
            log "INFO" "$service_name is active"
            return 0
        fi
        
        sleep 1
        ((count++))
    done
    
    error_exit "$service_name failed to start within ${timeout}s"
}

test_health_endpoint() {
    log "INFO" "Testing application health endpoint..."
    
    local health_url="http://localhost:$APP_PORT/healthz"
    local timeout="$HEALTH_CHECK_TIMEOUT"
    
    for i in $(seq 1 $timeout); do
        if curl -fsSL --max-time 5 "$health_url" >/dev/null 2>&1; then
            log "INFO" "Health endpoint responding correctly"
            
            # Get detailed health info
            local health_response=$(curl -fsSL --max-time 5 "$health_url" 2>/dev/null || echo '{"status":"unknown"}')
            log "INFO" "Health response: $health_response"
            return 0
        fi
        
        sleep 1
    done
    
    error_exit "Health endpoint not responding after ${timeout}s"
}

test_audio_playback() {
    if [ "$SKIP_AUDIO_TEST" -eq 1 ]; then
        log "INFO" "Audio test skipped (--skip-audio-test)"
        return 0
    fi
    
    log "INFO" "Testing audio playback..."
    
    # Check if audio device is available
    if ! aplay -l | grep -qi "iqaudio\|wm8960\|codec"; then
        log "WARN" "Audio device not detected - may require reboot"
        return 0
    fi
    
    # Test basic audio playback
    local test_wav="/usr/share/sounds/alsa/Front_Center.wav"
    if [ -f "$test_wav" ]; then
        if timeout 10 /usr/local/bin/play_story --timeout 3 "$test_wav" >/dev/null 2>&1; then
            log "INFO" "Audio playback test successful"
        else
            log "WARN" "Audio playback test failed (may need volume adjustment)"
        fi
    else
        log "WARN" "Test audio file not found - skipping audio test"
    fi
}

validate_deployment() {
    log "INFO" "Validating deployment..."
    
    # Check service status
    wait_for_service "storyapp.service" "$HEALTH_CHECK_TIMEOUT"
    
    # Test health endpoint
    test_health_endpoint
    
    # Test audio (optional)
    test_audio_playback
    
    # Check file permissions
    if [ -f "$APP_DIR/current/backend/.env" ]; then
        local env_perms=$(stat -c %a "$APP_DIR/current/backend/.env")
        if [ "$env_perms" != "640" ]; then
            log "WARN" "Environment file permissions: $env_perms (should be 640)"
        fi
    fi
    
    # Generate deployment report
    generate_deployment_report
    
    log "INFO" "Deployment validation completed"
}

generate_deployment_report() {
    local report_file="/root/storyapp-deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
=============================================================================
BEDTIME STORIES APP - DEPLOYMENT REPORT
=============================================================================
Deployment Date: $(date)
Setup Script: $SCRIPT_NAME v$SCRIPT_VERSION
Repository: $APP_REPO
Target: Raspberry Pi Zero 2 W

HARDWARE INFORMATION:
$(cat /proc/device-tree/model 2>/dev/null | tr -d '\0')
Architecture: $(dpkg --print-architecture)
Memory: $(grep MemTotal /proc/meminfo | awk '{print $2/1024 " MB"}')
Storage: $(df -h / | awk 'NR==2 {print $2 " total, " $4 " available"}')
Temperature: $(vcgencmd measure_temp 2>/dev/null || echo "N/A")

APPLICATION STATUS:
App Directory: $APP_DIR
Service Status: $(systemctl is-active storyapp.service)
Port: $APP_PORT
Health URL: http://localhost:$APP_PORT/healthz
mDNS URL: http://$APP_HOSTNAME.local:$APP_PORT/

AUDIO CONFIGURATION:
$(aplay -l 2>/dev/null | head -5 || echo "Audio devices not detected")

I2S Overlays: $(dtoverlay -l 2>/dev/null | grep -i iqaudio || echo "None detected")

RECENT LOGS:
$(journalctl -u storyapp.service --no-pager -n 10 2>/dev/null || echo "No recent logs")

PERFORMANCE METRICS:
CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%
Memory Usage: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
Disk Usage: $(df / | awk 'NR==2{print $5}')

NEXT STEPS:
1. Configure API keys: sudo nano $APP_DIR/current/backend/.env
2. Restart services: sudo systemctl restart storyapp
3. Test application: curl http://localhost:$APP_PORT/healthz
4. Access via browser: http://$APP_HOSTNAME.local:$APP_PORT/

For troubleshooting: https://github.com/sarpel/bedtime-stories-app

=============================================================================
EOF

    log "INFO" "Deployment report generated: $report_file"
    echo
    echo "📊 Deployment report: $report_file"
}

# -----------------------------------------------------------------------------
# USAGE & ARGUMENT PARSING
# -----------------------------------------------------------------------------
show_usage() {
    cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Enhanced setup script for Bedtime Stories App on Raspberry Pi Zero 2 W

OPTIONS:
    --dry-run              Show what would be done without executing
    --skip-audio-test      Skip audio hardware testing
    --verbose              Enable verbose logging
    --force                Overwrite existing installation
    --rollback VERSION     Rollback to previous backup
    --list-backups         List available backups
    --help                 Show this help message

ENVIRONMENT VARIABLES:
    APP_REPO               Git repository URL (default: GitHub repo)
    APP_PORT               Application port (default: 8080)
    APP_DIR                Installation directory (default: /opt/storyapp)
    APP_HOSTNAME           System hostname for mDNS (default: story)
    APP_ENV                Environment mode (default: production)

EXAMPLES:
    # Basic installation
    sudo bash $SCRIPT_NAME

    # Dry run to see what would be done
    sudo bash $SCRIPT_NAME --dry-run

    # Install with custom hostname
    sudo APP_HOSTNAME=bedtime bash $SCRIPT_NAME

    # Rollback to previous version
    sudo bash $SCRIPT_NAME --rollback /root/storyapp-backups/backup.tar.gz

    # List available backups
    sudo bash $SCRIPT_NAME --list-backups

For more information: https://github.com/sarpel/bedtime-stories-app
EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=1
                shift
                ;;
            --skip-audio-test)
                SKIP_AUDIO_TEST=1
                shift
                ;;
            --verbose)
                VERBOSE=1
                shift
                ;;
            --force)
                FORCE=1
                shift
                ;;
            --rollback)
                ROLLBACK_VERSION="$2"
                shift 2
                ;;
            --list-backups)
                list_backups
                exit 0
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# -----------------------------------------------------------------------------
# MAIN EXECUTION
# -----------------------------------------------------------------------------
main() {
    # Parse command line arguments
    parse_arguments "$@"
    
    # Setup logging (only for non-dry-run or when explicitly verbose)
    if [ "$DRY_RUN" -eq 0 ] || [ "$VERBOSE" -eq 1 ]; then
        setup_logging
    fi
    
    # Print banner
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║              🌙 BEDTIME STORIES APP - PRODUCTION SETUP 🌙               ║
║                                                                           ║
║                    Raspberry Pi Zero 2 W Deployment                      ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    
    echo
    log "INFO" "Starting setup - Version $SCRIPT_VERSION"
    
    # Handle rollback request
    if [ -n "$ROLLBACK_VERSION" ]; then
        perform_rollback "$ROLLBACK_VERSION"
        echo
        echo "✅ Rollback completed successfully!"
        exit 0
    fi
    
    # Pre-deployment validation
    validate_environment
    
    # Create backup of existing installation
    create_backup
    
    # Execute main deployment
    run_installer
    
    # Post-deployment validation
    validate_deployment
    
    # Success message
    echo
    echo "🎉 Deployment completed successfully!"
    echo
    echo "📱 Access your app:"
    echo "   Local:  http://localhost:$APP_PORT/"
    echo "   mDNS:   http://$APP_HOSTNAME.local:$APP_PORT/"
    echo
    echo "🔧 Next steps:"
    echo "   1. Configure API keys: sudo nano $APP_DIR/current/backend/.env"
    echo "   2. Restart services:   sudo systemctl restart storyapp"
    echo "   3. View logs:          sudo journalctl -u storyapp -f"
    echo
    echo "📚 Documentation: https://github.com/sarpel/bedtime-stories-app"
    echo "🏥 Health check:  curl http://localhost:$APP_PORT/healthz"
    echo
    
    # Show warning if reboot needed
    if dmesg | tail -20 | grep -qi "reboot\|restart"; then
        echo "⚠️  A reboot may be required for audio configuration:"
        echo "   sudo reboot"
        echo
    fi
    
    log "INFO" "Setup completed successfully"
}

# Execute main function with all arguments
main "$@"
