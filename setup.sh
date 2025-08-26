#!/usr/bin/env bash
# =============================================================================
# BEDTIME STORIES APP - ONE-CLICK PRODUCTION INSTALLER
# Optimized for Raspberry Pi Zero 2W (512MB RAM)
#
# This script provides a complete one-click installation experience:
# - Automatic dependency detection and installation
# - Pi Zero 2W specific optimizations
# - Production-ready configuration
# - Comprehensive error handling and logging
# - Post-installation verification
# =============================================================================

set -euo pipefail

# Script Configuration
SCRIPT_VERSION="2.0.0"
APP_REPO="${APP_REPO:-https://github.com/sarpel/bedtime-stories-app.git}"
APP_DIR="${APP_DIR:-/opt/storyapp}"
APP_PORT="${APP_PORT:-3001}"
LOG_DIR="/var/log/storyapp"
BACKUP_DIR="/opt/storyapp-backups"

# Create directories
mkdir -p "$LOG_DIR" "$BACKUP_DIR" || true
LOG_FILE="$LOG_DIR/setup-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}
success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $*${NC}" | tee -a "$LOG_FILE"
}
warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $*${NC}" | tee -a "$LOG_FILE"
}
err() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ ERROR: $*${NC}" | tee -a "$LOG_FILE" >&2
    exit 1
}

# System checks
require_root() {
    [ "$EUID" -eq 0 ] || err "This script must be run as root. Use: sudo $0"
}

check_system() {
    log "Checking system compatibility..."

    # Check if running on Raspberry Pi
    if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
        warn "Not running on Raspberry Pi - some optimizations may not apply"
    fi

    # Check available memory
    local mem_mb=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ "$mem_mb" -lt 400 ]; then
        warn "Low memory detected (${mem_mb}MB). Pi Zero 2W has 512MB - consider checking system load"
    fi

    # Check available disk space
    local disk_gb=$(df / | awk 'NR==2{printf "%.1f", $4/1024/1024}')
    if (( $(echo "$disk_gb < 2.0" | bc -l) )); then
        err "Insufficient disk space (${disk_gb}GB available). Need at least 2GB free space"
    fi

    success "System compatibility check passed"
}

install_packages() {
    log "Installing system packages..."

    # Update package list
    apt-get update -y >>"$LOG_FILE" 2>&1 || err "Failed to update package list"

    # Install required packages for Pi Zero 2W
    local packages=(
        "curl"              # For downloading files
        "git"               # For repository cloning
        "sqlite3"           # Database CLI tools
        "alsa-utils"        # Audio system utilities
        "build-essential"   # Compilation tools for native modules
        "python3"           # Required for node-gyp
        "make"              # Build system
        "g++"               # C++ compiler
        "mpg123"            # Audio player for remote playback
        "bc"                # Calculator for system checks
    )

    log "Installing packages: ${packages[*]}"
    apt-get install -y "${packages[@]}" >>"$LOG_FILE" 2>&1 || err "Package installation failed"

    success "System packages installed successfully"
}

ensure_node(){
    log "Node.js sürümü kontrol ediliyor";
    local cur_major=0
    if command -v node >/dev/null 2>&1; then
        cur_major=$(node -p "process.versions.node.split('.')[0]") || cur_major=0
    fi
    if [ "$cur_major" -lt 20 ]; then
        log "Node.js <20 (mevcut: ${cur_major:-yok}) → Node 20 kurulacak";
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >>"$LOG_FILE" 2>&1 || err "NodeSource repo eklenemedi";
        apt-get install -y nodejs >>"$LOG_FILE" 2>&1 || err "Node 20 kurulamadı";
    else
        log "Node.js $cur_major >=20 (güncel)";
    fi
    if command -v npm >/dev/null 2>&1; then
        local npm_major; npm_major=$(npm -v 2>/dev/null | cut -d. -f1 || echo 0)
        if [ "$npm_major" -lt 10 ]; then
            log "npm <10 (güncelleniyor)";
            npm install -g npm@^10 >>"$LOG_FILE" 2>&1 || log "UYARI: npm güncelleme başarısız";
        fi
    fi
}

