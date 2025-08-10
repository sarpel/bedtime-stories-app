#!/bin/bash
# =============================================================================
# BEDTIME STORIES APP - PRODUCTION HEALTH CHECK SCRIPT
# =============================================================================
# Comprehensive health validation for Raspberry Pi Zero 2 W deployment
# Tests hardware, services, APIs, and application functionality
#
# Usage: ./health-check.sh [--verbose] [--fix-issues] [--format=json|text]
# Exit codes: 0=healthy, 1=warnings, 2=critical, 3=system error
# =============================================================================

set -euo pipefail

# Configuration variables
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly LOG_FILE="/var/log/storyapp/health-check.log"
readonly LOCK_FILE="/tmp/storyapp-health-check.lock"
readonly TIMEOUT_DURATION=30

# Health check configuration
readonly SERVICE_NAME="bedtime-stories-app"
readonly EXPECTED_PORT=8080
readonly MIN_FREE_MEMORY=64
readonly MIN_FREE_DISK=500
readonly MAX_CPU_TEMP=75
readonly MAX_LOAD_AVERAGE=3.0

# Output formatting
VERBOSE=false
FIX_ISSUES=false
OUTPUT_FORMAT="text"
ISSUES_FOUND=()
WARNINGS_FOUND=()

# ANSI color codes for output formatting
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Console output with colors
    case "$level" in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "DEBUG") [ "$VERBOSE" = true ] && echo -e "${CYAN}[DEBUG]${NC} $message" ;;
    esac
    
    # File logging
    if [[ -w "$(dirname "$LOG_FILE")" ]] 2>/dev/null; then
        echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    fi
}

error_exit() {
    log "ERROR" "$1"
    cleanup
    exit "${2:-3}"
}

cleanup() {
    if [[ -f "$LOCK_FILE" ]]; then
        rm -f "$LOCK_FILE"
    fi
}

trap cleanup EXIT INT TERM

create_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local lock_pid
        lock_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "unknown")
        
        if kill -0 "$lock_pid" 2>/dev/null; then
            error_exit "Health check already running (PID: $lock_pid)" 1
        else
            log "WARN" "Removing stale lock file"
            rm -f "$LOCK_FILE"
        fi
    fi
    
    echo $$ > "$LOCK_FILE"
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            --fix-issues|-f)
                FIX_ISSUES=true
                shift
                ;;
            --format=*)
                OUTPUT_FORMAT="${1#*=}"
                if [[ ! "$OUTPUT_FORMAT" =~ ^(json|text)$ ]]; then
                    error_exit "Invalid format: $OUTPUT_FORMAT. Use 'json' or 'text'." 1
                fi
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                error_exit "Unknown option: $1" 1
                ;;
        esac
    done
}

show_usage() {
    cat << EOF
${BOLD}Bedtime Stories App - Health Check Script${NC}

${BOLD}USAGE:${NC}
    $SCRIPT_NAME [OPTIONS]

${BOLD}OPTIONS:${NC}
    --verbose, -v        Enable verbose output
    --fix-issues, -f     Attempt to fix identified issues
    --format=FORMAT      Output format: json or text (default: text)
    --help, -h           Show this help message

${BOLD}EXIT CODES:${NC}
    0    All checks passed (healthy)
    1    Non-critical warnings found
    2    Critical issues found
    3    System error or script failure

${BOLD}EXAMPLES:${NC}
    $SCRIPT_NAME                    # Basic health check
    $SCRIPT_NAME --verbose          # Detailed output
    $SCRIPT_NAME --fix-issues       # Auto-fix issues
    $SCRIPT_NAME --format=json      # JSON output for monitoring
EOF
}

# =============================================================================
# HARDWARE HEALTH CHECKS
# =============================================================================

