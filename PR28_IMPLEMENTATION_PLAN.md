## PR #28 (stt-trials) Performans & Hata Düzeltme Uygulama Planı

Odağımız: Güvenlik ve artık/depreke edilmiş özellik geri ekleme taleplerini hariç tutarak; çalışma zamanı hataları, performans / kaynak kullanımı, tutarlılık, bakım kolaylığı ve ölçülebilir kaliteyi artıran değişiklikler.

### Özet
Aktif PR yorumları incelendi. Aşağıdaki başlıklarda (1) doğrudan runtime hatası, (2) potansiyel bellek / kaynak sızıntısı, (3) tutarsız API / model adı, (4) yinelenen / kopyalanmış kod, (5) ölçüm & metrik hesaplama hatası, (6) tip / platform uyumluluğu, (7) küçük ama semantik/okunabilirlik düzeltmeleri saptandı. Plan; yüksek → orta → düşük etki sırasıyla uygulanacak ve her adım test senaryolarıyla doğrulanacak.

---
## 1. Önceliklendirilmiş Madde Listesi

### 1.1 Yüksek Etki (Önce Ele Alınmalı)
| ID | Başlık | Etki | Dosya(lar) | Kısa Açıklama | Kabul Kriteri |
|----|--------|------|------------|---------------|---------------|
| H1 | Eksik `audioBuffer` alanı | Runtime crash riski | `src/services/wakeWordDetector.ts` | Referans var, tanım yok | Dosya açıldığında derleme & çalışma zamanı hatası yok, wake word akışı çalışır |
| H2 | Yanlış OpenAI endpoint & model placeholder | Batch endpoint başarısız | `backend/server.ts` | `responses` + `gpt-5-mini` yerine doğru endpoint/model | Batch ve tekil uç nokta aynı modelle başarılı yanıt döner |
| H3 | Batch endpoint kod tekrarları | Bakım maliyeti + hata riski | `backend/server.ts` | Tekil ve batch mantığı ortak helper fonksiyonlara ayrılır | Tekil & batch isteklerindeki yanıtlar tutarlı, testler yeşil |
| H4 | Event listener temizliği yok (memory leak) | Uzun oturumda bellek şişmesi | `src/services/powerManager.ts` | Kaynak yönetimi eksik | Dinamik eklenen tüm dinleyiciler `cleanup()` ile kalkar, profiler’da sızıntı yok |
| H5 | Yanlış / eksik transcription field guard | Null alanlarda UI kırılması | (STT entegrasyonu – backend veya dokümandaki örnek kod blokları) | `response.data` alanları yoksa güvenli varsayılan | STT yanıtı eksik alanla geldiğinde 200 + boş ama tip güvenli payload |
| H6 | `gc()` korumasız çağrı | Referans hatası | (İlgili cleanup fonksiyonu) | `global.gc?.()` kullanımı | Node `--expose-gc` olmadan hata oluşmaz |
| H7 | Recovery oranı hep 0 | Yanlış metrik & izleme | `src/services/errorRecoveryManager.ts` | Başarılı kurtarma sayacı artırılmıyor | Kurtarma senaryosu testinde >0 oran hesaplanır |
| H8 | Adaptive buffering toggle yanıt vermiyor | Gereksiz CPU / çalışmayan optimizasyon | `src/services/audioBufferManager.ts` | Flag değişince timer başlat/bitir | Toggle testinde interval çalışır/durur |
| H9 | Buffer overflow sonrası metrik güncellenmiyor | Yanlış izleme / tuning | `src/services/audioBufferManager.ts` | Silinen veri memoryUsage & currentSize’a yansır | Overflow testinde metrikler düşer |

### 1.2 Orta Etki
| ID | Başlık | Etki | Dosya(lar) | Kısa Açıklama | Kabul Kriteri |
|----|--------|------|------------|---------------|---------------|
| M1 | `piZeroOptimizer.getSystemStatus()` muhafazası | Olası runtime hata | `src/services/systemIntegrationManager.ts` | Opsiyonel zincir / typeof kontrol | Yoksa null döner, hata atmaz |
| M2 | Model adı tutarsızlığı | Konfigürasyon şaşkınlığı | Çoklu (kod + doküman) | `gpt-5-mini` artık yok → `gpt-4o-mini-transcribe` standardı | Arama çıktısı yalnızca seçilen model adını içerir |
| M3 | PowerManager singleton antipattern | Lint & sezgisel olmayan | `src/services/powerManager.ts` | Constructor return → private + `getInstance()` | Biome lint hatası giderilir |
| M4 | ErrorRecoveryManager singleton düzeni | Yukarıdaki ile aynı | `src/services/errorRecoveryManager.ts` | Aynı düzen | Lint hatası yok |
| M5 | Timer tipleri (NodeJS.Timeout) | Tarayıcı derleme uyarısı | `powerManager.ts`, diğer ilgili | `ReturnType<typeof setTimeout>` | TS build her iki ortamda temiz |
| M6 | `audioLength === 10` boşta kalıyor | Mantık boşluğu | `docs/STT-Services-Comparison.md` (örnek kod) | `<=` / `else` ile kapsama | Test pseudo-case'te doğru branch |
| M7 | Nullish coalescing (`count ??`) | 0 değeri yanlış override | `audioBufferManager.ts` | `||` yerine `??` | 0 geçildiğinde 0 korunur |
| M8 | Buffer overflow kaldırılan miktar min 1 | Stabil davranış | `audioBufferManager.ts` | `Math.max(1, …)` | Tek öğeli taşmada infinite loop yok |
| M9 | Paylaşım base URL esnekliği | Ortam uyumu | `src/services/sharingService.ts` | Env yoksa relative path | Geliştirme & prod URL’leri çalışır |
| M10 | STT FormData kullanımı tutarlı | Upload başarısızlıklarını önler | Backend STT route | `form-data` veya native seç ve tutarlı kullan | 415/400 boundary hatası yok |

