import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  rankRecommendations, seedProfile, bannedGenres, discoveryGenres, MAX_RESULTS,
} from '../lib/recommend.js'
import { isAnimation } from '../lib/listLogic.js'

const card = (id, genres, extra = {}) => ({
  key: `tmdb:movie:${id}`, title: `Film ${id}`, originalTitle: `Film ${id}`, year: '2015',
  genres, _mediaType: 'movie', _voteAvg: 7.5, _voteCount: 5000, ...extra,
})

// Animasyon seven profil: animasyon kitle türü olarak ELENMEZ (payı %8'in üstünde).
function senaryo(animCount, plainCount) {
  const anim  = Array.from({ length: animCount },  (_, i) => card(100 + i, ['Animasyon', 'Macera']))
  const plain = Array.from({ length: plainCount }, (_, i) => card(300 + i, ['Macera']))
  // Animasyonlar listenin başında: gizlenince yerlerini sıradakiler almalı.
  const cards = [...anim, ...plain]
  const seeds = [{ id: 1, w: 2, title: 'Örümcek-Adam', genres: ['Animasyon', 'Macera'], recKeys: cards.map(c => c.key) }]
  return { seeds, cards, profile: seedProfile(seeds) }
}

const run = ({ seeds, cards, profile }, extra = {}) => rankRecommendations({
  seeds, cardsByKey: new Map(cards.map(c => [c.key, c])), profile,
  excludeKeys: new Set(), excludeTitles: new Set(), ...extra,
})

describe('rankRecommendations — animasyon yasağı (AC-8)', () => {
  it('seçenek kapalıyken profilde yeri olan animasyon önerilir (mevcut davranış)', () => {
    const recs = run(senaryo(10, 15))
    expect(recs.some(isAnimation)).toBe(true)
    expect(recs).toHaveLength(MAX_RESULTS)
  })

  it('gizliyken sonuçta animasyon yok, liste sıradaki adaylarla dolar', () => {
    const recs = run(senaryo(10, 25), { hideAnimation: true })
    expect(recs.some(isAnimation)).toBe(false)
    expect(recs).toHaveLength(MAX_RESULTS)
  })

  it('uygun animasyonsuz aday azsa uzunluk = o aday sayısı', () => {
    const recs = run(senaryo(10, 7), { hideAnimation: true })
    expect(recs.some(isAnimation)).toBe(false)
    expect(recs).toHaveLength(7)
  })

  it('keşif adaylarındaki animasyon da elenir', () => {
    const s = senaryo(0, 2)
    const recs = run(s, { hideAnimation: true, discovered: [card(900, ['Animasyon']), card(901, ['Macera'])] })
    expect(recs.map(r => r.key)).toEqual(expect.arrayContaining(['tmdb:movie:901']))
    expect(recs.map(r => r.key)).not.toContain('tmdb:movie:900')
  })

  it('yasaklı türler ve keşif türleri tercihe uyar', () => {
    const profile = { animasyon: 0.6, macera: 0.4 }
    expect(bannedGenres(profile).has('animasyon')).toBe(false)
    expect(bannedGenres(profile, { hideAnimation: true }).has('animasyon')).toBe(true)
    expect(discoveryGenres(profile)).toEqual(['animasyon', 'macera'])
    expect(discoveryGenres(profile, { hideAnimation: true })).toEqual(['macera'])
  })
})

// ── Kanca: discover isteği ve yerel yedek ────────────────────────────────────
const tmdbSonuc = (id, genreIds) => ({
  id, media_type: 'movie', title: `Aday ${id}`, original_title: `Aday ${id}`,
  release_date: '2018-01-01', vote_average: 8, vote_count: 5000, genre_ids: genreIds,
})

function tmdbTaklidi(url) {
  if (url.includes('/recommendations')) {
    return { results: [tmdbSonuc(1, [16, 12]), tmdbSonuc(2, [12]), tmdbSonuc(3, [16]), tmdbSonuc(4, [12, 28])] }
  }
  if (url.includes('/discover/')) {
    return { results: [tmdbSonuc(50, [16]), tmdbSonuc(51, [12])] }
  }
  return { results: [] }
}

