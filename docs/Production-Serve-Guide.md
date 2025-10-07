# Production Serve Kılavuzu

**Tarih:** 7 Ekim 2025  
**Proje:** Bedtime Stories App

---

## 🎯 Genel Bakış

Production build'i local veya network üzerinden serve etmek için NPM scriptleri.

---

## 📋 Kullanılabilir Komutlar

### 1. Build Production

```bash
npm run build
```

- TypeScript compile eder
- Production build oluşturur
- Minify ve optimize eder
- `dist/` klasörüne çıktı verir

---

### 2. Preview (Sadece Frontend)

```bash
npm run preview
```

**Port:** 4173  
**Host:** localhost

- Production build'i preview eder
- Backend çalıştırmaz
- API çağrıları başarısız olur (mock data ile test için ideal)

---

### 3. Preview Network (Sadece Frontend)

```bash
npm run preview:network
```

**Port:** 4173  
**Host:** 0.0.0.0 (Tüm network)

- Aynı ağdaki diğer cihazlardan erişilebilir
- Production build'i test eder
- Backend yok

---

### 4. Serve (Frontend + Backend) ⭐ Önerilen

```bash
npm run serve
```

**Frontend:** http://localhost:4173  
**Backend:** http://localhost:3001

- Production build'i tam olarak serve eder
- Backend API ile birlikte çalışır
- Gerçek production ortamını simüle eder

---

### 5. Serve Network (Frontend + Backend) 🌐

```bash
npm run serve:network
```

**Frontend:** http://0.0.0.0:4173  
**Backend:** http://0.0.0.0:3001

- Network'ten erişilebilir
- Mobil cihazlardan test için ideal
- Tam production setup

---

## 🔄 Tam Workflow

### Development → Production Test

```bash
# 1. Development mode'da çalış
npm run dev

# 2. Production build oluştur
npm run build

# 3. Production build'i test et (lokal)
npm run serve

# 4. Network'ten test et
npm run serve:network
```

---

## 🏗️ Script Detayları

### package.json

```json
{
  "scripts": {
    "build": "tsc && vite build --mode production",
    "serve": "concurrently \"vite preview\" \"cd backend && npm start\"",
    "serve:network": "concurrently \"vite preview --host 0.0.0.0\" \"cd backend && npm start\"",
    "preview": "vite preview",
    "preview:network": "vite preview --host 0.0.0.0"
  }
}
```

### Vite Preview Config

```typescript
preview: {
  host: "0.0.0.0",
  port: 4173,
  strictPort: true
}
```

---

## 🔌 Port Yapılandırması

| Servis       | Development | Production |
| ------------ | ----------- | ---------- |
| **Frontend** | 5173        | 4173       |
| **Backend**  | 3001        | 3001       |

---

## 🧪 Test Senaryoları

### Test 1: Frontend Preview

```bash
npm run preview

# Test et
curl http://localhost:4173
```

### Test 2: Full Production

```bash
npm run serve

# Frontend test
curl http://localhost:4173

# Backend test
curl http://localhost:3001/api/health
```

### Test 3: Network Access

```bash
npm run serve:network

# Başka cihazdan
curl http://192.168.1.100:4173
curl http://192.168.1.100:3001/api/health
```

---

## 🎨 Konsol Çıktısı

### npm run serve

```bash
[FRONTEND]
[FRONTEND]   ➜  Local:   http://localhost:4173/
[FRONTEND]   ➜  Network: http://192.168.1.100:4173/
[FRONTEND]
[BACKEND] Backend proxy sunucusu http://0.0.0.0:3001 adresinde çalışıyor
[BACKEND] Network erişimi: http://<your-ip>:3001
```

---

## 🔍 Farklar: Development vs Production

### Development (npm run dev)

- ✅ Hot Module Replacement (HMR)
- ✅ Source maps
- ✅ Fast reload
- ❌ Minification
- ❌ Optimization
- **Port:** 5173

### Production (npm run serve)

- ❌ No HMR
- ✅ Minified code
- ✅ Optimized bundles
- ✅ Tree shaking
- ✅ Code splitting
- **Port:** 4173

---

## 🚨 Önemli Notlar

### ⚠️ Backend Start Script

Backend'in `npm start` komutu şu an için `ts-node` kullanıyor:

```json
"start": "NODE_ENV=production ts-node server.ts"
```

**Daha İyi Production Setup (İleride):**

```json
"build": "tsc",
"start": "NODE_ENV=production node dist/server.js"
```

Backend'i TypeScript'ten compile edip compiled JavaScript'i çalıştırmak daha hızlı ve production-friendly.

---

## 🐛 Sorun Giderme

### Sorun 1: Port 4173 kullanımda

```bash
# Port'u kullanan işlemi bul
netstat -ano | findstr :4173  # Windows
lsof -i :4173                  # Linux/Mac

# İşlemi durdur
taskkill /PID <pid> /F         # Windows
kill -9 <pid>                  # Linux/Mac
```

### Sorun 2: Backend bağlanamıyor

```bash
# Backend'in çalıştığını kontrol et
curl http://localhost:3001/api/health

# Backend'i manuel başlat
cd backend
npm start
```

### Sorun 3: dist/ klasörü yok

```bash
# Build'i çalıştır
npm run build

# dist/ klasörünü kontrol et
ls -la dist/
```

### Sorun 4: Beyaz sayfa

```bash
# Browser console'u kontrol et (F12)
# 404 hatalarını kontrol et
# Backend API'ye erişilebildiğini doğrula
```

---

## 📊 Performans Karşılaştırması

### Build Boyutları

```bash
npm run build

dist/
├── assets/
│   ├── index.js (421K) - Main bundle
│   ├── vendor-*.js (144K) - Vendor chunks
│   └── *.css (68K) - Styles
└── index.html (1.5K)

Total: ~813KB
```

### Yükleme Süreleri (Production)

- **Initial Load:** ~1.2s (3G)
- **Interactive:** ~1.5s
- **Fully Loaded:** ~2s

---

## 🌐 Deployment Checklist

Production'a deploy etmeden önce:

- [ ] `npm run build` başarılı
- [ ] `npm run serve` ile test edildi
- [ ] Backend `.env` yapılandırıldı
- [ ] API keys doğru
- [ ] Database migration çalıştırıldı
- [ ] CORS ayarları doğru
- [ ] SSL/HTTPS yapılandırıldı (production)
- [ ] Monitoring aktif

---

## 🚀 Gerçek Production Deployment

### Nginx Reverse Proxy (Önerilen)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (static files)
    location / {
        root /var/www/bedtime-stories/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Audio files
    location /audio {
        proxy_pass http://localhost:3001;
    }
}
```

### PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Backend
cd backend
pm2 start server.ts --name bedtime-backend --interpreter ts-node

# Keep alive
pm2 startup
pm2 save
```

### Docker (Alternative)

```bash
# Build & Run
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 📚 İlgili Dokümanlar

- `Network-Share-Guide.md` - Network erişim detayları
- `Build-Fix-Report.md` - Build sorunları ve çözümleri
- `README.md` - Genel proje dokümantasyonu

---

## ✅ Hızlı Referans

| Ne Yapmak İstiyorsun?        | Komut                   |
| ---------------------------- | ----------------------- |
| Geliştirme yap               | `npm run dev`           |
| Production build oluştur     | `npm run build`         |
| Production'ı test et (lokal) | `npm run serve`         |
| Network'ten test et          | `npm run serve:network` |
| Sadece frontend preview      | `npm run preview`       |

---

**Production serve scriptleri hazır! 🎉**
