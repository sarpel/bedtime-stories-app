#!/bin/bash

# ==========================================
# Bedtime Stories App - One-Click Installer
# ==========================================
# Raspberry Pi Zero 2W + iQaudio Codec Zero
# Raspberry Pi OS Lite 64-bit
# ==========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root directly. It will use sudo when needed."
   exit 1
fi

# Configuration variables
CURRENT_USER=$(whoami)
APP_NAME="bedtime-stories-app"
INSTALL_DIR="/opt/storyapp"
SERVICE_NAME="storyapp-$CURRENT_USER"
USER_HOME="/home/$CURRENT_USER"
BACKUP_DIR="/opt/storyapp-backup-$(date +%Y%m%d-%H%M%S)"

log_info "Starting Bedtime Stories App installation..."
log_info "Target directory: $INSTALL_DIR"
log_info "Service name: $SERVICE_NAME"

# ==========================================
# STEP 1: System Update
# ==========================================
log_info "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# ==========================================
# STEP 2: Install Required System Packages
# ==========================================
log_info "Installing system dependencies..."
sudo apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    python3-dev \
    bc \
    libasound2-dev \
    alsa-utils \
    mpg123 \
    ffmpeg \
    sqlite3 \
    nginx \
    systemd \
    rsync
# ==========================================
# STEP 3: Audio Configuration for iQaudio Codec Zero
# ==========================================
log_info "Configuring audio for iQaudio Codec Zero..."

# Backup original config
sudo cp /boot/config.txt /boot/config.txt.backup

# Add iQaudio Codec Zero configuration to /boot/config.txt
if ! grep -q "dtoverlay=iqaudio-codec" /boot/config.txt; then
    log_info "Adding iQaudio Codec Zero overlay to boot config..."
    echo "" | sudo tee -a /boot/config.txt
    echo "# iQaudio Codec Zero configuration" | sudo tee -a /boot/config.txt
    echo "dtoverlay=iqaudio-codec" | sudo tee -a /boot/config.txt
else
    log_info "iQaudio Codec Zero already configured in boot config"
fi

# Disable onboard audio if enabled
sudo sed -i 's/^dtparam=audio=on/#dtparam=audio=on/' /boot/config.txt 2>/dev/null || true

# Create ALSA configuration for iQaudio Codec Zero
log_info "Creating ALSA configuration..."
sudo tee /etc/asound.conf > /dev/null <<EOF
pcm.!default {
    type hw
    card 0
    device 0
}

ctl.!default {
    type hw
    card 0
}
EOF

# Set audio permissions for current user
sudo usermod -a -G audio $CURRENT_USER

# ==========================================
# STEP 4: Install Node.js (Latest LTS)
# ==========================================
log_info "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log_success "Node.js $NODE_VERSION and npm $NPM_VERSION installed"

# ==========================================
# STEP 5: Create Application Directory
# ==========================================
log_info "Setting up application directory..."

# Backup existing installation if it exists
if [ -d "$INSTALL_DIR" ]; then
    log_warn "Existing installation found. Creating backup at $BACKUP_DIR"
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$INSTALL_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
    sudo systemctl stop $SERVICE_NAME 2>/dev/null || true
fi

# Create and setup directory
sudo mkdir -p "$INSTALL_DIR"
sudo chown $CURRENT_USER:$CURRENT_USER "$INSTALL_DIR"
sudo chmod 755 "$INSTALL_DIR"

# ==========================================
# STEP 6: Copy Application Files
# ==========================================
log_info "Copying application files..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Copy all files except node_modules and temporary files
rsync -av --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.log' \
    --exclude '.env*' \
    --exclude 'setup.sh' \
    ./ "$INSTALL_DIR/"

# Set ownership
sudo chown -R $CURRENT_USER:$CURRENT_USER "$INSTALL_DIR"

# ==========================================
# STEP 7: Install Dependencies
# ==========================================
log_info "Installing frontend dependencies..."
cd "$INSTALL_DIR"
npm install

log_info "Installing backend dependencies..."
cd "$INSTALL_DIR/backend"
npm install

# Build better-sqlite3 for ARM64
log_info "Rebuilding better-sqlite3 for ARM64..."
npm rebuild better-sqlite3 --build-from-source

# ==========================================
# STEP 8: Build Frontend
# ==========================================
log_info "Building frontend..."
cd "$INSTALL_DIR"
npm run build

# ==========================================
# STEP 9: Setup Environment Configuration
# ==========================================
log_info "Setting up environment configuration..."

