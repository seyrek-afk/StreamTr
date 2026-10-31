// Supabase istemcisi — TEMBEL yüklenir ve yalnızca ortam değişkenleri
// tanımlıysa oluşturulur.
//
// Neden tembel: @supabase/supabase-js (auth, postgrest, realtime, storage…)
// ana paketin yarısından fazlasıydı (~800 KB kaynak, ~150 KB gzip). Statik
// import edilince ilk boyama ve vitrin görseli (LCP) onu bekliyordu; oysa
// oturum ve favori eşitleme ilk kareden yüz-iki yüz ms sonra gelse de olur.
// `import()` ile Vite onu ayrı bir parçaya ayırır, ana paket küçülür, parça
// ilk ihtiyaçta (AuthProvider mount) paralel iner.
//
// Tanımlı değilse getSupabase() null çözer ve uygulama eskisi gibi
// (localStorage, giriş kapalı) çalışır. Testler bu modülü vi.mock ile taklit
// eder: { getSupabase, isSupabaseConfigured }.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

let istemciSozu = null

export function getSupabase() {
  if (!isSupabaseConfigured) return Promise.resolve(null)
  if (!istemciSozu) {
    istemciSozu = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // e-postadaki sihirli linkten dönüşü yakalar
        },
      })
    )
  }
  return istemciSozu
}