### 1.3 Düşük Etki / Kozmetik
| ID | Başlık | Etki | Dosya(lar) | Kısa Açıklama | Kabul Kriteri |
|----|--------|------|------------|---------------|---------------|
| L1 | `switchToPowerMode` isim / konsolidasyon | API tutarlılığı | `powerManager.ts` | `setMode` + force param birleşimi | Eski çağrılar adapt (gerekirse alias) |
| L2 | `(globalThis as any)` kaldırma | Tip güvenliği | `vite.config.ts` | Process env parsing fonksiyonlaştırma | Build type hatası yok |
| L3 | APP / endpoint doküman uyumu | Onboarding kolaylığı | İlgili dokümanlar | Doküman kodla aynı | İnceleme: Fark bulunmaz |

---
## 2. Teknik Uygulama Ayrıntıları

### 2.1 Refactor / Helper Önerileri
**Batch & Tekil LLM / TTS Çağrıları**
Backend’de ortak fonksiyon taslağı:
```ts
async function generateStory(prompt: string, options: { model: string; temperature?: number }) { /* ortak OpenAI çağrısı */ }
async function synthesizeAudio(text: string, voice: string) { /* ortak TTS çağrısı */ }
```
Batch endpointleri: giriş listesi map + `Promise.allSettled` ile; kısmi hata > 207 çoklu durum JSON formatı.

### 2.2 PowerManager İyileştirme
Birleştirilmiş API:
```ts
setMode(mode: PowerState['mode'], opts?: { source?: string; durationMs?: number; force?: boolean })
```
`forcePowerMode` kodu içine taşınır; opsiyonel revert timer referansı `forceRevertTimer` tutulur ve `cleanup` içinde temizlenir.

### 2.3 Event Listener Yönetimi
Sınıf alanları:
```ts
private readonly activityEvents = [...];
private readonly boundActivityHandler = () => this.recordActivity();
```
`setupActivityTracking()` ekler, `cleanup()` remove eder. Jest/jsdom testi: add → cleanup sonrası handler çağrısı gerçekleşmemeli.

### 2.4 Error / Recovery Metrikleri
Alan ekle `recoveredCount` & güncelle `recoveryRate = recoveredCount / errorHistory.length`. Unit test: 3 hatadan 2’si recovered → %66 ±1 doğrulama.

### 2.5 Adaptive Buffering Toggle
`updateConfig()` içinde eski/yeni karşılaştır. Timer state transition test: toggle on → interval sayısı artar; toggle off → temizlenir.

### 2.6 Audio Buffer Overflow Metrikleri
Overflow sonrası:
```ts
const removed = buffer.splice(0, n);
metrics.currentSize = buffer.length;
metrics.memoryUsage -= sum(removed.byteLength);
```
Test: Yapay buffer doldur → overflow tetikle → memoryUsage düşer.

### 2.7 STT Yanıt Güvenliği
Guard pattern:
```ts
const { text='', language='und', duration=null, segments } = response.data ?? {};
res.json({ text, language, duration, segments: Array.isArray(segments)?segments:[], model });
```
Test: Mock eksik alanlı yanıt ile 200 JSON.

### 2.8 FormData Tutarlılığı
Seçenek A: `import FormData from 'form-data'` (Node 18 uyumu)
Seçenek B: Native `fetch` + global `FormData`; boundary otomatik.
Karar: Optimize bağımlılık için **B** (Node ≥18 varsayımı) → `axios` yerine `fetch` geçişi orta vadeli (opsiyonel). İlk aşamada yalnız header/`getHeaders()` uyumsuzluğu kaldırılacak.

### 2.9 Model Adı Standardizasyonu
Arama / kontrol script (dev tool):
```
rg -n "gpt-5-mini" && rg -n "gpt-4o-mini-transcribe"
```
Tüm `gpt-5-mini` → `gpt-4o-mini-transcribe`. Doküman bölümleri güncellendikten sonra yeniden arama 0 sonuç.

### 2.10 Nullish Coalescing Kullanımı
`requestedCount = count ?? Math.min(buffer.length, 1)`; test: count=0 iken 0 korunur.