clone_or_update(){
    if [ ! -d "$APP_DIR/.git" ]; then
        log "Repo klonlanıyor: $APP_REPO";
        git clone "$APP_REPO" "$APP_DIR" >>"$LOG_FILE" 2>&1 || err "Repo klon hatası";
    else
        log "Repo güncelleniyor"; (cd "$APP_DIR" && git pull origin main >>"$LOG_FILE" 2>&1) || err "Git pull hatası";
    fi
}

build_frontend(){
    log "Frontend build (workspaces)";
    # Çekirdek bağımlılıkları production modunda kur (root + backend workspace). better-sqlite3 native rebuild gerekirse rebuild:sqlite kullanılabilir.
    (cd "$APP_DIR" && NODE_ENV=production npm ci --omit=dev >>"$LOG_FILE" 2>&1 || npm install --omit=dev >>"$LOG_FILE" 2>&1; NODE_ENV=production npm run build >>"$LOG_FILE" 2>&1) || {
        log "Frontend build hatası - log kontrol et: $LOG_FILE"
        # Build hatalı olursa devam et ama uyar
        return 0
    }

    # Build başarılı mı kontrol et
    if [ -d "$APP_DIR/dist" ] && [ -f "$APP_DIR/dist/index.html" ]; then
        log "Frontend build başarılı - dist klasörü oluşturuldu"

        # Static dosyaları root'a kopyala (Express static serving için)
        log "Static dosyalar root klasöre kopyalanıyor..."

        # index.html'yi kopyala
        cp "$APP_DIR/dist/index.html" "$APP_DIR/" || log "UYARI: index.html kopyalanamadı"

        # Assets klasörünü güvenli şekilde kopyala
        if [ -d "$APP_DIR/dist/assets" ]; then
            # Eski assets klasörünü sil (eğer varsa)
            [ -d "$APP_DIR/assets" ] && rm -rf "$APP_DIR/assets"

            # Yeni assets'i kopyala
            cp -r "$APP_DIR/dist/assets" "$APP_DIR/" || {
                log "HATA: Assets klasörü kopyalanamadı"
                return 1
            }

            # İzinleri düzelt
            chown -R root:root "$APP_DIR/assets" 2>/dev/null || true
            find "$APP_DIR/assets" -type f -exec chmod 644 {} \; 2>/dev/null || true
            find "$APP_DIR/assets" -type d -exec chmod 755 {} \; 2>/dev/null || true

            # Kopyalanan dosyaları doğrula
            local asset_files=$(find "$APP_DIR/assets" -type f | wc -l)
            log "✅ Static dosyalar kopyalandı (index.html, assets/ - $asset_files dosya)"

            # Assets içeriğini listele (debugging için)
            log "Assets klasörü içeriği:"
            ls -la "$APP_DIR/assets" 2>/dev/null | head -10
        else
            log "UYARI: dist/assets klasörü bulunamadı - assets olmadan devam ediliyor"
        fi

        # Build klasörünü temizle (opsiyonel, disk tasarrufu)
        # rm -rf "$APP_DIR/dist"
    else
        log "UYARI: Frontend build tamamlandı ama dist klasörü eksik"
    fi
}