check_raspberry_pi_hardware() {
    log "INFO" "Checking Raspberry Pi hardware..."
    
    # Check if running on Raspberry Pi
    if [[ ! -f /proc/device-tree/model ]]; then
        ISSUES_FOUND+=("Not running on Raspberry Pi hardware")
        return 1
    fi
    
    local pi_model
    pi_model=$(cat /proc/device-tree/model 2>/dev/null || echo "unknown")
    log "DEBUG" "Detected Pi model: $pi_model"
    
    # Check for Pi Zero 2 W specifically
    if [[ ! "$pi_model" =~ "Pi Zero 2" ]]; then
        WARNINGS_FOUND+=("Not running on Pi Zero 2 W (detected: $pi_model)")
    fi
    
    # Check CPU temperature
    if [[ -f /sys/class/thermal/thermal_zone0/temp ]]; then
        local cpu_temp_raw
        cpu_temp_raw=$(cat /sys/class/thermal/thermal_zone0/temp)
        local cpu_temp=$((cpu_temp_raw / 1000))
        
        log "DEBUG" "CPU temperature: ${cpu_temp}°C"
        
        if [[ $cpu_temp -gt $MAX_CPU_TEMP ]]; then
            ISSUES_FOUND+=("CPU temperature too high: ${cpu_temp}°C (max: ${MAX_CPU_TEMP}°C)")
        fi
    fi
    
    # Check load average
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    if (( $(echo "$load_avg > $MAX_LOAD_AVERAGE" | bc -l) )); then
        WARNINGS_FOUND+=("High system load: $load_avg (max recommended: $MAX_LOAD_AVERAGE)")
    fi
    
    log "INFO" "✓ Hardware check completed"
}

check_memory_resources() {
    log "INFO" "Checking memory resources..."
    
    # Check available memory
    local free_memory
    free_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    
    log "DEBUG" "Free memory: ${free_memory}MB"
    
    if [[ $free_memory -lt $MIN_FREE_MEMORY ]]; then
        ISSUES_FOUND+=("Low memory: ${free_memory}MB available (minimum: ${MIN_FREE_MEMORY}MB)")
        
        if [[ "$FIX_ISSUES" = true ]]; then
            log "INFO" "Attempting to free memory..."
            sync
            echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
        fi
    fi
    
    # Check swap usage
    local swap_used
    swap_used=$(free -m | awk 'NR==3{printf "%.0f", $3}')
    
    if [[ $swap_used -gt 0 ]]; then
        WARNINGS_FOUND+=("Swap in use: ${swap_used}MB (may indicate memory pressure)")
    fi
    
    log "INFO" "✓ Memory check completed"
}

check_disk_space() {
    log "INFO" "Checking disk space..."
    
    # Check root filesystem
    local free_space
    free_space=$(df / | awk 'NR==2 {print $(NF-2)}')
    free_space=$((free_space / 1024)) # Convert to MB
    
    log "DEBUG" "Free disk space: ${free_space}MB"
    
    if [[ $free_space -lt $MIN_FREE_DISK ]]; then
        ISSUES_FOUND+=("Low disk space: ${free_space}MB available (minimum: ${MIN_FREE_DISK}MB)")
        
        if [[ "$FIX_ISSUES" = true ]]; then
            log "INFO" "Attempting to clean up disk space..."
            # Clean up old logs
            find /var/log -name "*.log.*.gz" -mtime +7 -delete 2>/dev/null || true
            # Clean up temporary files
            find /tmp -type f -mtime +1 -delete 2>/dev/null || true
        fi
    fi
    
    # Check for SD card health (if applicable)
    if [[ -f /sys/block/mmcblk0/device/life_time ]]; then
        local sd_health
        sd_health=$(cat /sys/block/mmcblk0/device/life_time 2>/dev/null || echo "unknown")
        log "DEBUG" "SD card health: $sd_health"
    fi
    
    log "INFO" "✓ Disk space check completed"
}

# =============================================================================
# AUDIO SYSTEM CHECKS
# =============================================================================