# Create backend environment file template if it doesn't exist
if [ ! -f "$INSTALL_DIR/backend/.env" ]; then
    log_info "Creating environment configuration template..."
    cat > "$INSTALL_DIR/backend/.env" << EOF
# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3001

# Audio Configuration
AUDIO_PLAYER_COMMAND=mpg123
DRY_RUN_AUDIO_PLAYBACK=false

# Logging
LOG_LEVEL=info

# API Keys (Configure these with your actual keys)
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_ENDPOINT=https://api.openai.com/v1/responses

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
ELEVENLABS_ENDPOINT=https://api.elevenlabs.io/v1/text-to-speech

# Gemini Configuration (Optional)
# GEMINI_LLM_API_KEY=your_gemini_api_key_here
# GEMINI_TTS_API_KEY=your_gemini_tts_api_key_here
# GEMINI_LLM_MODEL=gemini-pro
# GEMINI_LLM_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models
# GEMINI_TTS_MODEL=gemini-pro
# GEMINI_TTS_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models

# System Prompt (Optional customization)
SYSTEM_PROMPT_TURKISH=5 yaşındaki bir türk kız çocuğu için uyku vaktinde okunmak üzere, uyku getirici ve kazanması istenen temel erdemleri de ders niteliğinde hikayelere iliştirecek şekilde masal yaz. Masal eğitici, sevgi dolu ve rahatlatıcı olsun.
EOF
    sudo chown $CURRENT_USER:$CURRENT_USER "$INSTALL_DIR/backend/.env"
    sudo chmod 600 "$INSTALL_DIR/backend/.env"
fi

# Create audio directory
mkdir -p "$INSTALL_DIR/backend/audio"
sudo chown -R $CURRENT_USER:$CURRENT_USER "$INSTALL_DIR/backend/audio"

# Create database directory  
mkdir -p "$INSTALL_DIR/backend/database"
sudo chown -R $CURRENT_USER:$CURRENT_USER "$INSTALL_DIR/backend/database"

# ==========================================
# STEP 10: Setup Systemd Service
# ==========================================
log_info "Setting up systemd service..."

# Copy service file
sudo cp "$INSTALL_DIR/deploy/storyapp.service" "/etc/systemd/system/$SERVICE_NAME.service"

# Update service file paths and user if needed
sudo sed -i "s|/opt/storyapp|$INSTALL_DIR|g" "/etc/systemd/system/$SERVICE_NAME.service"
sudo sed -i "s|ExecStart=/usr/bin/node backend/server.js|ExecStart=/usr/bin/node $INSTALL_DIR/backend/dist/server.js|g" "/etc/systemd/system/$SERVICE_NAME.service"
sudo sed -i "s|User=pi|User=$CURRENT_USER|g" "/etc/systemd/system/$SERVICE_NAME.service"
sudo sed -i "s|Group=pi|Group=$CURRENT_USER|g" "/etc/systemd/system/$SERVICE_NAME.service"

# Build backend TypeScript
log_info "Building backend TypeScript..."
cd "$INSTALL_DIR/backend"
npm run build

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

# ==========================================
# STEP 11: Setup Nginx Reverse Proxy
# ==========================================
log_info "Setting up Nginx reverse proxy..."

# Create Nginx site configuration
sudo tee "/etc/nginx/sites-available/$APP_NAME" > /dev/null <<EOF
server {
    listen 80;
    server_name localhost;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files (if needed)
    location /assets/ {
        alias $INSTALL_DIR/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Audio files
    location /audio/ {
        alias $INSTALL_DIR/backend/audio/;
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        access_log off;
    }
}
EOF

# Enable the site
sudo ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/"

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

# ==========================================
# STEP 12: Setup Firewall (if ufw is available)
# ==========================================
if command -v ufw > /dev/null; then
    log_info "Configuring firewall..."
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
else
    log_warn "UFW firewall not available, skipping firewall configuration"
fi

# ==========================================
# STEP 13: Setup Health Check Script
# ==========================================
log_info "Setting up health check script..."

# Make health check script executable
chmod +x "$INSTALL_DIR/deploy/health-check.sh"

# Create health check cron job (every 5 minutes)
(crontab -l 2>/dev/null || true; echo "*/5 * * * * $INSTALL_DIR/deploy/health-check.sh >> /var/log/storyapp-health.log 2>&1") | crontab -

# ==========================================
# STEP 14: Setup Log Rotation
# ==========================================
log_info "Setting up log rotation..."

sudo tee "/etc/logrotate.d/$SERVICE_NAME" > /dev/null <<EOF
/var/log/storyapp-health.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    copytruncate
    create 644 $CURRENT_USER $CURRENT_USER
}
EOF

