import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'

// supabase katmanını "yapılandırılmamış" olarak sabitle — gerçek .env'den bağımsız,
// deterministik test (ağ/timer yan etkisi olmadan giriş kapalı davranışı).
vi.mock('../lib/supabase.js', () => ({ supabase: null, isSupabaseConfigured: false }))

import { AuthProvider, useAuth } from '../contexts/AuthContext.jsx'

describe('useAuth', () => {
  it('returns safe defaults when used outside a provider', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthed).toBe(false)
    expect(result.current.configured).toBe(false)
    expect(typeof result.current.signOut).toBe('function')
  })

  it('rejects auth actions when Supabase is not configured', async () => {
    const { result } = renderHook(() => useAuth())
    await expect(result.current.googleSignIn()).rejects.toThrow()
    await expect(result.current.sendEmailCode({ email: 'a@b.com' })).rejects.toThrow()
  })

  it('inside provider (unconfigured): not loading, not authed', () => {
    const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.configured).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(result.current.isAuthed).toBe(false)
  })
})