check_audio_system() {
    log "INFO" "Checking audio system..."
    
    # Check ALSA devices
    if ! command -v aplay >/dev/null 2>&1; then
        ISSUES_FOUND+=("ALSA utilities not installed")
        return 1
    fi
    
    # List available audio devices
    local audio_devices
    audio_devices=$(aplay -l 2>/dev/null | grep -c "card" || echo "0")
    
    if [[ $audio_devices -eq 0 ]]; then
        ISSUES_FOUND+=("No audio devices detected")
    else
        log "DEBUG" "Found $audio_devices audio device(s)"
    fi
    
    # Check for IQaudio Codec Zero specifically
    if aplay -l 2>/dev/null | grep -qi "iqaudio\|codec"; then
        log "DEBUG" "IQaudio Codec Zero detected"
    else
        WARNINGS_FOUND+=("IQaudio Codec Zero not detected in audio devices")
    fi
    
    # Test audio output (if fix-issues enabled)
    if [[ "$FIX_ISSUES" = true ]] && [[ $audio_devices -gt 0 ]]; then
        log "INFO" "Testing audio output..."
        if timeout 5 speaker-test -t sine -f 1000 -l 1 -s 1 >/dev/null 2>&1; then
            log "DEBUG" "Audio test successful"
        else
            WARNINGS_FOUND+=("Audio test failed - speakers may not be connected")
        fi
    fi
    
    log "INFO" "✓ Audio system check completed"
}

# =============================================================================
# SERVICE HEALTH CHECKS
# =============================================================================

check_systemd_service() {
    log "INFO" "Checking SystemD service status..."
    
    # Check if service exists
    if ! systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
        ISSUES_FOUND+=("SystemD service ${SERVICE_NAME}.service not installed")
        return 1
    fi
    
    # Check service status
    local service_status
    service_status=$(systemctl is-active "$SERVICE_NAME" 2>/dev/null || echo "inactive")
    
    case "$service_status" in
        "active")
            log "DEBUG" "Service is active and running"
            ;;
        "inactive")
            ISSUES_FOUND+=("Service $SERVICE_NAME is inactive")
            if [[ "$FIX_ISSUES" = true ]]; then
                log "INFO" "Attempting to start service..."
                if systemctl start "$SERVICE_NAME"; then
                    log "INFO" "Service started successfully"
                else
                    ISSUES_FOUND+=("Failed to start service $SERVICE_NAME")
                fi
            fi
            ;;
        "failed")
            ISSUES_FOUND+=("Service $SERVICE_NAME is in failed state")
            ;;
        *)
            WARNINGS_FOUND+=("Service $SERVICE_NAME status unknown: $service_status")
            ;;
    esac
    
    # Check service enabled status
    if ! systemctl is-enabled "$SERVICE_NAME" >/dev/null 2>&1; then
        WARNINGS_FOUND+=("Service $SERVICE_NAME is not enabled for auto-start")
        
        if [[ "$FIX_ISSUES" = true ]]; then
            log "INFO" "Enabling service for auto-start..."
            systemctl enable "$SERVICE_NAME"
        fi
    fi
    
    log "INFO" "✓ SystemD service check completed"
}

check_network_connectivity() {
    log "INFO" "Checking network connectivity..."
    
    # Check local network interface
    if ! ip link show | grep -q "state UP"; then
        ISSUES_FOUND+=("No active network interfaces found")
        return 1
    fi
    
    # Check application port binding
    if command -v netstat >/dev/null 2>&1; then
        if netstat -tln | grep -q ":${EXPECTED_PORT}\s"; then
            log "DEBUG" "Application listening on port $EXPECTED_PORT"
        else
            WARNINGS_FOUND+=("Application not listening on expected port $EXPECTED_PORT")
        fi
    fi
    
    # Test external connectivity (if internet required)
    if timeout 5 ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        log "DEBUG" "External connectivity available"
    else
        WARNINGS_FOUND+=("No external internet connectivity")
    fi
    
    log "INFO" "✓ Network connectivity check completed"
}