### 2.11 System Integration Guard
```ts
piZeroStats: (this.piZeroOptimizer && typeof this.piZeroOptimizer.getSystemStatus==='function')
  ? this.piZeroOptimizer.getSystemStatus() : null
```

---
## 3. Test Stratejisi

| Kategori | Test Tipi | Örnek Senaryo |
|----------|-----------|---------------|
| Runtime Crash | Unit | Eksik `audioBuffer` eklenmesi sonrası wake word init çalışır |
| Refactor | Unit | PowerManager `setMode` zaman aşımı revert testi |
| Memory | Integration (jsdom) | Event listener ekle → cleanup → handler çağrısı yok |
| Metrics | Unit | RecoveryManager 2/3 recovery → oran > 0 |
| Buffer | Unit | Overflow simülasyonunda memoryUsage azalır |
| STT | Integration (mock HTTP) | Eksik alanlı STT response → default değerler |
| Batch | Integration | 5 story batch → tamamı/partial başarısız; kısmi hata formatı |
| Model Consistency | Script test | Arama sonucu yalnız canonical model |
| Adaptive Toggle | Unit | Flag off → interval clear |

Ek: Snapshot testleri eklenmeyecek (hız için). Her yeni helper fonksiyon için minimal happy + edge case.

---
## 4. Metrikler & İzleme
| Metrik | Amaç | Toplama Noktası |
|--------|------|-----------------|
| Avg batch story süre (ms) | Performans | Batch helper wrap süresi ölçümü |
| Buffer overrun/underrun oranı | Audio tuning | `AudioBufferManager` metrik alanları |
| Recovery success rate | Dayanıklılık | ErrorRecoveryManager yeni oran |
| STT success/timeout oranı | STT kalite | STT route log + baseline |
| Power mode değişim sayısı / saat | Enerji optimizasyon | PowerManager logları |

---
## 5. Riskler & Azaltma
| Risk | Etki | Azaltma |
|------|------|---------|
| Refactor’da batch ve tekil API davranış farkı | İstemciler bozulur | Önce karakteristik yanıt snapshot (örnek 3 prompt) al, sonra diff kontrol |
| Singleton değişiminde eski importlar | Derleme hatası | Geçici `export const powerManager = PowerManager.getInstance();` alias (1 sürüm) |
| Buffer metrik güncellemesi yanlış hesap | Tuning hatalı | Jest’te kontrollü byte length ile deterministik test |
| Model adı toplu değiştirme yanlışlıkla farklı stringleri yakalar | Yan etki | Regex netleştir: `\b(gpt-5-mini)\b`; manuel diff gözden geçirme |

---
## 6. Uygulama Sıralı Yol Haritası
1. (H1,H2,H6) – Kritik runtime / endpoint düzeltmeleri
2. (H3) – Batch refactor (helper çıkarma)
3. (H4,H8,H9) – Kaynak & buffer yönetimi
4. (H7) – Recovery metrik düzeltmesi
5. (M2,M10) – Model adı & FormData tutarlılığı
6. (M1,M3,M4,M5) – Guard + Singleton refactor + tip uyumu
7. (M7,M8,L2,L1) – Küçük semantik düzenler
8. (Belge uyumu) – Kod tamamlandıktan sonra doküman güncelleme (tek commit)
9. Test & ölçüm ekleme commit’i
10. Son doğrulama: Arama komutları, lint, test.

Tahmini: 3 odaklı commit dalgası (runtime, refactor, cleanup) + 1 dokümantasyon + 1 test.

---
## 7. Kabul Kriterleri Kontrol Listesi
- [ ] Tüm yüksek etki maddeler karşılandı
- [ ] `rg -n "gpt-5-mini"` sıfır sonuç
- [ ] Lint & test yeşil (jest + type check)
- [ ] Batch ve tekil endpoint sonuç yapısı uyumlu (örnek JSON diff ≤ alan sırası hariç)
- [ ] Bellek / listener leak testi geçer
- [ ] Recovery metrik testi >0 oran veriyor
- [ ] Adaptive buffering toggle testi geçer

---
## 8. İzleme Sonrası (Opsiyonel İyileştirmeler)
| Öneri | Gerekçe |
|-------|---------|
| Native `fetch` + AbortController ile axios aşamalı bırakma | Bağımlılık azaltma & streaming kolaylaştırma |
| Central metrics exporter (prom-client veya hafif adaptör) | Tutarlı ölçüm / gözlenebilirlik (güvenlik dışı) |
| PowerManager profile auto-tuning (kısa etkileşim patternden) | Enerji verimliliği |
| Story generation concurrency pool | API burst yönetimi & hız |

---
## 9. Notlar
- Güvenlik / izin / host kontrolü ve eski enterprise izleme katmanı kapsam dışı bırakılmıştır (istek gereği).
- Plan, incremental merge kolaylığı için mantıksal parçalara ayrılmıştır.

---
Hazırlayan: Otomatik PR Analiz Asistanı
Tarih: 2025-09-04
