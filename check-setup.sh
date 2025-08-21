#!/usr/bin/env bash
# =============================================================================
# KURULUM SONRASI KONTROL SCRIPTİ (Pi Zero 2 W)
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/storyapp}"
APP_PORT="${APP_PORT:-3001}"

log(){ echo "[$(date '+%H:%M:%S')] $*"; }
err(){ echo "[ERROR] $*" >&2; exit 1; }

check_service(){
    log "Servis durumu kontrol ediliyor..."
    if systemctl is-active --quiet storyapp.service; then
        log "✅ Servis aktif ve çalışıyor"
        systemctl status storyapp.service --no-pager -l
    else
        log "❌ Servis çalışmıyor"
        echo "Servis logları:"
        journalctl -u storyapp -n 20 --no-pager
        return 1
    fi
}

check_health(){
    log "Health endpoint kontrol ediliyor..."
    local max_attempts=5
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "http://localhost:$APP_PORT/health" >/dev/null; then
            log "✅ Health endpoint yanıt veriyor"
            curl -s "http://localhost:$APP_PORT/health" | jq '.' 2>/dev/null || curl -s "http://localhost:$APP_PORT/health"

            # JavaScript dosyalarının MIME type'ını kontrol et
            check_mime_types
            return 0
        else
            log "⏳ Health endpoint yanıt vermiyor (deneme $attempt/$max_attempts)"
            sleep 2
            attempt=$((attempt + 1))
        fi
    done

    log "❌ Health endpoint erişilebilir değil"
    return 1
}

check_mime_types(){
    log "JavaScript MIME type kontrolü..."

    # Assets klasöründe JS dosyası ara
    local js_file=""
    if [ -d "$APP_DIR/assets" ]; then
        js_file=$(find "$APP_DIR/assets" -name "*.js" -type f | head -1)
    fi

    if [ -n "$js_file" ]; then
        local js_filename=$(basename "$js_file")
        local mime_response=$(curl -s -I "http://localhost:$APP_PORT/assets/$js_filename" 2>/dev/null | grep -i "content-type" || true)

        if echo "$mime_response" | grep -qi "application/javascript"; then
            log "✅ JavaScript MIME type doğru"
        elif echo "$mime_response" | grep -qi "text/jsx\|text/plain"; then
            log "⚠️  JavaScript MIME type sorunu tespit edildi"
            log "   Bulunan: $mime_response"
            log "   Beklenen: application/javascript"
            log "   Bu sorun ES module yükleme hatalarına neden olabilir"
        else
            log "⚠️  JavaScript MIME type kontrol edilemedi"
        fi
    else
        log "⚠️  Test edilecek JavaScript dosyası bulunamadı"
    fi
}

