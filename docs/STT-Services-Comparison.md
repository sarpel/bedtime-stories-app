# STT (Speech-to-Text) Services Comparison for Bedtime Stories App

_Bu doküman, Raspberry Pi Zero 2W üzerinde çalışan masallar uygulaması için STT servis seçeneklerini karşılaştırır._

## 🎯 Proje Gereksinimleri

- **Donanım**: Raspberry Pi Zero 2W (512MB RAM)
- **Kullanım Durumu**: Çocuklar ve velilerin doğal dilde masal isteyebilmesi
- **Dil Desteği**: Türkçe birincil, İngilizce ikincil
- **Beklenen Kullanım**: Günde 10-50 konuşma (~30 saniye ortalama)
- **Aylık Tahmini**: ~500-2500 dakika
- **Gerçek Zamanlı**: Streaming STT önerilen (daha iyi UX)
- **Bütçe**: Düşük maliyet odaklı

## 📊 STT Servisleri Karşılaştırması

### 1. **OpenAI Whisper API** ⭐ **En Uygun**

- **Fiyatlandırma**: $0.006/dakika
- **Aylık Maliyet**: ~$3-15 (500-2500 dakika)
- **Dil Desteği**: 99+ dil (Türkçe mükemmel)
- **Gerçek Zamanlı**: Hayır (dosya yükleme)
- **Doğruluk**: Çok yüksek (%95+)
- **Avantajları**:
  - Türkçe için mükemmel doğruluk
  - Çok uygun fiyat
  - Basit entegrasyon
  - OpenAI ekosisteminde zaten var
- **Dezavantajları**:
  - Gerçek zamanlı değil (2-5 saniye gecikme)
  - Dosya boyutu limiti (25MB)

### 2. **Deepgram Nova-3** ⭐ **Gerçek Zamanlı En İyi**

- **Fiyatlandırma**: $0.0043/dakika (streaming), $0.0036/dakika (batch)
- **Aylık Maliyet**: ~$2-11 (500-2500 dakika)
- **Dil Desteği**: 30+ dil (Türkçe destekleniyor)
- **Gerçek Zamanlı**: Evet (websocket)
- **Doğruluk**: Yüksek (%90-95%)
- **Avantajları**:
  - Gerçek zamanlı streaming
  - Çok hızlı (<300ms gecikme)
  - Competitive pricing
  - Kısmi transkript desteği
- **Dezavantajları**:
  - Türkçe doğruluğu Whisper'dan düşük
  - Daha karmaşık entegrasyon

### 3. **Google Cloud Speech-to-Text v2**

- **Fiyatlandırma**: $0.004/15 saniye (~$0.016/dakika)
- **Aylık Maliyet**: ~$8-40 (500-2500 dakika)
- **Dil Desteği**: 125+ dil (Türkçe mükemmel)
- **Gerçek Zamanlı**: Evet (streaming)
- **Doğruluk**: Çok yüksek (%95+)
- **Avantajları**:
  - Mükemmel Türkçe desteği
  - Streaming ve batch seçenekleri
  - Google Cloud ekosistemi
  - İlk 60 dakika ücretsiz/ay
- **Dezavantajları**:
  - Daha pahalı
  - 15 saniyelik bloklar (kısa konuşmalar için verimsiz)

### 4. **Microsoft Azure Speech-to-Text**

- **Fiyatlandırma**: $1/saat (~$0.017/dakika)
- **Aylık Maliyet**: ~$8.5-42.5 (500-2500 dakika)
- **Dil Desteği**: 85+ dil (Türkçe destekleniyor)
- **Gerçek Zamanlı**: Evet
- **Doğruluk**: Yüksek (%90-95%)
- **Avantajları**:
  - İyi Türkçe desteği
  - Saat başına faturalandırma
  - İlk 5 saat ücretsiz/ay
- **Dezavantajları**:
  - Pahalı (saat bazlı faturalandırma)
  - Kısa kullanımlar için verimsiz

### 5. **AssemblyAI Universal-2**

- **Fiyatlandırma**: $0.0062/dakika
- **Aylık Maliyet**: ~$3-15.5 (500-2500 dakika)
- **Dil Desteği**: İngilizce odaklı (Türkçe sınırlı)
- **Gerçek Zamanlı**: Evet
- **Doğruluk**: Çok yüksek (İngilizce için)
- **Avantajları**:
  - İngilizce için mükemmel
  - İyi streaming desteği
- **Dezavantajları**:
  - Türkçe desteği zayıf
  - Bizim kullanım durumu için uygun değil

### 6. **AWS Transcribe**

- **Fiyatlandırma**: $0.024/dakika (standard), $0.048/dakika (medical)
- **Aylık Maliyet**: ~$12-60 (500-2500 dakika)
- **Dil Desteği**: 31 dil (Türkçe destekleniyor)
- **Gerçek Zamanlı**: Evet (streaming)
- **Doğruluk**: İyi (%85-90%)
- **Avantajları**:
  - AWS ekosistemi entegrasyonu
  - İyi streaming desteği
- **Dezavantajları**:
  - En pahalı seçenek
  - Bizim bütçemiz için uygun değil

## 🏆 Önerilen Çözümler

### **Birincil Seçenek: OpenAI Whisper API**

