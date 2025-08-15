#!/usr/bin/env bash
# =============================================================================
# MİNİMUM ÜRETİM KURULUM SCRIPTİ (Pi Zero 2 W)
# Amaç: Repoyu /opt/storyapp altına klonla, build et, systemd servisini başlat.
# Gereksiz tüm rollback/backup/test/monitoring adımları kaldırıldı.
# =============================================================================
set -euo pipefail
SCRIPT_VERSION="1.0.0"
APP_REPO="${APP_REPO:-https://github.com/sarpel/bedtime-stories-app.git}"
APP_DIR="${APP_DIR:-/opt/storyapp}"
APP_PORT="${APP_PORT:-8080}"
LOG_DIR="/var/log/storyapp"
mkdir -p "$LOG_DIR" || true
LOG_FILE="$LOG_DIR/setup-$(date +%Y%m%d-%H%M%S).log"

log(){ echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
err(){ echo "[ERROR] $*" | tee -a "$LOG_FILE" >&2; exit 1; }

require_root(){ [ "$EUID" -eq 0 ] || err "root (sudo) ile çalıştır"; }

install_packages(){
    log "Paketler kuruluyor";
    apt-get update -y >>"$LOG_FILE" 2>&1;
    apt-get install -y curl git nodejs npm sqlite3 alsa-utils >>"$LOG_FILE" 2>&1 || err "apt kurulum hatası";
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
    log "Frontend build"; (cd "$APP_DIR" && npm install --omit=dev >>"$LOG_FILE" 2>&1 && npm run build >>"$LOG_FILE" 2>&1 || log "Build uyarı: devam" )
}

install_backend(){
    log "Backend bağımlılıkları"; (cd "$APP_DIR/backend" && npm install --omit=dev >>"$LOG_FILE" 2>&1) || err "Backend npm hatası";
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

summary(){
    IP=$(hostname -I | awk '{print $1}')
    echo "========================================="
    echo "Kurulum tamam (v$SCRIPT_VERSION)"
    echo "Uygulama: http://$IP:$APP_PORT"
    echo "ENV dosyası: backend/.env (anahtarlar boşsa LLM/TTS çalışmaz)"
    echo "Servis log: journalctl -u storyapp -f"
    echo "Gerekirse reboot önerilir (audio için)"
    echo "========================================="
}

main(){
    require_root
    install_packages
    mkdir -p "$APP_DIR" "$LOG_DIR"
    clone_or_update
    build_frontend
    install_backend
    write_service
    verify
    summary
}

main "$@"
