#!/bin/bash

# ============================================================================
# Bedtime Stories App - Proxmox Container Setup Script
# ============================================================================
# Bu script projeyi Proxmox LXC container'da otomatik olarak kurar
# Tüm bağımlılıklar, build ve production ayarları dahil
# x64 sistem için optimize edilmiştir (Raspberry Pi fonksiyonları korunmuştur)
# ============================================================================

set -e  # Exit on any error

# Script configuration
SCRIPT_VERSION="1.0.0"
PROJECT_NAME="bedtime-stories-app"
REPO_URL="https://github.com/yourusername/bedtime-stories-app.git"  # REPO URL'İNİZİ BURAYA YAZIN
APP_USER="storyapp"
APP_DIR="/opt/bedtime-stories"
SERVICE_NAME="bedtime-stories"
DOMAIN_NAME="stories.local"  # İsteğe bağlı domain

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        error "Bu script root olarak çalıştırılmalıdır. 'sudo bash setup_linux.sh' kullanın."
    fi
}

# System information
show_system_info() {
    log "=== SİSTEM BİLGİLERİ ==="
    echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"')"
    echo "Kernel: $(uname -r)"
    echo "Architecture: $(uname -m)"
    echo "CPU Cores: $(nproc)"
    echo "RAM: $(free -h | awk '/^Mem:/ {print $2}')"
    echo "Disk Space: $(df -h / | awk 'NR==2 {print $4}')"
    echo ""
}

# System requirements check
check_system_requirements() {
    log "Sistem gereksinimleri kontrol ediliyor..."
    
    # Check CPU cores (minimum 2 recommended)
    CORES=$(nproc)
    if [ "$CORES" -lt 2 ]; then
        warn "Düşük CPU çekirdek sayısı ($CORES). En az 2 çekirdek önerilir."
    fi
    
    # Check RAM (minimum 2GB recommended) 
    RAM_MB=$(free -m | awk '/^Mem:/ {print $2}')
    if [ "$RAM_MB" -lt 2048 ]; then
        warn "Düşük RAM miktarı (${RAM_MB}MB). En az 2GB önerilir."
    fi
    
    # Check disk space (minimum 10GB free)
    DISK_GB=$(df --output=avail -BG / | tail -1 | tr -d 'G')
    if [ "$DISK_GB" -lt 10 ]; then
        warn "Düşük disk alanı (${DISK_GB}GB). En az 10GB boş alan önerilir."
    fi
    
    log "Sistem gereksinimleri kontrolü tamamlandı."
}

# Update system packages
update_system() {
    log "Sistem paketleri güncelleniyor..."
    
    # Detect package manager
    if command -v apt-get &> /dev/null; then
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y
        apt-get upgrade -y
        apt-get install -y curl wget git unzip build-essential software-properties-common
    elif command -v dnf &> /dev/null; then
        dnf update -y
        dnf install -y curl wget git unzip gcc gcc-c++ make
    elif command -v yum &> /dev/null; then
        yum update -y  
        yum install -y curl wget git unzip gcc gcc-c++ make
    else
        error "Desteklenmeyen paket yöneticisi. Ubuntu/Debian/CentOS/RHEL kullanın."
    fi
    
    log "Sistem paketleri güncellendi."
}

# Install Node.js 20.x
install_nodejs() {
    log "Node.js 20.x kuruluyor..."
    
    # Install Node.js via NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || {
        error "Node.js repository eklenemedi"
    }
    
    if command -v apt-get &> /dev/null; then
        apt-get install -y nodejs
    elif command -v dnf &> /dev/null; then
        dnf install -y nodejs npm
    elif command -v yum &> /dev/null; then
        yum install -y nodejs npm
    fi
    
    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    log "Node.js kuruldu: $NODE_VERSION"
    log "npm kuruldu: $NPM_VERSION"
    
    # Check minimum versions
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -lt 20 ]; then
        error "Node.js sürümü çok eski ($NODE_VERSION). En az v20.0.0 gerekli."
    fi
}

# Install PM2 for process management
install_pm2() {
    log "PM2 process manager kuruluyor..."
    npm install -g pm2@latest
    
    # Configure PM2 to start on boot
    pm2 startup systemd -u root --hp /root || warn "PM2 startup konfigürasyonu başarısız"
    
    log "PM2 kuruldu."
}

# Create application user
create_app_user() {
    log "Uygulama kullanıcısı oluşturuluyor..."
    
    if ! id "$APP_USER" &>/dev/null; then
        useradd -r -s /bin/bash -d "$APP_DIR" -m "$APP_USER"
        log "Kullanıcı '$APP_USER' oluşturuldu."
    else
        log "Kullanıcı '$APP_USER' zaten mevcut."
    fi
    
    # Create application directories
    mkdir -p "$APP_DIR"
    mkdir -p "$APP_DIR/logs"
    mkdir -p "$APP_DIR/database"
    mkdir -p "$APP_DIR/media"
    
    # Set permissions
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    chmod 755 "$APP_DIR"
    
    log "Uygulama dizinleri oluşturuldu."
}

