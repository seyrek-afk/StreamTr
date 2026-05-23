# StreamTR — Güvenlik Kılavuzu

> Bu doküman, StreamTR web uygulamasının güvenli geliştirilmesi için uyulması gereken kuralları tanımlar.  
> Uygulama tamamen tarayıcıda (client-side) çalışır; backend sunucu yoktur.

---

## 1. Temel Güvenlik İlkeleri

1. **Kodda sır olmaz.** API anahtarı, token — hiçbiri `.jsx`, `.js`, `.ts` dosyalarında sabit olarak yer almaz.
2. **Kullanıcı girdisi temizlenir.** Arama kutusundan gelen metin doğrudan DOM'a yazılmaz.
3. **Güvenli olmayan protokol kullanılmaz.** TMDB görselleri HTTPS üzerinden çekilir.
4. **Üçüncü taraf kaynak minimumu.** Yalnızca Google Fonts ve TMDB CDN kullanılır.

---

## 2. API Anahtarı Yönetimi — KRİTİK

### Mevcut Durum
Anthropic API, tarayıcıdan doğrudan `https://api.anthropic.com/v1/messages` adresine çağrılmaktadır. Bu yaklaşım **üretim ortamı için güvensizdir** çünkü:
- API anahtarı tarayıcı network geçmişinde görünür
- Herhangi bir kullanıcı anahtarı çalabilir ve kota tüketebilir

### Doğru Yaklaşım (Üretim)
```
Tarayıcı → /api/proxy (kendi sunucu) → Anthropic API
```

```js
// ❌ MEVCUT — üretim için güvensiz
fetch('https://api.anthropic.com/v1/messages', {
  headers: { 'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY }
})

// ✅ ÜRETİM İÇİN DOĞRU — backend proxy
fetch('/api/stream', { method: 'POST', body: JSON.stringify(payload) })
// Sunucu tarafında: process.env.ANTHROPIC_KEY ile istek yapılır
```

### Geçici Çözüm (Geliştirme)
```env
# .env (gitignore'da olmalı)
VITE_ANTHROPIC_KEY=sk-ant-...
```

```js
// useStreamData.js ve useSearch.js içinde
headers: {
  'Content-Type': 'application/json',
  'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
}
```

---

## 3. Ortam Değişkenleri

```bash
# .env — asla git'e commit edilmez
VITE_ANTHROPIC_KEY=sk-ant-api03-...

# .env.example — commit edilir, gerçek değer içermez
VITE_ANTHROPIC_KEY=your-anthropic-api-key-here
```

- [ ] `.env` dosyası `.gitignore`'a eklenmiş olmalı
- [ ] `.env.example` dosyası oluşturulmalı
- [ ] CI/CD ortamında secret store kullanılmalı (GitHub Secrets vb.)

---

## 4. XSS Koruması

### React Zaten Korur
React, JSX içindeki tüm değerleri otomatik olarak escape eder. `dangerouslySetInnerHTML` kullanılmadığı sürece XSS riski minimumdur.

### Kontrol Listesi
- [ ] `dangerouslySetInnerHTML` kullanılmıyor (ve kullanılmamalı)
- [ ] `eval()` kullanılmıyor
- [ ] API'den gelen JSON değerleri doğrudan DOM'a HTML olarak yazılmıyor
- [ ] Arama girdisi `sanitize` edilmiş olarak API'ye gönderiliyor:

```js
// useSearch.js — güvenli input temizleme
const safeQuery = query.trim().slice(0, 200) // uzunluk sınırı
```

---

## 5. Content Security Policy (CSP)

Üretim ortamında `index.html` veya sunucu header'larına eklenmeli:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
  font-src https://fonts.gstatic.com;
  img-src 'self' https://image.tmdb.org data:;
  connect-src 'self' https://api.anthropic.com;
">
```

**Neden `unsafe-inline` style için?** React'in inline style prop'ları nedeniyle zorunlu.

---

## 6. HTTPS ve Harici Kaynaklar

- [ ] Üretimde tüm trafik HTTPS (TLS 1.2+)
- [ ] TMDB görselleri `https://image.tmdb.org` — zaten HTTPS
- [ ] Google Fonts `https://fonts.googleapis.com` — zaten HTTPS
- [ ] Anthropic API `https://api.anthropic.com` — zaten HTTPS
- [ ] Mixed content yok: HTTP sayfada HTTP kaynağı çekilmiyor

---

## 7. Bağımlılık Güvenliği

```bash
# Düzenli olarak çalıştırılmalı
npm audit
npm audit fix
```

- [ ] `package-lock.json` commit edilmeli (lock file)
- [ ] Gereksiz bağımlılık eklenmemeli
- [ ] `node_modules` `.gitignore`'da olmalı

---

## 8. localStorage Güvenliği

Şu anda yalnızca tema tercihi (`streamtr-theme`) saklanmaktadır:

```js
// ✅ Güvenli — sadece tema ID string'i
localStorage.setItem('streamtr-theme', themeId) // "cinema", "netflix" gibi

// ❌ ASLA yapılmamalı
localStorage.setItem('api-key', apiKey)
localStorage.setItem('user-token', token)
```

---

## 9. Girdi Doğrulama

```js
// Arama girdisi güvenlik kontrolleri
function sanitizeSearchQuery(raw) {
  return raw
    .trim()
    .slice(0, 200)            // maksimum uzunluk
    .replace(/[<>'"]/g, '')   // temel HTML/script karakterleri temizle
}
```

---

## 10. Yapılacaklar

- [ ] `.env` + `.env.example` dosyaları oluşturulmalı
- [ ] API key `import.meta.env.VITE_ANTHROPIC_KEY` ile okunmalı (hardcode yasak)
- [ ] Üretim için backend proxy mimarisi kurulmalı
- [ ] CSP header'ı eklenmeli
- [ ] `npm audit` CI pipeline'ına eklenmeli
- [ ] Girdi uzunluk sınırları uygulanmalı (arama kutusu `maxLength` attribute)