# ==========================================
# STEP 15: Start Services
# ==========================================
log_info "Starting services..."

# Start the application service
sudo systemctl start "$SERVICE_NAME"

# Wait a moment for service to start
sleep 5

# Check service status
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    log_success "Service $SERVICE_NAME is running"
else
    log_error "Service $SERVICE_NAME failed to start"
    sudo systemctl status "$SERVICE_NAME" || true
    exit 1
fi

# ==========================================
# STEP 16: Final Audio Test
# ==========================================
log_info "Testing audio configuration..."

# Test if audio device is detected
if aplay -l | grep -q "card 0"; then
    log_success "Audio device detected"
    
    # Test audio playback (if speaker-test is available)
    if command -v speaker-test > /dev/null; then
        log_info "Running audio test (2 seconds)..."
        timeout 2s speaker-test -t sine -f 1000 -c 2 > /dev/null 2>&1 || true
        log_success "Audio test completed"
    fi
else
    log_warn "Audio device not detected. You may need to reboot."
fi

# ==========================================
# FINAL SETUP VERIFICATION
# ==========================================
log_info "Verifying installation..."

# Check if service is running
SERVICE_STATUS=$(sudo systemctl is-active "$SERVICE_NAME" 2>/dev/null || echo "inactive")
NGINX_STATUS=$(sudo systemctl is-active nginx 2>/dev/null || echo "inactive")

# Check if API is responding
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo "000")

# Display results
echo ""
echo "==============================================="
log_success "Installation completed!"
echo "==============================================="
echo ""
echo "📊 Service Status:"
echo "  • Application Service: $SERVICE_STATUS"
echo "  • Nginx Proxy: $NGINX_STATUS"
echo "  • API Health Check: $API_RESPONSE"
echo ""
echo "🌐 Access URLs:"
echo "  • Local: http://localhost"
echo "  • Network: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "📁 Important Paths:"
echo "  • Application: $INSTALL_DIR"
echo "  • Environment: $INSTALL_DIR/backend/.env"
echo "  • Audio Files: $INSTALL_DIR/backend/audio/"
echo "  • Database: $INSTALL_DIR/backend/database/"
echo "  • Logs: sudo journalctl -u $SERVICE_NAME"
echo ""
echo "🔧 Management Commands:"
echo "  • Start:   sudo systemctl start $SERVICE_NAME"
echo "  • Stop:    sudo systemctl stop $SERVICE_NAME"  
echo "  • Restart: sudo systemctl restart $SERVICE_NAME"
echo "  • Status:  sudo systemctl status $SERVICE_NAME"
echo "  • Logs:    sudo journalctl -u $SERVICE_NAME -f"
echo ""

if [ "$SERVICE_STATUS" = "active" ] && [ "$NGINX_STATUS" = "active" ] && [ "$API_RESPONSE" = "200" ]; then
    log_success "✅ All services are running correctly!"
    echo ""
    echo "🔑 Next Steps:"
    echo "1. Configure API keys in: $INSTALL_DIR/backend/.env"
    echo "2. Restart service: sudo systemctl restart $SERVICE_NAME"
    echo "3. Test audio: Open web interface and create a story"
    echo ""
    if ! aplay -l | grep -q "card 0"; then
        log_warn "⚠️  Audio device not detected. Reboot may be required:"
        echo "   sudo reboot"
    fi
else
    log_error "❌ Some services are not running properly"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "• Check service logs: sudo journalctl -u $SERVICE_NAME"
    echo "• Check Nginx logs: sudo journalctl -u nginx"
    echo "• Verify environment: cat $INSTALL_DIR/backend/.env"
    echo ""
    echo "💡 Common issues:"
    echo "• Missing API keys in .env file"
    echo "• Audio device needs reboot to be detected"
    echo "• Port 80 might be in use by another service"
fi

log_info "Installation script completed!"

# ==========================================
# STEP 17: Cleanup and Final Notes
# ==========================================
log_info "Cleaning up temporary files..."
sudo apt-get autoremove -y
sudo apt-get autoclean

echo ""
echo "🎵 Bedtime Stories App is ready!"
echo "   Access the web interface to start creating stories"
echo "   for your little ones. Sweet dreams! 🌙"
echo ""