# Clone and setup application
setup_application() {
    log "Uygulama kaynak kodu indiriliyor..."
    
    # Change to app directory
    cd "$APP_DIR"
    
    # Clone repository (remove existing if present)
    if [ -d ".git" ]; then
        warn "Mevcut git repository bulundu, güncelleniyor..."
        sudo -u "$APP_USER" git pull origin main
    else
        sudo -u "$APP_USER" git clone "$REPO_URL" .
    fi
    
    log "Kaynak kod indirildi."
}

# Install dependencies and build
build_application() {
    log "Uygulama bağımlılıkları kuruluyor..."
    
    cd "$APP_DIR"
    
    # Install root dependencies
    sudo -u "$APP_USER" npm install
    
    # Install backend dependencies
    cd "$APP_DIR/backend"
    sudo -u "$APP_USER" npm install
    
    # Build backend
    sudo -u "$APP_USER" npm run build
    
    # Build frontend
    cd "$APP_DIR"
    sudo -u "$APP_USER" npm run build
    
    log "Uygulama build edildi."
}

# Setup environment files
setup_environment() {
    log "Ortam değişkenleri yapılandırılıyor..."
    
    # Main .env file
    cat > "$APP_DIR/.env" << EOF
NODE_ENV=production
VITE_BACKEND_URL=http://localhost:3001
DATABASE_PATH=./database/stories.db
LOG_LEVEL=info
PORT=3001
HOST=0.0.0.0
EOF
    
    # Backend .env file
    cat > "$APP_DIR/backend/.env" << EOF
# =============================================================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# =============================================================================
# API anahtarlarınızı buraya girin:

# OpenAI Configuration (Primary LLM)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_ENDPOINT=https://api.openai.com/v1/responses

# ElevenLabs Configuration (Primary TTS)
ELEVENLABS_API_KEY=
ELEVENLABS_MODEL=eleven_turbo_v2_5
ELEVENLABS_VOICE_ID=xsGHrtxT5AdDzYXTQT0d
ELEVENLABS_ENDPOINT=https://api.elevenlabs.io/v1/text-to-speech

# Gemini Configuration (Alternative)
GEMINI_LLM_API_KEY=
GEMINI_LLM_MODEL=gemini-2.0-flash-exp
GEMINI_LLM_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models

GEMINI_TTS_API_KEY=
GEMINI_TTS_MODEL=gemini-2.0-flash-exp
GEMINI_TTS_VOICE=Aoede
GEMINI_TTS_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models

# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_PATH=./database/stories.db

# Media Storage
MEDIA_DIR=$APP_DIR/media

# Performance
MAX_CONCURRENT_TTS=2
LOG_LEVEL=info
EOF
    
    # Set file permissions
    chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
    chown "$APP_USER:$APP_USER" "$APP_DIR/backend/.env"
    chmod 600 "$APP_DIR/.env"
    chmod 600 "$APP_DIR/backend/.env"
    
    log "Ortam değişkenleri oluşturuldu."
    warn "API anahtarlarınızı $APP_DIR/backend/.env dosyasına girin!"
}

# Setup PM2 ecosystem file
setup_pm2_config() {
    log "PM2 konfigürasyonu oluşturuluyor..."
    
    cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    cwd: '$APP_DIR/backend',
    script: 'dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    user: '$APP_USER',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },
    
    // Logging
    log_file: '$APP_DIR/logs/app.log',
    out_file: '$APP_DIR/logs/out.log',
    error_file: '$APP_DIR/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'database'],
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // Resource limits
    max_memory_restart: '500M',
    
    // Health check
    health_check_grace_period: 3000
  }]
};
EOF
    
    chown "$APP_USER:$APP_USER" "$APP_DIR/ecosystem.config.js"
    
    log "PM2 konfigürasyonu oluşturuldu."
}

