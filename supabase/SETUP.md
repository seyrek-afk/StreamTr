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
- **Site URL**: üretim adresiniz (yoksa `http://localhost:3000`)
- **Redirect URLs** listesine ekleyin:
  - `http://localhost:3000` (yerel geliştirme — `vite.config.js` portu 3000)
  - üretim adresiniz (ör. `https://streamtr.example.com`)

## 6) Çalıştır
```bash
npm run dev
```
Başlıktaki **Giriş** düğmesi görünür. Girişte, o ana kadar localStorage'da biriken favoriler
otomatik olarak hesaba taşınır; sonrasında favoriler tüm cihazlarda senkron olur.
