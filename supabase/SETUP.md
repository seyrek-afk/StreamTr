# StreamTR — Giriş & Cihazlar Arası Favoriler (Supabase Kurulumu)

StreamTR statik bir önyüzdür; giriş ve favorilerin DB'de saklanması için **Supabase**
(ücretsiz) kullanılır. Aşağıdaki adımlar tamamlanınca başlıkta **Giriş** düğmesi belirir.
Yapılandırma yapılmazsa uygulama eskisi gibi çalışır (giriş kapalı, favoriler localStorage'da).

## 1) Supabase projesi oluştur
1. https://supabase.com → **New project** (ücretsiz plan yeterli).
2. **Project Settings → API**:
   - **Project URL** → `.env` içine `VITE_SUPABASE_URL`
   - **anon public** anahtarı → `.env` içine `VITE_SUPABASE_ANON_KEY`

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```
> `anon` anahtarı herkese açıktır (gizli değildir); güvenliği RLS sağlar. `service_role`
> anahtarını ASLA önyüze koymayın.

## 2) Tabloyu ve güvenlik kurallarını oluştur
**SQL Editor**'a `supabase/schema.sql` dosyasının içeriğini yapıştırıp **Run** deyin.
Bu, `favorites` tablosunu ve Row Level Security politikalarını kurar (her kullanıcı yalnızca
kendi favorilerini görür).

## 3) E-posta ile giriş (tek kullanımlık kod)
1. **Authentication → Providers → Email** açık olmalı (varsayılan açıktır).
2. Uygulama 6 haneli **kod** kullanır. **Authentication → Email Templates → Magic Link**
   şablonuna kodu ekleyin (yoksa kullanıcı e-postadaki linke de tıklayıp girebilir):
   ```html
   <p>Giriş kodun: <b>{{ .Token }}</b></p>
   <p>veya bu linke tıkla: <a href="{{ .ConfirmationURL }}">Giriş yap</a></p>
   ```

## 4) Google ile giriş
1. **Google Cloud Console → APIs & Services → Credentials → OAuth client ID** (Web).
   - **Authorized redirect URI**: `https://xxxxxxxx.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Providers → Google**: oluşturulan **Client ID** ve
   **Client Secret**'i yapıştırıp etkinleştirin.

## 5) URL ayarları (yönlendirme)
**Authentication → URL Configuration**:
- **Site URL**: üretim adresiniz (yoksa `http://localhost:3001`)
- **Redirect URLs** listesine ekleyin:
  - `http://localhost:3001` (yerel geliştirme — `vite.config.js` portu 3001)
  - üretim adresiniz (ör. `https://streamtr.example.com`)

## 6) Çalıştır
```bash
npm run dev
```
Başlıktaki **Giriş** düğmesi görünür. Girişte, o ana kadar localStorage'da biriken favoriler
otomatik olarak hesaba taşınır; sonrasında favoriler tüm cihazlarda senkron olur.

---

# 7) "AI ile Ara" ucu (Edge Function)

`supabase/functions/ai-search` serbest Türkçe metni arama niyetine çevirir. **Bu adım
opsiyoneldir**: yapılmazsa "AI ile Ara" çalışmaya devam eder, yalnızca yerleşik
deterministik ayrıştırıcıyı kullanır ve panelde bunu söyler.

### Neden sunucu?
Anthropic anahtarı `VITE_*` olarak konulamaz — Vite bu değişkenleri build'e gömer ve
tarayıcıda görünür hâle getirir. Anahtar yalnız Supabase secret'ında durur.

### Neden giriş zorunlu?
Uç, **sizin ödediğiniz** API'ye vekillik eder. Açık bırakılsa faturayı herkes yazabilirdi.
Çağrı Supabase oturumuyla kimliklenir ve kişi başı günlük tavana bağlıdır.

### a) Kota tablosunu kur
`supabase/schema.sql` dosyasını **yeniden** çalıştırın (dosyanın sonuna `ai_search_usage`
tablosu ve `ai_search_consume` fonksiyonu eklendi; tüm ifadeler `if not exists` /
`create or replace` olduğu için tekrar çalıştırmak güvenlidir).

### b) Secret'ları gir
```bash
npx supabase login                       # tarayıcıda tek seferlik yetkilendirme
npx supabase link --project-ref <proje-ref>

npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# Opsiyonel ayarlar (varsayılanlar parantez içinde):
npx supabase secrets set ANTHROPIC_MODEL=claude-opus-5          # (claude-opus-5)
npx supabase secrets set AI_SEARCH_DAILY_QUOTA=20               # (20) kişi/gün
npx supabase secrets set AI_SEARCH_ALLOWED_ORIGINS=https://streamtr.onrender.com,http://localhost:3001
```
> `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` edge function ortamına Supabase
> tarafından otomatik verilir — elle girilmez.

### c) Fonksiyonu yayına al
```bash
npx supabase functions deploy ai-search
```

### d) Doğrula
Siteye girip **AI ile Ara** ile serbest bir cümle yazın. Rozetlerin yanında **AI** etiketi
görünüyorsa uç çalışıyor demektir; bir uyarı satırı çıkıyorsa sebebi orada yazar
(giriş yok / kota doldu / uç yapılandırılmamış).

### Maliyet
Her arama tek bir kısa model çağrısıdır (düşük efor, ~2K token). Günlük tavan kişi
başınadır; `AI_SEARCH_DAILY_QUOTA` ile değiştirilir. Kota **model çağrısından önce**
tüketilir — tavanı aşan istek para harcamaz.