check_env_file(){
    log "Environment dosyası kontrol ediliyor..."
    local env_file="$APP_DIR/backend/.env"

    if [ ! -f "$env_file" ]; then
        log "❌ .env dosyası bulunamadı: $env_file"
        return 1
    fi

    log "✅ .env dosyası mevcut"

    # API anahtarları kontrol et
    local missing_keys=()

    if ! grep -q "^OPENAI_API_KEY=.\+" "$env_file" 2>/dev/null; then
        missing_keys+=("OPENAI_API_KEY")
    fi

    if ! grep -q "^ELEVENLABS_API_KEY=.\+" "$env_file" 2>/dev/null; then
        missing_keys+=("ELEVENLABS_API_KEY")
    fi

    if [ ${#missing_keys[@]} -gt 0 ]; then
        log "⚠️  Eksik API anahtarları: ${missing_keys[*]}"
        log "Lütfen $env_file dosyasını düzenleyin ve aşağıdaki anahtarları ekleyin:"
        for key in "${missing_keys[@]}"; do
            echo "  $key=your_api_key_here"
        done
        echo ""
        log "Anahtarları ekledikten sonra servisi yeniden başlatın:"
        log "  sudo systemctl restart storyapp"
        return 1
    else
        log "✅ API anahtarları ayarlanmış"
    fi
}

check_files(){
    log "Dosya yapısı kontrol ediliyor..."

    local required_files=(
        "$APP_DIR/backend/server.js"
        "$APP_DIR/backend/package.json"
        "$APP_DIR/index.html"
    )

    local required_dirs=(
        "$APP_DIR/backend/database"
        "$APP_DIR/backend/audio"
    )

    local missing_files=()
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done

    local missing_dirs=()
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            missing_dirs+=("$dir")
        fi
    done

    # assets klasörü: ya root/assets ya dist/assets'ten biri yeterli
    if [ ! -d "$APP_DIR/assets" ] && [ ! -d "$APP_DIR/dist/assets" ]; then
        missing_dirs+=("$APP_DIR/assets")
    fi

    if [ ${#missing_files[@]} -gt 0 ] || [ ${#missing_dirs[@]} -gt 0 ]; then
        if [ ${#missing_files[@]} -gt 0 ]; then
            log "❌ Eksik dosyalar:"
            for file in "${missing_files[@]}"; do
                echo "  - $file"
            done
        fi
        if [ ${#missing_dirs[@]} -gt 0 ]; then
            log "❌ Eksik klasörler:"
            for dir in "${missing_dirs[@]}"; do
                echo "  - $dir"
                # Assets klasörü için özel kontrol ve öneri
                if [[ "$dir" == */assets ]]; then
                    echo "    ℹ️  Assets klasörü production için gerekli (JS/CSS build dosyaları)"
                    echo "    🔧 Düzeltmek için:"
                    echo "       cd $APP_DIR && npm run build"
                    echo "       # dist/assets fallback otomatik servis edilecek (kopyalamak isteğe bağlı)"
                    if [ ! -d "$APP_DIR/dist/assets" ]; then
                        echo "    ⚠️  dist/assets klasörü de eksik - build gerekli"
                    fi
                fi
            done
        fi
        return 1
    else
        log "✅ Tüm gerekli dosyalar ve klasörler mevcut"

        # Assets klasörü mevcut ama içeriği kontrol et
        if [ -d "$APP_DIR/assets" ]; then
            local asset_count=$(find "$APP_DIR/assets" -type f 2>/dev/null | wc -l)
            if [ "$asset_count" -eq 0 ]; then
                log "⚠️  Assets klasörü boş!"
            else
                log "✅ Assets klasörü mevcut ($asset_count dosya)"
            fi
        fi
    fi

    # Dizin izinleri
    if [ -r "$APP_DIR" ] && [ -x "$APP_DIR" ]; then
        log "✅ Dizin izinleri doğru"
    else
        log "⚠️  Dizin izinleri kontrol edilmeli"
    fi
}

show_info(){
    local IP=$(hostname -I | awk '{print $1}')
    echo ""
    echo "========================================="
    echo "🌙 Bedtime Stories App - Durum Raporu"
    echo "========================================="
    echo "Uygulama URL'si: http://$IP:$APP_PORT"
    echo "Yerel erişim: http://localhost:$APP_PORT"
    echo ""
    echo "Faydalı komutlar:"
    echo "  Servisi yeniden başlat: sudo systemctl restart storyapp"
    echo "  Servisi durdur: sudo systemctl stop storyapp"
    echo "  Logları izle: sudo journalctl -u storyapp -f"
    echo "  .env dosyasını düzenle: sudo nano $APP_DIR/backend/.env"
    echo "========================================="
}

main(){
    log "Bedtime Stories App kurulum kontrolü başlıyor..."

    local errors=0

    check_files || errors=$((errors + 1))
    check_env_file || errors=$((errors + 1))
    check_service || errors=$((errors + 1))
    check_health || errors=$((errors + 1))

    if [ $errors -eq 0 ]; then
        log "🎉 Tüm kontroller başarılı!"
        show_info
    else
        log "❌ $errors hata tespit edildi"
        echo ""
        log "Sorun giderme önerileri:"
        log "  1. .env dosyasındaki API anahtarlarını kontrol edin"
        log "  2. Eksik assets klasörü varsa:"
        log "     cd $APP_DIR && npm run build && cp -r dist/assets $APP_DIR/"
        log "  3. MIME type sorunu varsa servisi yeniden başlatın:"
        log "     sudo systemctl restart storyapp"
        log "  4. Frontend MIME hatası için browser'ı yenileyin (Ctrl+F5)"
        log "  5. Logları kontrol edin: sudo journalctl -u storyapp -n 20"
        echo ""
        exit 1
    fi
}

main "$@"
