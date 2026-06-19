import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

const AuthContext = createContext(null)

// Supabase kullanıcı nesnesini sade bir profile çevirir.
function mapUser(u) {
  if (!u) return null
  const m = u.user_metadata || {}
  const first = (m.first_name || m.given_name || '').trim()
  const last  = (m.last_name  || m.family_name || '').trim()
  const full  = [first, last].filter(Boolean).join(' ').trim() ||
    (m.full_name || m.name || '').trim()
  const email = u.email || m.email || null
  return {
    id:        u.id,
    email,
    firstName: first || null,
    lastName:  last  || null,
    name:      full || (email ? email.split('@')[0] : 'Kullanıcı'),
    avatarUrl: m.avatar_url || m.picture || null,
    provider:  u.app_metadata?.provider || 'email',
  }
}

// AuthProvider dışında (ör. testlerde) kullanılırsa güvenli varsayılan döner.
const EMPTY_AUTH = {
  user: null,
  loading: false,
  configured: false,
  isAuthed: false,
  sendEmailCode: async () => { throw new Error('Giriş yapılandırılmamış.') },
  verifyEmailCode: async () => { throw new Error('Giriş yapılandırılmamış.') },
  googleSignIn: async () => { throw new Error('Giriş yapılandırılmamış.') },
  signOut: async () => {},
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  // Açılışta mevcut oturumu oku + oturum değişimlerini dinle.
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setUser(mapUser(data?.session?.user))
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user))
      setLoading(false)
    })

    return () => { alive = false; sub?.subscription?.unsubscribe?.() }
  }, [])

  // Ad + e-posta ile tek kullanımlık kod/sihirli link gönder.
  const sendEmailCode = useCallback(async ({ email, firstName, lastName }) => {
    if (!supabase) throw new Error('Giriş yapılandırılmamış.')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
        data: {
          first_name: (firstName || '').trim() || null,
          last_name:  (lastName  || '').trim() || null,
        },
      },
    })
    if (error) throw new Error(error.message)
  }, [])

  // E-postadaki 6 haneli kodu doğrula → oturum açılır.
  const verifyEmailCode = useCallback(async ({ email, code, firstName, lastName }) => {
    if (!supabase) throw new Error('Giriş yapılandırılmamış.')
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    if (error) throw new Error(error.message)
    // İsim verildiyse ve hesapta yoksa profili güncelle (mevcut kullanıcılar için).
    const meta = data?.user?.user_metadata || {}
    if ((firstName || lastName) && !meta.first_name && !meta.last_name) {
      await supabase.auth.updateUser({
        data: {
          first_name: (firstName || '').trim() || null,
          last_name:  (lastName  || '').trim() || null,
        },
      }).catch(() => {})
    }
    setUser(mapUser(data?.user))
    return mapUser(data?.user)
  }, [])

  // Google ile giriş — Supabase OAuth (tam sayfa yönlendirme).
  const googleSignIn = useCallback(async () => {
    if (!supabase) throw new Error('Giriş yapılandırılmamış.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw new Error(error.message)
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const value = {
    user,
    loading,
    configured: isSupabaseConfigured,
    isAuthed: !!user,
    sendEmailCode,
    verifyEmailCode,
    googleSignIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext) || EMPTY_AUTH
}
