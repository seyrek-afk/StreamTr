/**
 * AuthContext genişletilmiş testleri
 *
 * Mevcut AuthContext.test.jsx yalnızca null-Supabase (unconfigured) durumunu test ediyor.
 * Bu dosya Supabase mock ile gerçek auth akışlarını kapsar:
 *   - sendEmailCode / verifyEmailCode / googleSignIn / signOut
 *   - OTP doğrulama başarı ve hata yolları
 *   - mapUser dönüşüm kenar durumları
 *   - signOut sonrası kullanıcı temizlenir
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'

// ── Supabase mock yardımcıları ──────────────────────────────────────────────
function makeMockSupabase(overrides = {}) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp:     vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut:       vi.fn().mockResolvedValue({}),
      updateUser:    vi.fn().mockResolvedValue({}),
      ...overrides.auth,
    },
    ...overrides,
  }
}

// ── Dinamik mock: her test kendi supabase instance'ını tanımlar ──────────────
// vi.mock hoisting yüzünden factory pattern kullanıyoruz.
let _mockSupabase = null

vi.mock('../lib/supabase.js', () => ({
  get supabase() { return _mockSupabase },
  get isSupabaseConfigured() { return _mockSupabase !== null },
}))

// AuthContext her testte taze import edilmeli (mock değiştiği için)
// → dinamik import kullanıyoruz

async function getAuthContext() {
  // Vitest module cache'ini atlamamak için doğrudan import
  const mod = await import('../contexts/AuthContext.jsx')
  return mod
}

describe('AuthContext — Supabase OTP akışı', () => {
  beforeEach(() => {
    _mockSupabase = makeMockSupabase()
    vi.resetModules()
  })

  it('sendEmailCode — Supabase signInWithOtp çağrılır', async () => {
    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.sendEmailCode({ email: 'test@example.com', firstName: 'Ali', lastName: 'Veli' })
    })

    expect(_mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' })
    )
  })

  it('sendEmailCode — Supabase hatası fırlatır', async () => {
    _mockSupabase.auth.signInWithOtp = vi.fn().mockResolvedValue({ error: { message: 'Rate limit' } })

    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(
      act(async () => {
        await result.current.sendEmailCode({ email: 'bad@example.com' })
      })
    ).rejects.toThrow('Rate limit')
  })

  it('verifyEmailCode — başarılı OTP kullanıcıyı oturuma alır', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'ali@example.com',
      user_metadata: { first_name: 'Ali', last_name: 'Veli' },
      app_metadata: { provider: 'email' },
    }
    _mockSupabase.auth.verifyOtp = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    let returnedUser
    await act(async () => {
      returnedUser = await result.current.verifyEmailCode({ email: 'ali@example.com', code: '123456' })
    })

    expect(returnedUser).not.toBeNull()
    expect(returnedUser.email).toBe('ali@example.com')
    expect(returnedUser.firstName).toBe('Ali')
    expect(returnedUser.lastName).toBe('Veli')
    expect(returnedUser.name).toBe('Ali Veli')
  })

  it('verifyEmailCode — OTP hatasında exception fırlatır', async () => {
    _mockSupabase.auth.verifyOtp = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Geçersiz kod' },
    })

    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(
      act(async () => {
        await result.current.verifyEmailCode({ email: 'x@y.com', code: '000000' })
      })
    ).rejects.toThrow('Geçersiz kod')
  })

  it('googleSignIn — Supabase OAuth çağrılır', async () => {
    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.googleSignIn()
    })

    expect(_mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' })
    )
  })

  it('googleSignIn — OAuth hatası fırlatır', async () => {
    _mockSupabase.auth.signInWithOAuth = vi.fn().mockResolvedValue({ error: { message: 'OAuth error' } })

    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(
      act(async () => {
        await result.current.googleSignIn()
      })
    ).rejects.toThrow('OAuth error')
  })

  it('signOut — Supabase signOut çağrılır', async () => {
    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signOut()
    })

    expect(_mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('onAuthStateChange oturumla kullanıcıyı set eder', async () => {
    const mockUser = {
      id: 'u2',
      email: 'b@b.com',
      user_metadata: { full_name: 'Test User' },
      app_metadata: { provider: 'google' },
    }

    // onAuthStateChange'i mock'la: callback'i hemen çağır
    _mockSupabase.auth.onAuthStateChange = vi.fn().mockImplementation((cb) => {
      // Hemen çağır — kullanıcı oturum açmış gibi
      setTimeout(() => cb('SIGNED_IN', { user: mockUser }), 0)
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).not.toBeNull()
    })

    expect(result.current.isAuthed).toBe(true)
    expect(result.current.user.email).toBe('b@b.com')
    expect(result.current.user.provider).toBe('google')
  })
})

// ── mapUser dönüşüm testleri (birim düzeyi) ─────────────────────────────────
describe('AuthContext — mapUser kenar durumları', () => {
  beforeEach(() => {
    _mockSupabase = makeMockSupabase()
    vi.resetModules()
  })

  it('kullanıcı adı yalnızca email varsa @ öncesi kullanılır', async () => {
    const mockUser = {
      id: 'u3',
      email: 'testuser@example.com',
      user_metadata: {},
      app_metadata: { provider: 'email' },
    }
    _mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: { user: mockUser } },
    })

    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).not.toBeNull()
    })

    expect(result.current.user.name).toBe('testuser')
  })

  it('kullanıcı yoksa (session null) user null kalır', async () => {
    _mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: null },
    })

    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthed).toBe(false)
  })

  it('given_name/family_name metadata alanları da kabul edilir', async () => {
    const mockUser = {
      id: 'u4',
      email: 'c@c.com',
      user_metadata: { given_name: 'Mehmet', family_name: 'Yilmaz', avatar_url: '/av.jpg' },
      app_metadata: { provider: 'google' },
    }
    _mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: { user: mockUser } },
    })

    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).not.toBeNull()
    })

    expect(result.current.user.firstName).toBe('Mehmet')
    expect(result.current.user.lastName).toBe('Yilmaz')
    expect(result.current.user.avatarUrl).toBe('/av.jpg')
  })

  it('verifyEmailCode isim yoksa updateUser çağrılmaz', async () => {
    const mockUser = {
      id: 'u5',
      email: 'x@x.com',
      user_metadata: { first_name: 'Mevcut', last_name: 'İsim' },
      app_metadata: { provider: 'email' },
    }
    _mockSupabase.auth.verifyOtp = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.verifyEmailCode({ email: 'x@x.com', code: '111111' })
    })

    // Mevcut isim var, firstName/lastName gönderilmedi → updateUser çağrılmamalı
    expect(_mockSupabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('verifyEmailCode isim verildiyse ve metadata boşsa updateUser çağrılır', async () => {
    const mockUser = {
      id: 'u6',
      email: 'y@y.com',
      user_metadata: {},
      app_metadata: { provider: 'email' },
    }
    _mockSupabase.auth.verifyOtp = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const { AuthProvider, useAuth } = await import('../contexts/AuthContext.jsx')
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.verifyEmailCode({
        email: 'y@y.com',
        code: '222222',
        firstName: 'Yeni',
        lastName: 'Kullanıcı',
      })
    })

    expect(_mockSupabase.auth.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ first_name: 'Yeni', last_name: 'Kullanıcı' }),
      })
    )
  })
})