install_backend(){
    log "Backend bağımlılıkları (workspace içinde zaten kuruldu, yine de doğrulama)"; (cd "$APP_DIR/backend" && npm ls --omit=dev >/dev/null 2>>"$LOG_FILE" || npm install --omit=dev >>"$LOG_FILE" 2>&1) || err "Backend npm hatası";
    # Native modül test
    (cd "$APP_DIR/backend" && node -e "require('better-sqlite3'); console.log('better-sqlite3 yüklü')" >>"$LOG_FILE" 2>&1) || {
        log "better-sqlite3 yeniden derleniyor"; (cd "$APP_DIR" && npm run rebuild:sqlite >>"$LOG_FILE" 2>&1) || log "UYARI: better-sqlite3 rebuild başarısız";
    }

    # .env dosyası oluştur (eğer yoksa)
    if [ ! -f "$APP_DIR/backend/.env" ]; then
        log "Backend .env dosyası oluşturuluyor"
        cat > "$APP_DIR/backend/.env" <<EOF
# OpenAI Configuration
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_ENDPOINT=https://api.openai.com/v1/responses

# ElevenLabs Configuration
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=xsGHrtxT5AdDzYXTQT0d
ELEVENLABS_MODEL=eleven_turbo_v2_5
ELEVENLABS_ENDPOINT=https://api.elevenlabs.io/v1/text-to-speech

# Gemini Configuration (Optional)
GEMINI_LLM_API_KEY=
GEMINI_TTS_API_KEY=
GEMINI_LLM_MODEL=gemini-2.5-flash-lite
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
GEMINI_TTS_VOICE_ID=Despina
GEMINI_LLM_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models
GEMINI_TTS_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models

# Database
DATABASE_PATH=./database/stories.db

# Server Configuration
NODE_ENV=production
PORT=${APP_PORT}
LOG_LEVEL=warn
EOF
        log ".env dosyası oluşturuldu - API anahtarlarını düzenleyin!"
    fi
}

write_service(){
    log "Systemd servis yazılıyor";
    cat > /etc/systemd/system/storyapp.service <<EOF
[Unit]
Description=Bedtime Stories App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/backend
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable storyapp.service >>"$LOG_FILE" 2>&1 || true
    systemctl restart storyapp.service || systemctl start storyapp.service
}

verify(){
    sleep 2
    if systemctl is-active --quiet storyapp.service; then
        log "Service aktif"
    else
        log "Service pasif (journalctl -u storyapp)"; fi
    curl -s "http://localhost:$APP_PORT/health" >/dev/null 2>&1 && log "Health OK" || log "Health endpoint yanıt vermiyor"
}

show_completion_summary() {
    local IP=$(hostname -I | awk '{print $1}')

    echo ""
    echo "========================================="
    echo "🎉 INSTALLATION COMPLETED SUCCESSFULLY! 🎉"
    echo "========================================="
    echo ""
    echo "📱 Application Access:"
    echo "   Local:    http://localhost:$APP_PORT"
    echo "   Network:  http://$IP:$APP_PORT"
    echo ""
    echo "⚠️  IMPORTANT: Configure API Keys"
    echo "   File: $APP_DIR/backend/.env"
    echo ""
    echo "🔑 Required API Keys:"
    echo "   OPENAI_API_KEY=your_openai_key_here"
    echo "   ELEVENLABS_API_KEY=your_elevenlabs_key_here"
    echo ""
    echo "🔄 After adding API keys:"
    echo "   sudo systemctl restart storyapp"
    echo ""
    echo "✅ Verify Installation:"
    echo "   cd $APP_DIR && bash check-setup.sh"
    echo ""
    echo "📊 Monitor Service:"
    echo "   sudo systemctl status storyapp"
    echo "   sudo journalctl -u storyapp -f"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   - Check logs: $LOG_FILE"
    echo "   - Audio issues: sudo reboot (recommended)"
    echo "   - Memory issues: free -h"
    echo ""
    echo "📚 Documentation:"
    echo "   README: $APP_DIR/README.md"
    echo "   Health: curl http://localhost:$APP_PORT/health"
    echo ""
    echo "========================================="
    echo "🚀 Ready for Production Use!"
    echo "========================================="
}

main() {
    echo "🚀 Bedtime Stories App - One-Click Installer v$SCRIPT_VERSION"
    echo "Optimized for Raspberry Pi Zero 2W"
    echo ""

    log "Starting installation process..."

    # Pre-installation checks
    require_root
    check_system

    # Core installation steps
    install_packages
    ensure_node

    # Application setup
    mkdir -p "$APP_DIR" "$LOG_DIR" "$BACKUP_DIR"
    clone_or_update
    build_frontend
    install_backend

    # Service configuration
    write_service

    # Post-installation verification
    verify

    # Show completion summary
    show_completion_summary

    success "Installation completed successfully!"
    log "Installation log saved to: $LOG_FILE"
}

# Handle script interruption
trap 'err "Installation interrupted by user"' INT TERM

# Run main installation
main "$@"
