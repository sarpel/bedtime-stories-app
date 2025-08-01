# API Anahtarı Kurulum Rehberi

## ElevenLabs API Anahtarı Alma

### 1. ElevenLabs Hesabı Oluşturma
1. [ElevenLabs.io](https://elevenlabs.io) adresine gidin
2. "Sign Up" butonuna tıklayın
3. E-posta adresinizle ücretsiz hesap oluşturun

### 2. API Anahtarı Alma
1. ElevenLabs hesabınıza giriş yapın
2. Sağ üst köşedeki profil menüsüne tıklayın
3. "Profile Settings" seçin
4. "API Key" sekmesine gidin
5. "Generate New API Key" butonuna tıklayın
6. API anahtarınızı kopyalayın (xi-api-key-... formatında olacak)

### 3. API Anahtarını Ayarlama

#### Frontend (.env dosyası)
```
VITE_ELEVENLABS_API_KEY=xi-api-key-your-actual-key-here
```

#### Backend (.env dosyası)
```
ELEVENLABS_API_KEY=xi-api-key-your-actual-key-here
```

### 4. API Anahtarı Formatı
ElevenLabs API anahtarları şu formatta olur:
- `xi-api-key-` ile başlar
- 64 karakter uzunluğunda olur
- Örnek: `xi-api-key-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

### 5. Ücretsiz Kullanım
- ElevenLabs ücretsiz hesabı ile aylık 10,000 karakter kullanabilirsiniz
- Bu yaklaşık 50-100 masal seslendirmesi yapar
- Daha fazlası için ücretli plana geçebilirsiniz

### 6. Sorun Giderme
- API anahtarı doğru formatta mı? (`xi-api-key-` ile başlamalı)
- .env dosyaları doğru konumda mı?
- Backend sunucusu çalışıyor mu? (`npm start` ile backend klasöründe)
- Frontend yeniden başlatıldı mı? (API anahtarı değişikliklerinden sonra)

### 7. Test Etme
API anahtarınızı test etmek için:
1. ElevenLabs dashboard'unda "Voice Library" bölümüne gidin
2. "Add Voice" butonuna tıklayın
3. Test metni yazın ve "Generate" butonuna tıklayın
4. Ses oluşturuluyorsa API anahtarınız çalışıyor demektir

## OpenAI API Anahtarı Alma

### 1. OpenAI Hesabı Oluşturma
1. [OpenAI.com](https://openai.com) adresine gidin
2. "Sign Up" butonuna tıklayın
3. E-posta adresinizle hesap oluşturun

### 2. API Anahtarı Alma
1. OpenAI hesabınıza giriş yapın
2. [API Keys](https://platform.openai.com/api-keys) sayfasına gidin
3. "Create new secret key" butonuna tıklayın
4. API anahtarınızı kopyalayın (sk-... formatında olacak)

### 3. API Anahtarını Ayarlama

#### Frontend (.env dosyası)
```
VITE_OPENAI_API_KEY=sk-your-actual-key-here
```

#### Backend (.env dosyası)
```
OPENAI_API_KEY=sk-your-actual-key-here
```

### 4. Ücretsiz Kullanım
- OpenAI ücretsiz hesabı ile aylık $5 kredi alırsınız
- Bu yaklaşık 100-200 masal oluşturma yapar
- Daha fazlası için ücretli plana geçebilirsiniz

## Önemli Notlar

1. **Güvenlik**: API anahtarlarınızı asla GitHub'a yüklemeyin
2. **Yedekleme**: API anahtarlarınızı güvenli bir yerde saklayın
3. **Limitler**: Ücretsiz hesapların kullanım limitleri vardır
4. **Yenileme**: API anahtarlarınızı düzenli olarak yenileyin

## Hızlı Test

API anahtarlarınızı test etmek için:
1. Her iki .env dosyasını da doldurun
2. Backend'i yeniden başlatın: `cd backend && npm start`
3. Frontend'i yeniden başlatın: `npm run dev`
4. Uygulamada bir masal oluşturmayı deneyin
5. Seslendirme butonuna tıklayın

Başarılı olursa API anahtarlarınız doğru çalışıyor demektir!