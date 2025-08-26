# 🚀 Feature Proposals - Bedtime Stories App

Bu dokümanda, Bedtime Stories App için önerilen yeni özellikler ve geliştirmeler yer almaktadır. Özellikler temel düzeyde tutulmuş olup, kullanıcı deneyimini iyileştirmeye odaklanmaktadır.

## 📋 Mevcut Özellikler Özeti

✅ **Mevcut Özellikler:**
- AI Masal Üretimi (OpenAI GPT-4)
- Ses Sentezi (ElevenLabs TTS)
- Mobil Uyumlu Arayüz (React + TailwindCSS)
- Yerel Veritabanı (SQLite)
- Ses Oynatma (Web ve Pi üzerinde)
- Performans İzleme
- Favori Masallar
- Masal Geçmişi
- Paylaşım Sistemi
- Analitik Dashboard
- Kuyruk Sistemi
- Çoklu Ses Seçenekleri
- Yaş Uyumlu İçerik (3-12 yaş)
- Özel Konular

## 🎯 Önerilen Yeni Özellikler

### 1. **Masal Kategorileri/Etiketleme Sistemi**
**Öncelik:** Yüksek
**Zorluk:** Orta
**Tahmini Süre:** 2-3 gün

**Özellikler:**
- Masalları kategorilere ayırma (macera, eğitici, uyku, fantastik, vb.)
- Etiket bazlı filtreleme sistemi
- Kategori bazlı arama ve listeleme
- Otomatik kategori önerisi (AI tabanlı)

**Teknik Detaylar:**
- Database'e `categories` ve `story_categories` tabloları eklenmesi
- Frontend'de kategori seçici component
- Filtreleme API endpoint'leri

### 2. **Basit Arama Fonksiyonu**
**Öncelik:** Yüksek
**Zorluk:** Kolay
**Tahmini Süre:** 1-2 gün

**Özellikler:**
- Masal başlığında arama
- İçerikte tam metin arama
- Karakter isimlerine göre arama
- Arama geçmişi
- Arama önerileri

**Teknik Detaylar:**
- SQLite FTS (Full Text Search) kullanımı
- Debounced search input component
- Search API endpoint'i

### 3. **Masal Düzenleme**
**Öncelik:** Orta
**Zorluk:** Orta
**Tahmini Süre:** 2-3 gün

**Özellikler:**
- Oluşturulan masalları düzenleme
- Başlık değiştirme
- İçerik düzeltme ve güncelleme
- Düzenleme geçmişi
- Geri alma/ileri alma

**Teknik Detaylar:**
- Story edit modal component
- Version control sistemi
- Update API endpoint'leri

### 4. **Daha İyi Ses Kontrolleri**
**Öncelik:** Orta
**Zorluk:** Kolay
**Tahmini Süre:** 1-2 gün

**Özellikler:**
- Ses hızı ayarı (0.5x - 2x)
- Ses tonu ayarı
- Otomatik duraklama noktaları
- Ses efektleri (isteğe bağlı)
- Gelişmiş ses kontrolü UI

**Teknik Detaylar:**
- Audio player component geliştirmesi
- TTS API parametrelerinin genişletilmesi

### 5. **Basit Tema Sistemi**
**Öncelik:** Düşük
**Zorluk:** Kolay
**Tahmini Süre:** 1 gün

**Özellikler:**
- Gece/Gündüz modu
- Çocuk dostu renkli temalar
- Büyük yazı tipi seçeneği
- Yüksek kontrast modu
- Tema tercihi kaydetme

**Teknik Detaylar:**
- CSS custom properties kullanımı
- Theme context provider
- LocalStorage'da tema tercihi

### 6. **Masal Seri Desteği**
**Öncelik:** Orta
**Zorluk:** Yüksek
**Tahmini Süre:** 3-4 gün

**Özellikler:**
- Aynı karakterlerle devam masalları
- Seri takibi ve bağlantıları
- Karakter tutarlılığı
- Seri özeti ve timeline
- Otomatik seri önerisi

**Teknik Detaylar:**
- Series tablosu ve ilişkiler
- Character consistency AI prompting
- Series management UI

### 7. **Basit Yedekleme/Geri Yükleme**
**Öncelik:** Düşük
**Zorluk:** Orta
**Tahmini Süre:** 2 gün

**Özellikler:**
- Masalları dışa aktarma (JSON/PDF)
- Yedekten geri yükleme
- Otomatik yedekleme (günlük/haftalık)
- Cloud storage entegrasyonu (isteğe bağlı)

**Teknik Detaylar:**
- Export/Import API endpoints
- File handling utilities
- Scheduled backup jobs

### 8. **Çocuk Profilleri**
**Öncelik:** Yüksek
**Zorluk:** Yüksek
**Tahmini Süre:** 4-5 gün

**Özellikler:**
- Birden fazla çocuk için ayrı profiller
- Yaş ve tercih kaydetme
- Kişiselleştirilmiş öneriler
- Profil bazlı istatistikler
- Ebeveyn kontrol paneli

**Teknik Detaylar:**
- User profiles tablosu
- Profile-based story filtering
- Personalization algorithms
- Profile management UI

## 🎯 Uygulama Öncelik Sırası

1. **Arama Fonksiyonu** (1-2 gün) - Hemen kullanılabilir fayda
2. **Kategorileme Sistemi** (2-3 gün) - Organizasyon için kritik
3. **Çocuk Profilleri** (4-5 gün) - Kişiselleştirme için önemli
4. **Masal Düzenleme** (2-3 gün) - Kullanıcı kontrolü
5. **Ses Kontrolleri** (1-2 gün) - Deneyim iyileştirmesi
6. **Masal Seri Desteği** (3-4 gün) - İleri seviye özellik
7. **Tema Sistemi** (1 gün) - Görsel iyileştirme
8. **Yedekleme Sistemi** (2 gün) - Güvenlik özelliği

## 📊 Toplam Tahmini Süre
**Minimum:** 16-21 gün
**Maksimum:** 20-26 gün

## 🔧 Teknik Notlar

- Tüm özellikler mevcut teknoloji stack'i ile uyumlu
- Raspberry Pi Zero 2W performansı göz önünde bulundurulmalı
- Mobile-first yaklaşım korunmalı
- Backward compatibility sağlanmalı
- Test coverage artırılmalı

## 📝 Sonraki Adımlar

1. Özellik önceliklerini belirleme
2. Detaylı teknik tasarım dökümanları
3. Database migration planları
4. UI/UX mockup'ları
5. Test stratejileri

---

**Son Güncelleme:** 26 Ağustos 2025
**Hazırlayan:** AI Assistant (Augment Agent)
