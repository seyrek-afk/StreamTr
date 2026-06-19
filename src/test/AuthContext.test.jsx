import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { AuthProvider, useAuth } from '../contexts/AuthContext.jsx'

// NOT: Test ortamında VITE_SUPABASE_* tanımsızdır → supabase=null, giriş kapalı.

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
