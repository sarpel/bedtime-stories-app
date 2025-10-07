# Network Share (dev:share) Kullanım Kılavuzu

## 🌐 Genel Bakış

`npm run dev:share` komutu, uygulamanızı aynı ağdaki diğer cihazlardan erişilebilir hale getirir. Hem frontend (5173) hem de backend (3001) tüm network interface'lerinden (`0.0.0.0`) gelen bağlantıları kabul eder.

---

## 🚀 Kullanım

### Başlatma

```bash
npm run dev:share
```

### Ne Yapar?

- ✅ **Frontend (Vite):** `0.0.0.0:5173` üzerinden çalışır
- ✅ **Backend (Express):** `0.0.0.0:3001` üzerinden çalışır
- ✅ Tüm IP adreslerinden gelen bağlantıları kabul eder
- ✅ Renkli konsol çıktısı ile frontend ve backend logları ayrı görünür

---

## 📱 Diğer Cihazlardan Erişim

### 1. IP Adresinizi Bulun

#### Windows:

```bash
ipconfig
```

`IPv4 Address` satırına bakın (örn: `192.168.1.100`)

#### Linux/Mac:

```bash
ifconfig
# veya
ip addr show
```

#### Alternatif (Node.js ile):

```bash
node -e "require('dns').lookup(require('os').hostname(), (err, addr) => console.log(addr))"
```

### 2. Erişim URL'leri

Diğer cihazlardan (mobil, tablet, başka PC) tarayıcıda şu adresleri kullanın:

```
Frontend: http://<your-ip>:5173
Backend API: http://<your-ip>:3001/api
```

**Örnek:**

```
Frontend: http://192.168.1.100:5173
Backend API: http://192.168.1.100:3001/api
```

---

## ⚙️ Teknik Detaylar

### Frontend Yapılandırması (vite.config.ts)

```typescript
server: {
  host: '0.0.0.0',  // Tüm IP'lerden erişim
  port: 5173,
  allowedHosts: true,  // Tüm host'ları kabul et
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

### Backend Yapılandırması (server.ts)

```typescript
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Backend: http://${HOST}:${PORT}`);
});
```

### NPM Script (package.json)

```json
{
  "scripts": {
    "dev:share": "concurrently --names \"FRONTEND,BACKEND\" --prefix-colors \"cyan,magenta\" \"vite --host 0.0.0.0\" \"cd backend && npm run dev\""
  }
}
```

---

## 🔒 Güvenlik Notları

### ⚠️ Önemli Uyarılar

1. **Sadece Geliştirme İçin:** Bu yapılandırma sadece development ortamı içindir
2. **Güvenli Ağda Kullanın:** Güvenilir, özel ağlarda (ev/ofis WiFi) kullanın
3. **Üretim İçin Kullanmayın:** Production'da ters proxy (nginx/apache) kullanın
4. **Firewall:** Gerekirse 5173 ve 3001 portlarını firewall'dan açın

### Firewall Yapılandırması (Windows)

Port 5173 ve 3001'i açmak için:

```powershell
# PowerShell (Yönetici olarak çalıştırın)
New-NetFirewallRule -DisplayName "Bedtime Stories Frontend" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
New-NetFirewallRule -DisplayName "Bedtime Stories Backend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

---

## 🧪 Test Senaryoları

### Test 1: Aynı Bilgisayardan Erişim

```bash
curl http://localhost:5173
curl http://127.0.0.1:3001/api/health
```

### Test 2: IP Adresi ile Erişim

```bash
curl http://192.168.1.100:5173
curl http://192.168.1.100:3001/api/health
```

### Test 3: Başka Cihazdan Erişim

- Mobil cihazdan tarayıcıyı açın
- `http://<your-ip>:5173` adresine gidin
- Uygulama tam çalışmalı

### Test 4: Backend API Test

```bash
curl http://<your-ip>:3001/api/health
# Beklenen yanıt: {"status":"ok","timestamp":"..."}
```