# =============================================================================
# APPLICATION HEALTH CHECKS
# =============================================================================

check_application_health() {
    log "INFO" "Checking application health..."
    
    # Check if Node.js process is running
    if pgrep -f "node.*server.js" >/dev/null; then
        log "DEBUG" "Node.js process found"
    else
        ISSUES_FOUND+=("Node.js application process not running")
        return 1
    fi
    
    # Check application health endpoint
    local health_url="http://localhost:${EXPECTED_PORT}/health"
    
    if command -v curl >/dev/null 2>&1; then
        local response
        if response=$(timeout "$TIMEOUT_DURATION" curl -s "$health_url" 2>/dev/null); then
            if echo "$response" | grep -q '"status":"ok"'; then
                log "DEBUG" "Application health endpoint responding correctly"
            else
                WARNINGS_FOUND+=("Application health endpoint returned unexpected response")
            fi
        else
            WARNINGS_FOUND+=("Application health endpoint not accessible")
        fi
    fi
    
    # Check database connectivity
    if [[ -f "$PROJECT_ROOT/backend/database/stories.db" ]]; then
        if [[ -r "$PROJECT_ROOT/backend/database/stories.db" ]]; then
            log "DEBUG" "Database file accessible"
        else
            ISSUES_FOUND+=("Database file not readable")
        fi
    else
        WARNINGS_FOUND+=("Database file not found - may be first run")
    fi
    
    # Check audio directory
    if [[ -d "$PROJECT_ROOT/backend/audio" ]]; then
        local audio_files
        audio_files=$(find "$PROJECT_ROOT/backend/audio" -name "*.mp3" | wc -l)
        log "DEBUG" "Found $audio_files audio files"
    else
        WARNINGS_FOUND+=("Audio directory not found")
    fi
    
    log "INFO" "✓ Application health check completed"
}

check_environment_configuration() {
    log "INFO" "Checking environment configuration..."
    
    # Check for required environment files
    local env_file="$PROJECT_ROOT/backend/.env"
    
    if [[ ! -f "$env_file" ]]; then
        ISSUES_FOUND+=("Environment file not found: $env_file")
        return 1
    fi
    
    # Check for required environment variables
    local required_vars=("OPENAI_API_KEY" "ELEVENLABS_API_KEY" "NODE_ENV")
    local missing_vars=()
    
    source "$env_file" 2>/dev/null || {
        ISSUES_FOUND+=("Failed to source environment file")
        return 1
    }
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        ISSUES_FOUND+=("Missing required environment variables: ${missing_vars[*]}")
    fi
    
    # Check Node.js environment
    if [[ "${NODE_ENV:-}" != "production" ]]; then
        WARNINGS_FOUND+=("NODE_ENV not set to production (current: ${NODE_ENV:-unset})")
    fi
    
    log "INFO" "✓ Environment configuration check completed"
}

# =============================================================================
# OUTPUT FORMATTING
# =============================================================================