# Setup Nginx reverse proxy
setup_nginx() {
    log "Nginx reverse proxy kuruluyor..."
    
    # Install Nginx
    if command -v apt-get &> /dev/null; then
        apt-get install -y nginx
    elif command -v dnf &> /dev/null; then
        dnf install -y nginx
    elif command -v yum &> /dev/null; then
        yum install -y nginx
    fi
    
    # Create Nginx config
    cat > "/etc/nginx/sites-available/$PROJECT_NAME" << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME localhost _;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate no_last_modified no_etag auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static files
    location /assets/ {
        alias $APP_DIR/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Audio files
    location /audio/ {
        alias $APP_DIR/backend/audio/;
        expires 1d;
        add_header Cache-Control "public";
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Frontend
    location / {
        root $APP_DIR/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static content
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
EOF
    
    # Enable site
    if [ -d "/etc/nginx/sites-enabled" ]; then
        ln -sf "/etc/nginx/sites-available/$PROJECT_NAME" "/etc/nginx/sites-enabled/"
        rm -f /etc/nginx/sites-enabled/default
    fi
    
    # Test and reload Nginx
    nginx -t && systemctl reload nginx
    systemctl enable nginx
    
    log "Nginx yapılandırıldı."
}

# Setup systemd service (backup to PM2)
setup_systemd_service() {
    log "Systemd service oluşturuluyor..."
    
    cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=Bedtime Stories App
After=network.target
Requires=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/backend
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Environment
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=HOST=0.0.0.0

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

# Resource limits
MemoryMax=512M
TasksMax=100

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    log "Systemd service oluşturuldu."
}

# Start services
start_services() {
    log "Servisler başlatılıyor..."
    
    # Start with PM2
    cd "$APP_DIR"
    sudo -u "$APP_USER" pm2 start ecosystem.config.js
    sudo -u "$APP_USER" pm2 save
    
    # Start Nginx
    systemctl start nginx
    systemctl enable nginx
    
    log "Servisler başlatıldı."
}

# Setup firewall
setup_firewall() {
    log "Firewall yapılandırılıyor..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian UFW
        ufw --force enable
        ufw allow 22/tcp comment 'SSH'
        ufw allow 80/tcp comment 'HTTP'
        ufw allow 443/tcp comment 'HTTPS'
        ufw reload
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL firewalld  
        systemctl enable firewalld
        systemctl start firewalld
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
    fi
    
    log "Firewall yapılandırıldı."
}

# Setup log rotation
setup_log_rotation() {
    log "Log rotation yapılandırılıyor..."
    
    cat > "/etc/logrotate.d/$PROJECT_NAME" << EOF
$APP_DIR/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        sudo -u $APP_USER pm2 reload $SERVICE_NAME
    endscript
}
EOF
    
    log "Log rotation yapılandırıldı."
}

# Health check function
health_check() {
    log "Sistem sağlık kontrolü yapılıyor..."
    
    # Wait for application to start
    sleep 10
    
    # Check backend
    if curl -f http://localhost:3001/health &>/dev/null; then
        log "✓ Backend çalışıyor (Port 3001)"
    else
        error "✗ Backend çalışmıyor"
    fi
    
    # Check Nginx
    if curl -f http://localhost/ &>/dev/null; then
        log "✓ Nginx çalışıyor (Port 80)"
    else
        warn "✗ Nginx erişilebilir değil"
    fi
    
    # Check PM2
    if sudo -u "$APP_USER" pm2 status | grep -q "online"; then
        log "✓ PM2 process çalışıyor"
    else
        warn "✗ PM2 process çalışmıyor"
    fi
    
    log "Sağlık kontrolü tamamlandı."
}

# Show final information
show_final_info() {
    log "=== KURULUM TAMAMLANDI ==="
    echo ""
    echo "🎉 Bedtime Stories App başarıyla kuruldu!"
    echo ""
    echo "📂 Uygulama Dizini: $APP_DIR"
    echo "👤 Uygulama Kullanıcısı: $APP_USER"
    echo "🌐 Web Arayüzü: http://$(hostname -I | awk '{print $1}')/"
    echo "🔧 API Backend: http://$(hostname -I | awk '{print $1}'):3001"
    echo ""
    echo "📝 ÖNEMLİ NOTLAR:"
    echo "   • API anahtarlarınızı $APP_DIR/backend/.env dosyasına girin"
    echo "   • Uygulama otomatik olarak başlatılır (PM2 + Systemd)"
    echo "   • Loglar: $APP_DIR/logs/ dizininde"
    echo "   • Veritabanı: $APP_DIR/database/stories.db"
    echo ""
    echo "🛠️  YÖNETİM KOMUTLARI:"
    echo "   • Durumu kontrol et: sudo -u $APP_USER pm2 status"
    echo "   • Yeniden başlat: sudo -u $APP_USER pm2 restart $SERVICE_NAME"
    echo "   • Logları görüntüle: sudo -u $APP_USER pm2 logs $SERVICE_NAME"
    echo "   • Nginx durumu: systemctl status nginx"
    echo ""
    echo "🔄 GÜNCELLEMEler:"
    echo "   cd $APP_DIR && git pull && npm run build && sudo -u $APP_USER pm2 restart $SERVICE_NAME"
    echo ""
    warn "API anahtarlarınızı girmeden uygulama tam çalışmaz!"
    echo ""
}

# Main installation function
main() {
    log "=== Bedtime Stories App - Linux Kurulum Başlatılıyor v$SCRIPT_VERSION ==="
    
    check_root
    show_system_info
    check_system_requirements
    
    # Installation steps
    update_system
    install_nodejs
    install_pm2
    create_app_user
    setup_application
    build_application
    setup_environment
    setup_pm2_config
    setup_nginx
    setup_systemd_service
    setup_firewall
    setup_log_rotation
    start_services
    health_check
    show_final_info
    
    log "Kurulum başarıyla tamamlandı! 🎉"
}

# Run main function
main "$@"