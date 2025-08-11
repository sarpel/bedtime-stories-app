# Bedtime Stories App - Kurulum Rehberi

## 🚀 Hızlı Başlangıç

### 1. API Anahtarlarını Ayarlayın

#### Frontend (.env dosyası)

```bash
# Proje kök dizininde .env dosyası oluşturun
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-your-openai-api-key
VITE_OPENAI_MODEL=gpt-4.1-mini

# ElevenLabs Configuration
VITE_ELEVENLABS_API_KEY=your-elevenlabs-api-key
VITE_ELEVENLABS_VOICE_ID=xsGHrtxT5AdDzYXTQT0d
VITE_ELEVENLABS_MODEL=eleven_turbo_v2_5

# Backend Configuration
# Opsiyonel: Ayrı domaine dağıtıyorsanız belirtin, aksi halde boş bırakın (aynı-origin)
# VITE_BACKEND_URL=
```

#### Backend (.env dosyası)

```bash
# Backend dizininde .env dosyası oluşturun
cd backend
cp .env.example .env
```

`backend/.env` dosyasını düzenleyin:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

### 2. API Anahtarlarını Alın

#### OpenAI API Anahtarı

1. [OpenAI Platform](https://platform.openai.com/) adresine gidin
2. Hesabınıza giriş yapın
3. "API Keys" bölümünden yeni anahtar oluşturun
4. Anahtarı `.env` dosyalarına ekleyin

#### ElevenLabs API Anahtarı

1. [ElevenLabs](https://elevenlabs.io/) adresine gidin
2. Hesabınıza giriş yapın
3. "Profile" > "API Key" bölümünden anahtarınızı kopyalayın
4. Anahtarı `.env` dosyalarına ekleyin

### 3. Uygulamayı Başlatın

#### Backend'i Başlatın

```bash
cd backend
npm install
npm start
```

#### Frontend'i Başlatın

```bash
# Yeni terminal açın
npm install
npm run dev
```

## 🎯 Özellikler

### ✅ Tamamlanan Özellikler

- **Masal Türü Seçimi**: 7 farklı masal türü + özel konu
- **Sabit Modeller**: OpenAI GPT-4.1-Mini + ElevenLabs Turbo
- **Environment Variables**: Güvenli API key yönetimi
- **Sadeleştirilmiş Ayarlar**: Sadece ses ve LLM parametreleri

### 🎨 Kullanım

1. **Masal Türü Seçin**: Hayvan, Prenses, Macera, vb.
2. **Özel Konu Girin** (isteğe bağlı): Kendi konunuzu belirtin
3. **Masal Oluşturun**: "Yeni Masal Oluştur" butonuna tıklayın
4. **Seslendirin**: "Seslendir" butonu ile masalı dinleyin

## 🔧 Ayarlar

### Ses Ayarları

- **Konuşma Hızı**: 0.5x - 2.0x
- **Ses Tonu**: 0.5x - 2.0x
- **Ses Seviyesi**: %10 - %100

### LLM Ayarları

- **Yaratıcılık Seviyesi**: 0.1 - 1.0
- **Maksimum Kelime**: 400 - 1200

## 📝 Notlar

- **API Formatları**: Mevcut API formatları korunmuştur
- **Güvenlik**: API anahtarları .env dosyalarında saklanır
- **Performans**: ElevenLabs Turbo modelleri maliyet avantajı sağlar
- **Kullanım**: Tek kişilik proje için optimize edilmiştir

## 🐛 Sorun Giderme

### "API anahtarı eksik" Hatası

- `.env` dosyalarının doğru konumda olduğunu kontrol edin
- API anahtarlarının doğru formatta olduğunu kontrol edin
- Backend ve frontend'in çalıştığını kontrol edin

### Geliştirici Proxy Notu

- Frontend dev: <http://localhost:5173> adresinden `/api` ve `/audio` istekleri Vite proxy ile backend'e yönlenir

### "Model Hatası"

- OpenAI ve ElevenLabs hesaplarınızın aktif olduğunu kontrol edin
- API kotalarınızın yeterli olduğunu kontrol edin