const tohum = [{
  key: 'tmdb:movie:777', title: 'Animasyon Sevgisi', year: '2019',
  genres: ['Animasyon', 'Macera'], tmdbId: 777, mediaType: 'movie', _w: 2,
}]

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.doUnmock('../data/mockData.js')
  vi.resetModules()
})

describe('useRecommendations — animasyon tercihi (FR-5d)', () => {
  async function kancaYukle(key = 'test-key') {
    vi.stubEnv('VITE_TMDB_KEY', key)
    vi.resetModules()
    return (await import('../hooks/useRecommendations.js')).useRecommendations
  }

  it('gizliyken discover çağrıları without_genres içinde 16 taşır, sonuçta animasyon yok', async () => {
    const fetchMock = vi.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(tmdbTaklidi(url)) }))
    vi.stubGlobal('fetch', fetchMock)
    const useRecommendations = await kancaYukle()

    const { result } = renderHook(() => useRecommendations(tohum, [], [], { hideAnimation: true }))
    await waitFor(() => expect(result.current.recommendations.length).toBeGreaterThan(0))

    const discover = fetchMock.mock.calls.map(c => c[0]).filter(u => u.includes('/discover/'))
    expect(discover.length).toBeGreaterThan(0)
    discover.forEach(u => {
      const qs = new URL(u).searchParams
      expect((qs.get('without_genres') || '').split(',')).toContain('16')
      expect((qs.get('with_genres') || '').split('|')).not.toContain('16')
    })
    expect(result.current.recommendations.some(isAnimation)).toBe(false)
  })

  it('açıkken (profilde animasyon varsa) discover 16\'yı dışlamaz ve animasyon önerilebilir', async () => {
    const fetchMock = vi.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(tmdbTaklidi(url)) }))
    vi.stubGlobal('fetch', fetchMock)
    const useRecommendations = await kancaYukle()

    const { result } = renderHook(() => useRecommendations(tohum, [], []))
    await waitFor(() => expect(result.current.recommendations.length).toBeGreaterThan(0))

    fetchMock.mock.calls.map(c => c[0]).filter(u => u.includes('/discover/')).forEach(u => {
      expect((new URL(u).searchParams.get('without_genres') || '').split(',')).not.toContain('16')
    })
    expect(result.current.recommendations.some(isAnimation)).toBe(true)
  })

  it('tercih değişince yeniden hesaplanır', async () => {
    const fetchMock = vi.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(tmdbTaklidi(url)) }))
    vi.stubGlobal('fetch', fetchMock)
    const useRecommendations = await kancaYukle()

    const { result, rerender } = renderHook(
      ({ hide }) => useRecommendations(tohum, [], [], { hideAnimation: hide }),
      { initialProps: { hide: false } },
    )
    await waitFor(() => expect(result.current.recommendations.some(isAnimation)).toBe(true))
    rerender({ hide: true })
    await waitFor(() => expect(result.current.recommendations.some(isAnimation)).toBe(false))
    expect(result.current.recommendations.length).toBeGreaterThan(0)
  })

  it('yerel yedek (anahtar yok) de süzülür ve animasyonsuzlarla dolar', async () => {
    const yerel = [
      ...Array.from({ length: 12 }, (_, i) => ({ title: `Çizgi ${i}`, year: 2010, genres: ['Animasyon', 'Macera'], imdbScore: 9 })),
      ...Array.from({ length: 25 }, (_, i) => ({ title: `Macera ${i}`, year: 2011, genres: ['Macera'], imdbScore: 7 })),
    ]
    vi.doMock('../data/mockData.js', () => ({ ALL_CONTENT: yerel, MOCK_DIZILER: [], MOCK_FILMLER: [], MOCK_TREND: [] }))
    const useRecommendations = await kancaYukle('')

    const gizli = renderHook(() => useRecommendations(tohum, [], [], { hideAnimation: true }))
    await waitFor(() => expect(gizli.result.current.recommendations.length).toBe(MAX_RESULTS))
    expect(gizli.result.current.recommendations.some(isAnimation)).toBe(false)

    const acik = renderHook(() => useRecommendations(tohum, [], []))
    await waitFor(() => expect(acik.result.current.recommendations.length).toBe(MAX_RESULTS))
    expect(acik.result.current.recommendations.some(isAnimation)).toBe(true)
  })
})
