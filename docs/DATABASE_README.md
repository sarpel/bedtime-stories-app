# Uyku Masalları - Veritabanı Sistemi

Bu uygulama artık SQLite veritabanı ile masalları ve ses dosyalarını kalıcı olarak saklayabilir.

## Yeni Özellikler

### ✅ Kalıcı Veri Saklama

- Masallar artık SQLite veritabanında saklanıyor
- Ses dosyaları disk üzerinde depolanıyor ve veritabanında referansları tutuluyor
- Sayfa yeniden yüklendiğinde veriler kaybolmuyor

### ✅ Minimalist Veritabanı Sistemi

- **Stories Tablosu**: Masal metinleri, türleri ve meta verileri
- **Audio Files Tablosu**: Ses dosyalarının bilgileri ve masallarla ilişkisi
- SQLite kullanımı: Hafif, dosya tabanlı, kurulum gerektirmeyen

### ✅ Otomatik Migration

- Mevcut localStorage verileri otomatik olarak veritabanına aktarılır
- Backward compatibility sağlanır

## Teknik Detaylar

### Backend API Endpoint'leri

```http
GET    /api/stories              # Tüm masalları listele
GET    /api/stories/:id          # Belirli bir masalı getir
POST   /api/stories              # Yeni masal oluştur
PUT    /api/stories/:id          # Masal güncelle
DELETE /api/stories/:id          # Masal sil
GET    /api/stories/type/:type   # Belirli türdeki masalları getir
POST   /api/tts                  # TTS ile ses oluştur (güncellenmiş)
GET    /audio/:filename          # Ses dosyalarını serve et
```

### Veritabanı Şeması

**stories** tablosu:

```sql
id (INTEGER PRIMARY KEY)
story_text (TEXT)
story_type (TEXT)
custom_topic (TEXT)
created_at (DATETIME)
updated_at (DATETIME)
```

**audio_files** tablosu:

```sql
id (INTEGER PRIMARY KEY)
story_id (INTEGER, FOREIGN KEY)
file_name (TEXT)
file_path (TEXT)
voice_id (TEXT)
voice_settings (TEXT, JSON)
created_at (DATETIME)
```

### Dosya Yapısı

```text
backend/
├── database/
│   ├── db.js              # Veritabanı modülü
│   └── stories.db         # SQLite veritabanı dosyası
├── audio/                 # Ses dosyaları klasörü
│   └── story-*.mp3        # Oluşturulan ses dosyaları
└── server.js              # Ana sunucu dosyası (güncellenmiş)

src/
├── hooks/
│   └── useStoryDatabase.js    # Yeni veritabanı hook'u
└── services/
    └── databaseService.js     # Veritabanı API servisi
```

## Kullanım

1. **Backend Başlat**:

   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Frontend Başlat**:

   ```bash
   npm run dev
   ```

3. **Masal Oluştur**:
   - Uygulama arayüzünden masal oluşturun
   - Masal otomatik olarak veritabanına kaydedilir

4. **Ses Oluştur**:
   - Ses oluştur butonuna tıklayın
   - Ses dosyası disk üzerinde saklanır ve veritabanında referansı tutulur

## Veri Persisitence

- **Masallar**: SQLite veritabanında (`backend/database/stories.db`)
- **Ses Dosyaları**: Disk üzerinde (`backend/audio/` klasöründe)
- **Migration**: localStorage'dan otomatik aktarım

## Performans Optimizasyonları

- İndeksler ile hızlı arama
- Prepared statements ile güvenli sorgular
- WAL modu ile eş zamanlı okuma/yazma
- Önbellek sistemi korundu

## Güvenlik

- SQL injection koruması (prepared statements)
- Dosya upload güvenliği
- API anahtarları backend'de korunuyor

## Troubleshooting

### Veritabanı sorunları

- Backend loglarını kontrol edin
- `backend/database/stories.db` dosyasının varlığını kontrol edin

### Ses dosyası sorunları

- `backend/audio/` klasörünün yazılabilir olduğundan emin olun
- ElevenLabs API anahtarının geçerli olduğunu kontrol edin

### Migration sorunları

- Browser console'da migration loglarını kontrol edin
- localStorage temizlendiyse migration tekrar çalışmaz