---

## 🐛 Sorun Giderme

### Sorun: Diğer cihazlardan erişilemiyor

**Çözüm 1:** Firewall kontrolü

```bash
# Windows'ta geçici olarak firewall'u kapatıp test edin
# Control Panel → Windows Defender Firewall → Turn off
```

**Çözüm 2:** IP adresini doğrulayın

```bash
# Doğru network interface'ini kullandığınızdan emin olun
ipconfig | findstr IPv4
```

**Çözüm 3:** Backend proxy ayarlarını kontrol edin

- `vite.config.ts` içinde proxy hedefinin doğru olduğundan emin olun
- Backend'in çalıştığını `http://localhost:3001/api/health` ile test edin

### Sorun: CORS Hataları

Backend zaten CORS'u handle ediyor, ancak sorun yaşarsanız:

- Tarayıcı konsolunu kontrol edin
- Backend loglarında CORS hatalarını arayın
- `server.ts` içinde CORS yapılandırmasını gözden geçirin

### Sorun: Bağlantı Zaman Aşımı

**Çözüm:**

- Aynı ağda olduğunuzdan emin olun (aynı WiFi/router)
- VPN kapalı olmalı
- Antivirus/güvenlik yazılımını geçici olarak devre dışı bırakın

---

## 📊 Konsol Çıktısı Örneği

```bash
$ npm run dev:share

[FRONTEND] VITE v6.3.5  ready in 432 ms
[FRONTEND] ➜  Local:   http://localhost:5173/
[FRONTEND] ➜  Network: http://192.168.1.100:5173/
[FRONTEND] ➜  Network: http://10.0.0.5:5173/
[FRONTEND] ➜  press h + enter to show help

[BACKEND] Backend proxy sunucusu http://0.0.0.0:3001 adresinde çalışıyor
[BACKEND] Network erişimi: http://<your-ip>:3001
```

---

## 🔄 Alternatif Komutlar

### Sadece Yerel Geliştirme

```bash
npm run dev
# localhost:5173 (sadece bu bilgisayardan)
```

### Network Erişimi (Alias)

```bash
npm run dev:network
# dev:share ile aynı
```

### Sadece Frontend Network

```bash
vite --host 0.0.0.0
```

### Sadece Backend Network

```bash
cd backend && HOST=0.0.0.0 npm run dev
```

---

## 📱 Mobil Test İpuçları

### iOS (Safari)

- `http://<ip>:5173` adresine gidin
- "Add to Home Screen" ile PWA olarak ekleyin
- Mikrofon izinlerini verin (sesli komutlar için)

### Android (Chrome)

- `http://<ip>:5173` adresine gidin
- "Install App" ile PWA yükleyin
- Site ayarlarından mikrofon iznini verin

### Responsive Test

- Chrome DevTools → Device Toolbar (Ctrl+Shift+M)
- Farklı ekran boyutlarını test edin

---

## 🎯 Kullanım Senaryoları

### 1. Mobil Cihazda Test

```bash
# PC'de
npm run dev:share

# Mobil'de
http://192.168.1.100:5173
```

### 2. Tablet'te Demo

- Müşterilere veya ekip üyelerine gösterim
- Gerçek cihazlarda kullanıcı deneyimi testi

### 3. Raspberry Pi'de Geliştirme

- Pi Zero 2W'de geliştirme yaparken
- PC'den erişerek test etme

### 4. Çoklu Cihaz Testi

- Aynı anda birden fazla cihazdan erişim
- Senkronizasyon testleri

---

## ✅ Checklist

Başlamadan önce kontrol edin:

- [ ] Aynı WiFi/ağa bağlısınız
- [ ] Firewall portları açık (5173, 3001)
- [ ] Backend `.env` dosyası yapılandırılmış
- [ ] Node.js ve npm kurulu
- [ ] Dependencies yüklü (`npm install`)

---

**Network Share ile mutlu kodlamalar! 🌐✨**
