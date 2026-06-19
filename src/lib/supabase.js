// Supabase istemcisi — yalnızca ortam değişkenleri tanımlıysa oluşturulur.
// Tanımlı değilse `supabase` null olur ve uygulama eskisi gibi (localStorage,
// giriş kapalı) çalışır. Böylece testler ve yapılandırılmamış ortamlar bozulmaz.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // e-postadaki sihirli linkten dönüşü yakalar
      },
    })
  : null