generate_health_report() {
    local total_issues=${#ISSUES_FOUND[@]}
    local total_warnings=${#WARNINGS_FOUND[@]}
    local exit_code=0
    
    # Determine exit code
    if [[ $total_issues -gt 0 ]]; then
        exit_code=2
    elif [[ $total_warnings -gt 0 ]]; then
        exit_code=1
    fi
    
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        generate_json_report "$exit_code"
    else
        generate_text_report "$exit_code"
    fi
    
    return $exit_code
}

generate_json_report() {
    local exit_code="$1"
    local timestamp=$(date -Iseconds)
    
    cat << EOF
{
    "timestamp": "$timestamp",
    "hostname": "$(hostname)",
    "exit_code": $exit_code,
    "status": "$([ $exit_code -eq 0 ] && echo "healthy" || [ $exit_code -eq 1 ] && echo "warning" || echo "critical")",
    "summary": {
        "critical_issues": ${#ISSUES_FOUND[@]},
        "warnings": ${#WARNINGS_FOUND[@]}
    },
    "issues": [
$(printf '        "%s"' "${ISSUES_FOUND[@]}" | sed '$!s/$/,/')
    ],
    "warnings": [
$(printf '        "%s"' "${WARNINGS_FOUND[@]}" | sed '$!s/$/,/')
    ],
    "system_info": {
        "uptime": "$(uptime -p)",
        "load_average": "$(uptime | awk -F'load average:' '{print $2}')",
        "memory_usage": "$(free -h | awk 'NR==2{printf "%s/%s (%.1f%%)", $3,$2,$3*100/$2}')",
        "disk_usage": "$(df -h / | awk 'NR==2{printf "%s/%s (%s)", $3,$2,$5}')"
    }
}
EOF
}

generate_text_report() {
    local exit_code="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo
    echo -e "${BOLD}==============================================================================${NC}"
    echo -e "${BOLD}BEDTIME STORIES APP - HEALTH CHECK REPORT${NC}"
    echo -e "${BOLD}==============================================================================${NC}"
    echo -e "Timestamp: $timestamp"
    echo -e "Hostname:  $(hostname)"
    echo -e "Status:    $([ $exit_code -eq 0 ] && echo -e "${GREEN}HEALTHY${NC}" || [ $exit_code -eq 1 ] && echo -e "${YELLOW}WARNING${NC}" || echo -e "${RED}CRITICAL${NC}")"
    echo
    
    # System information
    echo -e "${BOLD}SYSTEM INFORMATION:${NC}"
    echo -e "  Uptime:       $(uptime -p)"
    echo -e "  Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    echo -e "  Memory Usage: $(free -h | awk 'NR==2{printf "%s/%s (%.1f%%)", $3,$2,$3*100/$2}')"
    echo -e "  Disk Usage:   $(df -h / | awk 'NR==2{printf "%s/%s (%s)", $3,$2,$5}')"
    echo
    
    # Critical issues
    if [[ ${#ISSUES_FOUND[@]} -gt 0 ]]; then
        echo -e "${RED}${BOLD}CRITICAL ISSUES (${#ISSUES_FOUND[@]}):${NC}"
        for issue in "${ISSUES_FOUND[@]}"; do
            echo -e "  ${RED}✗${NC} $issue"
        done
        echo
    fi
    
    # Warnings
    if [[ ${#WARNINGS_FOUND[@]} -gt 0 ]]; then
        echo -e "${YELLOW}${BOLD}WARNINGS (${#WARNINGS_FOUND[@]}):${NC}"
        for warning in "${WARNINGS_FOUND[@]}"; do
            echo -e "  ${YELLOW}!${NC} $warning"
        done
        echo
    fi
    
    # Success message
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}${BOLD}✓ ALL HEALTH CHECKS PASSED${NC}"
        echo -e "The Bedtime Stories App is healthy and ready for use."
        echo
    fi
    
    echo -e "${BOLD}==============================================================================${NC}"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    parse_arguments "$@"
    create_lock
    
    log "INFO" "Starting health check for Bedtime Stories App..."
    log "DEBUG" "Running on: $(hostname) at $(date)"
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
    
    # Execute all health checks
    check_raspberry_pi_hardware || true
    check_memory_resources || true
    check_disk_space || true
    check_audio_system || true
    check_systemd_service || true
    check_network_connectivity || true
    check_application_health || true
    check_environment_configuration || true
    
    # Generate and display report
    generate_health_report
    local final_exit_code=$?
    
    log "INFO" "Health check completed with exit code: $final_exit_code"
    
    cleanup
    exit $final_exit_code
}

# Execute main function with all arguments
main "$@"