- **Neden**: Maliyet-performans açısından en iyi
- **Kullanım Senaryosu**:
  - Sesli komutları kaydet (3-5 saniye buffer)
  - Whisper API'ye gönder
  - Transkripti işle ve yanıtla
- **Beklenen Gecikme**: 2-4 saniye (kabul edilebilir)
- **Aylık Maliyet**: $3-15

### **İkincil Seçenek: Deepgram Nova-3 (Streaming)**

- **Neden**: Gerçek zamanlı deneyim istenirsе
- **Kullanım Senaryosu**:
  - WebSocket bağlantısı ile canlı streaming
  - Kısmi sonuçlar alarak daha hızlı yanıt
- **Beklenen Gecikme**: <500ms
- **Aylık Maliyet**: $2-11

### **Hibrit Yaklaşım (Önerilen)**

```typescript
// Kısa komutlar için Deepgram (real-time)
if (audioLength < 10) {
  return await deepgramSTT(audio);
}

// Uzun açıklamalar için Whisper (daha doğru)
if (audioLength > 10) {
  return await whisperSTT(audio);
}
```

## 🛠️ Teknik Entegrasyon Notları

### OpenAI Whisper Entegrasyonu

```javascript
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: "whisper-1",
  language: "tr", // Türkçe optimizasyonu
  response_format: "json",
});
```

### Deepgram Entegrasyonu

```javascript
const connection = deepgram.listen.live({
  model: "nova-3",
  language: "tr",
  smart_format: true,
  interim_results: true,
});
```

## 💰 Maliyet Hesaplamaları

### Günlük 25 Konuşma (30s ortalama) = 12.5 dakika/gün

| Servis          | Dakika Başına | Günlük | Aylık |
| --------------- | ------------- | ------ | ----- |
| OpenAI Whisper  | $0.006        | $0.075 | $2.25 |
| Deepgram Nova-3 | $0.0043       | $0.054 | $1.62 |
| Google STT v2   | $0.016        | $0.20  | $6.00 |
| Azure STT       | $0.017        | $0.21  | $6.38 |

### Yoğun Kullanım: Günlük 100 Konuşma = 50 dakika/gün

| Servis          | Günlük | Aylık  |
| --------------- | ------ | ------ |
| OpenAI Whisper  | $0.30  | $9.00  |
| Deepgram Nova-3 | $0.22  | $6.45  |
| Google STT v2   | $0.80  | $24.00 |
| Azure STT       | $0.85  | $25.50 |

## 🔧 Raspberry Pi Zero 2W Optimizasyonları

### Audio Buffering Strategy

```javascript
// Optimized audio capture for Pi Zero 2W
const audioConfig = {
  sampleRate: 16000, // STT için optimize edilmiş
  channels: 1, // Mono, bandwidth tasarrufu
  bitDepth: 16, // Kalite/boyut dengesi
  bufferSize: 4096, // Pi Zero 2W için optimize
  format: "wav", // En uyumlu format
};
```

### Bandwidth Management

```javascript
// Audio compression before sending
const compressedAudio = await compressAudio(rawAudio, {
  quality: "medium", // Transkript kalitesi için yeterli
  targetSize: "100kb", // API limitleri için
});
```

## 📋 Karar Matrisi

| Kriter                    | Ağırlık | Whisper | Deepgram | Google | Azure |
| ------------------------- | ------- | ------- | -------- | ------ | ----- |
| **Maliyet**               | 30%     | 9/10    | 10/10    | 6/10   | 5/10  |
| **Türkçe Doğruluğu**      | 25%     | 10/10   | 7/10     | 9/10   | 7/10  |
| **Gerçek Zamanlı**        | 20%     | 3/10    | 10/10    | 8/10   | 8/10  |
| **Entegrasyon Kolaylığı** | 15%     | 9/10    | 7/10     | 8/10   | 7/10  |
| **Pi Zero Uyumluluğu**    | 10%     | 8/10    | 8/10     | 7/10   | 7/10  |

### **Toplam Skorlar**

1. **OpenAI Whisper**: 8.1/10 ⭐
2. **Deepgram Nova-3**: 8.0/10 ⭐
3. **Google STT v2**: 7.4/10
4. **Azure STT**: 6.7/10

## 🚀 Sonuç ve Öneriler

### **Başlangıç için: OpenAI Whisper**

- En uygun maliyet
- Mükemmel Türkçe desteği
- Mevcut OpenAI entegrasyonu kullanılabilir
- 2-4 saniye gecikme kabul edilebilir

### **Gelecek Geliştirmeler**

1. **Hibrit sistem**: Kısa komutlar için Deepgram, uzun konuşmalar için Whisper
2. **Offline fallback**: Raspberry Pi üzerinde hafif STT modeli
3. **Caching**: Sık kullanılan komutları önbelleğe al

### **Implementation Roadmap**

1. **Faz 1**: OpenAI Whisper entegrasyonu
2. **Faz 2**: Audio buffering ve compression
3. **Faz 3**: Deepgram streaming eklenmesi (isteğe bağlı)
4. **Faz 4**: Offline backup çözümü

---

_Bu analiz 2025 Ocak fiyatlarına göre hazırlanmıştır. Fiyatlar değişebilir._
