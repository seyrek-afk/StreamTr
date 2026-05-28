---
name: Rezilyans
description: Yazılım geliştirme projelerinin üretime almadan önce yapılacak kontrolleri ve rezilyans standartlarını içerir. Projenin ilk geliştirme aşamasında bu kurallar okunarak ona göre geliştirme sağlanır. Uygulamanın erişilebilirlik ve perofrmans değerleri için bu md dosyası kullanılır. Bu dosya kullanılarak geliştirmenin üretim geçişi öncesi rezilyans kontrolleri sağlanır.
---
# Reziyans standartları
kullanıcı yeni bir yazılım projesi yazman istediğinde bu standartlara göre yazılmasını sağla ve geçiş öncesi kontrollerde bu akışa göre kontrol sağla.


## 1. Dış Bağımlılıklar ve Risk Haritası

| Bağımlılık | Başarısızlık Etkisi | Öncelik |
|------------|---------------------|---------|
| Anthropic Claude API (`/v1/messages`) | Hiçbir içerik yüklenemez | KRİTİK |
| Claude web_search aracı | JSON dönemez, boş liste | KRİTİK |
| TMDB görsel CDN (`image.tmdb.org`) | Posterler ve oyuncu fotoğrafları yüklenemez | ORTA |
| Google Fonts CDN | Font yüklenemez, fallback system-ui devreye girer | DÜŞÜK |

---

## 2. Retry (Yeniden Deneme) — Frontend

**Mevcut durum:** Her sekme için manuel "Yeniden Dene" butonu mevcut (`retry(tab)` fonksiyonu).

**İyileştirme önerisi:**
```js
// useStreamData içinde otomatik retry (üstel geri çekilme)
const retryConfig = {
  maxAttempts: 3,
  delays: [1000, 2000, 4000],   // ms cinsinden: 1s → 2s → 4s
  retryOn: [429, 500, 502, 503, 504],
}
```

**Kural:** `4xx` hataları (401, 403, 422) retry yapılmaz — client hatasıdır.

---

## 3. Timeout — API Çağrıları

Mevcut `fetch` çağrılarına `AbortController` ile timeout eklenmeli:

```js
// Örnek uygulama — useStreamData ve useSearch içinde
const controller = new AbortController()
const timeoutId  = setTimeout(() => controller.abort(), 30_000) // 30 saniye

const res = await fetch(url, { signal: controller.signal, ...options })
clearTimeout(timeoutId)
```

| API Çağrısı | Timeout |
|-------------|---------|
| Sekme verisi (diziler/filmler/trend) | 30 saniye |
| Arama öneri (suggest) | 10 saniye |
| Arama detay (detail) | 25 saniye |
| Daha Çok Göster (fetchMore) | 30 saniye |

---

## 4. Fallback (Geri Dönüş)

### API başarısız olursa
- Hata banner'ı gösterilir (kırmızı uyarı, "Yeniden Dene" butonu)
- Daha önce yüklenmiş veri varsa korunur, üzerine yazılmaz
- **Altın kural:** Uygulama hiçbir koşulda boş beyaz sayfa göstermemeli

### TMDB görseli yüklenemezse
- `PosterImg` bileşeni degraded renk gradyanı ile fallback gösterir — zaten uygulandı
- Oyuncu fotoğrafı yüklenemezse `User` ikonu gösterilir — zaten uygulandı

### Font yüklenemezse
- `system-ui, -apple-system, sans-serif` fallback zinciri tanımlı — zaten uygulandı

---

## 5. Cache Stratejisi (Frontend localStorage)

| Veri | Cache Süresi | Katman |
|------|-------------|--------|
| Seçili tema | Kalıcı | localStorage (`streamtr-theme`) |
| Sekme içeriği | Oturum (sayfa yenilene kadar) | React state (useRef guard) |

**Gelişmiş öneri:**
```js
// Sekme verilerini sessionStorage'a cache'le (maksimum 24 saat)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const cacheKey     = `streamtr-cache-${tab}`
const cached       = sessionStorage.getItem(cacheKey)
if (cached) {
  const { data, ts } = JSON.parse(cached)
  if (Date.now() - ts < CACHE_TTL_MS) return data
}
```

---

## 6. Graceful Degradation (Kademeli Bozulma)

| Senaryo | Beklenen Davranış |
|---------|-------------------|
| Claude API erişilemez | Hata banner + Yeniden Dene butonu, mevcut veri korunur |
| web_search aracı yanıt vermez | API kendi bilgisinden JSON üretir, uyarı yok |
| TMDB CDN erişilemez | Gradient fallback poster gösterilir |
| Arama önerileri gelmiyor | Input çalışmaya devam eder, dropdown gösterilmez |
| fetchMore başarısız | Mevcut liste korunur, sessiz hata kaydedilir |

---

## 7. Rate Limiting Koruması

Claude API `429 Too Many Requests` döndürebilir. Önlemler:

- **Arama debounce:** 420ms bekler, her tuş basışında API çağrısı yapılmaz
- **Sekme önbelleği:** `loadedRef` ile aynı sekme iki kez yüklenmez
- **fetchMore koşulu:** Limit (100 öğe) aşıldığında API çağrısı yapılmaz

---

## 8. Hata İzleme (Client-Side)

**Minimum loglama (konsola):**
```js
// useSearch.js — sessiz hata
console.warn('fetchMore hatası:', err.message)

// Önerilmez: stack trace veya API key içeren detaylar loglanmamalı
```

**Üretim için öneri:** Sentry SDK entegrasyonu ile `captureException` kullanımı.

---

## 9. Yapılacaklar

- [ ] `fetch` çağrılarına `AbortController` ile timeout eklenmeli
- [ ] Otomatik retry (üstel geri çekilme, maks 3 deneme)
- [ ] `sessionStorage` ile sekme verisi cache'i (TTL: 24 saat)
- [ ] Sentry ile client-side hata izleme
- [ ] API çağrısı sonuçlarını `performance.mark` ile ölçme (p50/p95)

## 9. Raporlama
rezilyans kuralalrına göre kodu değerlendirdikten sonra bir rezilyans score oluştur. Bu skorun yorumunu da oluştur. Kritik bulgularda "Kod üreitme alınamaz" kategorisi olsun. Düzeltilebilir ve göz ardı edilebilir durumlar için "Şartlı üretim izni" grubunu kullan. Proje herşeyi ile uyumlu ise "Üretime geçebilir" diye grupla.