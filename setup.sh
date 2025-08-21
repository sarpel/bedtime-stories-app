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
    log "Frontend build";
    (cd "$APP_DIR" && NODE_ENV=production npm install --omit=dev >>"$LOG_FILE" 2>&1 && NODE_ENV=production npm run build >>"$LOG_FILE" 2>&1) || {
        log "Frontend build hatası - log kontrol et: $LOG_FILE"
        # Build hatalı olursa devam et ama uyar
        return 0
    }

    # Build başarılı mı kontrol et
    if [ -d "$APP_DIR/dist" ] && [ -f "$APP_DIR/dist/index.html" ]; then
        log "Frontend build başarılı - dist klasörü oluşturuldu"

        # Static dosyaları root'a kopyala (Express static serving için)
        log "Static dosyalar root klasöre kopyalanıyor..."
        cp "$APP_DIR/dist/index.html" "$APP_DIR/"
        if [ -d "$APP_DIR/dist/assets" ]; then
            cp -r "$APP_DIR/dist/assets" "$APP_DIR/"
            log "✅ Static dosyalar kopyalandı (index.html, assets/)"
        fi

        # Build klasörünü temizle (opsiyonel, disk tasarrufu)
        # rm -rf "$APP_DIR/dist"
    else
        log "UYARI: Frontend build tamamlandı ama dist klasörü eksik"
    fi
}

install_backend(){
    log "Backend bağımlılıkları"; (cd "$APP_DIR/backend" && npm install --omit=dev >>"$LOG_FILE" 2>&1) || err "Backend npm hatası";

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

summary(){
    IP=$(hostname -I | awk '{print $1}')
    echo "========================================="
    echo "Kurulum tamam (v$SCRIPT_VERSION)"
    echo "Uygulama: http://$IP:$APP_PORT"
    echo "========================================="
    echo "⚠️  ÖNEMLİ: API anahtarlarınızı ayarlayın!"
    echo "Dosya: $APP_DIR/backend/.env"
    echo ""
    echo "Gerekli anahtarlar:"
    echo "  OPENAI_API_KEY=your_openai_key_here"
    echo "  ELEVENLABS_API_KEY=your_elevenlabs_key_here"
    echo ""
    echo "Anahtarları ayarladıktan sonra servisi yeniden başlatın:"
    echo "  sudo systemctl restart storyapp"
    echo ""
    echo "Kurulum kontrolü için:"
    echo "  cd $APP_DIR && bash check-setup.sh"
    echo ""
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
