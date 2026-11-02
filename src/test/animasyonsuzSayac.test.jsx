import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const durum = vi.hoisted(() => ({
  veri: {},
  hasMore: {},
  kancaSecenekleri: [],
  fetchCagrilari: [],
}))

vi.mock('../lib/supabase.js', () => ({ getSupabase: async () => null, isSupabaseConfigured: false }))

vi.mock('../hooks/useStreamData.js', async (importOriginal) => {
  const gercek = await importOriginal()
  return {
    ...gercek,
    useStreamData: (secenekler) => {
      durum.kancaSecenekleri.push(secenekler)
      return {
        data: new Proxy(durum.veri, { get: (t, k) => (typeof k === 'string' ? (t[k] ?? []) : undefined) }),
        loading: {}, loadingMore: {}, error: {}, enriching: {},
        hasMore: new Proxy(durum.hasMore, { get: (t, k) => (typeof k === 'string' ? (t[k] ?? false) : undefined) }),
        visible: new Proxy({}, { get: () => 30 }),
        fetchTab: (key) => { durum.fetchCagrilari.push(key) },
        showMore: () => {}, retry: () => {},
      }
    },
  }
})

vi.mock('../hooks/useRecommendations.js', () => ({
  useRecommendations: () => ({ recommendations: [], loading: false, error: null }),
}))

vi.mock('../hooks/useCountryRails.js', () => ({
  useCountryRails: () => ({ rails: [], loading: false }),
}))

const { default: App } = await import('../App.jsx')
const { ThemeProvider } = await import('../contexts/ThemeContext.jsx')
const { DeviceProvider } = await import('../contexts/DeviceContext.jsx')
const { FavoritesProvider } = await import('../contexts/FavoritesContext.jsx')

const yapim = (i, animasyon, type = 'dizi') => ({
  title: `${animasyon ? 'Çizgi' : 'Yapım'} ${i}`, year: '2020', type,
  genres: animasyon ? ['Animasyon'] : ['Dram'],
  imdbScore: 8, rottenTomatoesScore: 80, letterboxdScore: 4, platforms: [],
  _tmdbId: animasyon ? 10_000 + i : i, _mediaType: type === 'film' ? 'movie' : 'tv',
})
const havuz = (animasyonlu, animasyonsuz, type) => [
  ...Array.from({ length: animasyonlu }, (_, i) => yapim(i + 1, true, type)),
  ...Array.from({ length: animasyonsuz }, (_, i) => yapim(i + 1, false, type)),
]

function uygulama() {
  return render(
    <ThemeProvider><DeviceProvider><FavoritesProvider><App /></FavoritesProvider></DeviceProvider></ThemeProvider>
  )
}

const tumuYuklendi = () => screen.queryByText(/Tümü yüklendi/)

beforeEach(() => {
  localStorage.clear()
  durum.veri = {}
  durum.hasMore = {}
  durum.kancaSecenekleri = []
  durum.fetchCagrilari = []
  window.scrollTo = vi.fn()
  window.matchMedia = vi.fn((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
  window.history.replaceState(null, '', '/')
  globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App — animasyon tercihi uygulanmış sayaç ve içerik tavanı', () => {
  it('veri kancasına tercih geçer; tercih değişince görünen anahtar yeniden istenir', async () => {
    durum.veri = { diziler: havuz(10, 40) }
    uygulama()
    await screen.findByText('40 sonuç')
    expect(durum.kancaSecenekleri.at(-1)).toEqual({ hideAnimation: true })
    const onceki = durum.fetchCagrilari.filter(k => k === 'diziler').length

    fireEvent.click(screen.getByRole('button', { name: 'Animasyon' }))
    await screen.findByText('50 sonuç')
    expect(durum.kancaSecenekleri.at(-1)).toEqual({ hideAnimation: false })
    expect(durum.fetchCagrilari.filter(k => k === 'diziler').length).toBe(onceki + 1)
  })

  it('AC-12: gizliyken ham havuz 250\'yi aşsa da animasyonsuz 250\'nin altındaysa "Tümü yüklendi" yok', async () => {
    durum.veri = { diziler: havuz(60, 200) }
    uygulama()
    await screen.findByText('200 sonuç')
    expect(tumuYuklendi()).toBeNull()
  })

  it('AC-12: gizliyken animasyonsuz havuz tavanı aşınca sayı tavana kırpılır, N animasyonsuz sayıdır', async () => {
    durum.veri = { diziler: havuz(50, 300) }
    uygulama()
    await screen.findByText('250 sonuç')
    expect(tumuYuklendi().textContent).toBe('Tümü yüklendi · 250 içerik')
    expect(screen.getByText(/gösteriliyor · en fazla 250 içerik/).textContent).toContain('30 / 250')
  })

  it('AC-12: kaynakta daha fazlası varken (hasMore) "Tümü yüklendi" görünmez', async () => {
    durum.veri = { diziler: havuz(50, 300) }
    durum.hasMore = { diziler: true }
    uygulama()
    await screen.findByText('250 sonuç')
    expect(tumuYuklendi()).toBeNull()
  })

  it('animasyonlar gösterilirken havuz tavanı aşarsa ızgara ve sayaç tavanla tutarlı', async () => {
    localStorage.setItem('streamtr-animasyon', '1')
    durum.veri = { diziler: havuz(30, 230) }
    uygulama()
    await screen.findByText('250 sonuç')
    expect(tumuYuklendi().textContent).toBe('Tümü yüklendi · 250 içerik')
  })

  it('trend 100 içeriği asla aşmaz (gizli ve gösterilir)', async () => {
    durum.veri = { diziler: havuz(0, 10), trend: havuz(40, 130, 'film') }
    uygulama()
    await screen.findByText('10 sonuç')
    fireEvent.click(screen.getByRole('button', { name: 'Trend' }))
    await screen.findByText('100 sonuç')
    expect(tumuYuklendi().textContent).toBe('Tümü yüklendi · 100 içerik')

    fireEvent.click(screen.getByRole('button', { name: 'Animasyon' }))
    await screen.findByText('100 sonuç')
    expect(tumuYuklendi().textContent).toBe('Tümü yüklendi · 100 içerik')
  })
})
