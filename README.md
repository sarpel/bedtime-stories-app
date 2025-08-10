# Uyku Masalları - Bedtime Stories App

5 yaşındaki bir Türk kız çocuğu için kişiselleştirilmiş masallar üreten ve bunları konuşmaya çeviren React + Vite + Tailwind CSS tabanlı web uygulaması. Tüm LLM/TTS çağrıları backend proxy üzerinden yapılır; API anahtarları yalnızca backend `.env` dosyasında tutulur.

## 🌟 Özellikler

- **LLM Entegrasyonu**: OpenAI ve OpenAI uyumlu LLM'lerle masal üretimi (proxy ile)
- **TTS Entegrasyonu**: ElevenLabs ve uyumlu TTS servisleriyle seslendirme (proxy ile)
- **Modern Arayüz**: Koyu mavi temalı responsive tasarım
- **Ayrıntılı Ayarlar**: Model, ses ve masal parametreleri
- **Türkçe Odaklı**: Çocuklara uygun Türkçe içerik
- **Gelişmiş Oynatıcı**: İlerleme, duraklatma, favori vb.
- **Hata Dayanıklılığı**: Kullanıcı dostu mesajlar ve metin moduna düşme
- **Mobil Uyum**: Tüm cihazlarda akıcı deneyim

## 🛠️ Yapılandırma

### LLM Ayarları

1. "Ayarlar" menüsünden LLM sekmesine gidin
2. Model bilgileri bilgilendirme amaçlıdır; tüm istekler aynı-origin backend proxy üzerinden (/api/llm) yapılır
3. API anahtarları frontend’de tutulmaz; yalnızca backend `.env` içinde yönetilir

### TTS Ayarları

1. "Ses" sekmesinden model ve ses seçimini yapın
2. Tüm TTS istekleri aynı-origin backend proxy üzerinden (/api/tts) yapılır
3. API anahtarları sadece backend `.env` dosyasında bulunur

### Backend Ortam Değişkenleri

`backend/.env` dosyasında API anahtarlarını tanımlayın:

```bash
OPENAI_API_KEY=sk-your-openai-key
GEMINI_LLM_API_KEY=your-gemini-llm-key
GEMINI_TTS_API_KEY=your-gemini-tts-key
ELEVENLABS_API_KEY=xi-api-key-your-key
LOG_LEVEL=info
```

### Ses Ayarları

1. "Ses" sekmesine gidin
2. Aşağıdakileri ayarlayın:
   - **Konuşma Hızı**: 0.5x – 2.0x
   - **Ses Tonu**: Düşük – Yüksek
   - **Ses Seviyesi**: %10 – %100

### İçerik Ayarları

1. "İçerik" sekmesine gidin
2. Şunları yapılandırın:
   - **Masal Uzunluğu**: Kısa (1–2 dk), Orta (3–5 dk), Uzun (5–8 dk)
   - **Özel Prompt**: Masal üretim yönergesi

## 📖 Kullanım

1. **Uygulamayı açın**: <http://localhost:5173> (dev) veya <http://localhost:4173> (preview). Prod'da backend `dist` klasörünü servis eder.
2. **Ayarlar**: "Ayarlar" bölümünden model/voice/parametreleri seçin. API anahtarlarını UI’ya değil `backend/.env` dosyasına ekleyin.
3. **Masal Üret**: "Yeni Masal Oluştur" ile masal üretin.
4. **Seslendir**: "Seslendir" ile TTS çalıştırın.
5. **Çal**: Oynatıcıdan oynat/duraklat/durdur.

## 🎯 Desteklenen Sağlayıcılar

### LLM

- **OpenAI** ve OpenAI uyumlu API’ler

### TTS

- **ElevenLabs** ve uyumlu TTS servisleri

## 🎨 Özelleştirme

### Örnek Prompts

- "Türk kültürüne uygun, eğitici değerler içeren masallar"
- "Hayvanlar ve doğa temalı, çevre bilinci kazandıran hikayeler"
- "Arkadaşlık, paylaşım ve yardımlaşma değerlerini öğreten masallar"
- "Fantastik öğeler içeren, hayal gücünü geliştiren hikayeler"

### Ses Seçenekleri

- **ElevenLabs**: Premium AI sesleri

## 🔒 Gizlilik & Güvenlik

- API anahtarları yalnızca `backend/.env` içinde saklanır; frontend’de asla tutulmaz
- Tüm LLM/TTS çağrıları backend proxy üzerinden yapılır
- Hatalarda metin modu ve kullanıcı dostu mesajlarla zarif düşüş uygulanır
- Ayarlar tarayıcı localStorage’da saklanır; masallar ve sesler backend veritabanı/dosyalarında tutulur

## 🛠️ Teknik Bilgiler

### Kullanılan Teknolojiler

- **React 19**
- **React Router 7**
- **Vite 6**
- **Tailwind CSS 4**
- **Radix UI** ve **Lucide Icons**

### Mimari

- **Frontend**: React SPA
- **Backend**: Express + SQLite (WAL), statik `dist` servisi ve proxy uçları
- **Hibrit Veri**: Ayarlar localStorage, masallar + sesler veritabanı/dosyada
- **Servisler**: LLM/TTS istekleri backend proxy üzerinden

### Tarayıcı Uyumluluğu

- Modern tarayıcılar (Vite varsayılanları)

## 🚀 Geliştirme

### Yerel Kurulum

```bash
# Depoyu klonla
git clone <repository-url>
cd bedtime-stories-app

# Bağımlılıkları yükle
npm install

# Geliştirme
npm run dev

# Prod derleme
npm run build
```

### Proje Yapısı

```text
src/
├── components/
│   ├── ui/
│   └── Settings.jsx
├── services/
│   ├── llmService.js
│   └── ttsService.js
├── App.jsx
├── App.css
└── main.jsx
```

## 📝 API Kullanımı

Tüm LLM ve TTS çağrıları frontend’den doğrudan 3. taraf API’lara yapılmaz. Backend proxy uçları kullanılır:

- LLM: POST `/api/llm`
- TTS: POST `/api/tts`

Bu yaklaşım API anahtarlarını korur. Geliştirme ortamında Vite proxy ile `/api` ve `/audio` istekleri backend'e yönlendirilir; üretimde aynı-origin çalışır.

## 🎯 Gelecek Geliştirmeler

- Tema ve kategori desteği
- Karakter özelleştirme
- Masal geçmişi ve favoriler
- Önbellekli çevrimdışı mod
- Çoklu dil desteği
- Ebeveyn paneli
- Uyku zamanlayıcısı
- Arka plan müziği seçenekleri

## 📞 Destek

Teknik destek veya istekler için uygulama içi ayar ekranındaki yönergeleri izleyin. Uygulama, ayrıntılı hata mesajları ve zarif düşüşlerle sorunsuz deneyim sağlar.

## 📄 Lisans

Bu proje kişisel kullanım içindir. Entegre ettiğiniz üçüncü taraf API’lerin kullanım şartlarına uyduğunuzdan emin olun.

---

Tatlı rüyalar ve güzel masallar için ❤️ ile yapıldı.
