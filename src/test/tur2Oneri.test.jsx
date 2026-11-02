import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { genreKeysOf, genreProfile, seedProfile, topGenres } from '../lib/recommend.js'

describe('recommend — prototip anahtarı sertleştirmesi (security LOW-1)', () => {
  it('genreKeysOf prototip adlarını tanımaz, fırlatmaz', () => {
    expect(genreKeysOf(['constructor'])).toEqual([])
    expect(genreKeysOf(['__proto__'])).toEqual([])
    expect(genreKeysOf(['toString', 'hasOwnProperty'])).toEqual([])
    expect(genreKeysOf(['constructor', 'Suç'])).toEqual(['suc'])
  })

  it('kurcalanmış favori türleriyle profil hesaplanır', () => {
    const tohumlar = [{ id: 1, w: 1, title: 'x', genres: ['constructor', '__proto__'], recKeys: [] }]
    expect(() => seedProfile(tohumlar)).not.toThrow()
    expect(genreProfile([{ genres: ['constructor'] }])).toEqual({})
  })

  it('topGenres yalnız gerçek tür anahtarlarını döndürür', () => {
    expect(topGenres({ constructor: 0.6, suc: 0.4 }, 2)).toEqual(['suc'])
    expect(topGenres({ toString: 0.5, __proto__: 0.2, macera: 0.3 }, 2)).toEqual(['macera'])
  })
})

// ── Tohum başına önbellek: aç/kapa yeniden /recommendations istemez ──────────
const sonuc = (id, genreIds, title = `Aday ${id}`) => ({
  id, media_type: 'movie', title, original_title: title,
  release_date: '2018-01-01', vote_average: 8, vote_count: 5000, genre_ids: genreIds,
})
const yanit = (body, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) })

const tohum = {
  key: 'tmdb:movie:777', title: 'Tohum', year: '2019', genres: ['Animasyon', 'Macera'],
  tmdbId: 777, mediaType: 'movie', _w: 2,
}
const aramaTohumu = { key: 'title:Mock Yapım:2001', title: 'Mock Yapım', year: '2001', genres: ['Macera'], _w: 1 }

const say = (fetchMock, parca) => fetchMock.mock.calls.filter(c => String(c[0]).includes(parca)).length

async function kancaYukle() {
  vi.stubEnv('VITE_TMDB_KEY', 'test-key')
  vi.resetModules()
  return (await import('../hooks/useRecommendations.js')).useRecommendations
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('useRecommendations — tohum önbelleği (security LOW-2 / resilience A2.5)', () => {
  function standartTaklit() {
    return vi.fn((url) => {
      if (url.includes('/search/multi')) return yanit({ results: [{ id: 555, media_type: 'movie' }] })
      if (url.includes('/recommendations')) return yanit({ results: [sonuc(1, [12]), sonuc(2, [16, 12])] })
      if (url.includes('/discover/')) return yanit({ results: [sonuc(50, [12])] })
      return yanit({ results: [] })
    })
  }

  it('animasyon aç/kapa /recommendations ve /search/multi isteklerini tekrarlamaz, keşfi yeniler', async () => {
    const fetchMock = standartTaklit()
    vi.stubGlobal('fetch', fetchMock)
    const useRecommendations = await kancaYukle()
    const { result, rerender } = renderHook(
      ({ hide }) => useRecommendations([tohum, aramaTohumu], [], [], { hideAnimation: hide }),
      { initialProps: { hide: false } },
    )
    await waitFor(() => expect(result.current.recommendations.some(r => r.title === 'Aday 2')).toBe(true))
    expect(say(fetchMock, '/recommendations')).toBe(2)
    expect(say(fetchMock, '/search/multi')).toBe(1)
    const kesif = say(fetchMock, '/discover/')

    rerender({ hide: true })
    await waitFor(() => expect(result.current.recommendations.some(r => r.title === 'Aday 2')).toBe(false))
    rerender({ hide: false })
    await waitFor(() => expect(result.current.recommendations.some(r => r.title === 'Aday 2')).toBe(true))

    expect(say(fetchMock, '/recommendations')).toBe(2)
    expect(say(fetchMock, '/search/multi')).toBe(1)
    expect(say(fetchMock, '/discover/')).toBeGreaterThan(kesif)
  })

  it('hatalı yanıt önbelleğe yazılmaz, sonraki hesaplamada yeniden istenir', async () => {
    let ilk = true
    const fetchMock = vi.fn((url) => {
      if (url.includes('/recommendations')) {
        if (ilk) { ilk = false; return yanit({}, false) }
        return yanit({ results: [sonuc(1, [12])] })
      }
      return yanit({ results: [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const useRecommendations = await kancaYukle()
    const { result, rerender } = renderHook(
      ({ hide }) => useRecommendations([tohum], [], [], { hideAnimation: hide }),
      { initialProps: { hide: false } },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(say(fetchMock, '/recommendations')).toBe(1)
    rerender({ hide: true })
    await waitFor(() => expect(result.current.recommendations.some(r => r.title === 'Aday 1')).toBe(true))
    expect(say(fetchMock, '/recommendations')).toBe(2)
  })

  it('iptal edilen hattın geç gelen yanıtı önbelleği ezmez', async () => {
    let gecikmisCoz
    let istek = 0
    const fetchMock = vi.fn((url) => {
      if (url.includes('/recommendations')) {
        istek += 1
        if (istek === 1) {
          return new Promise(res => {
            gecikmisCoz = () => res({ ok: true, json: () => Promise.resolve({ results: [sonuc(9, [12], 'Bayat Aday')] }) })
          })
        }
        return yanit({ results: [sonuc(1, [12], 'Taze Aday')] })
      }
      return yanit({ results: [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const useRecommendations = await kancaYukle()
    const { result, rerender } = renderHook(
      ({ hide }) => useRecommendations([tohum], [], [], { hideAnimation: hide }),
      { initialProps: { hide: false } },
    )
    await waitFor(() => expect(istek).toBe(1))
    rerender({ hide: true })
    await waitFor(() => expect(result.current.recommendations.map(r => r.title)).toEqual(['Taze Aday']))

    await act(async () => { gecikmisCoz(); await new Promise(r => setTimeout(r, 20)) })
    rerender({ hide: false })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await new Promise(r => setTimeout(r, 20)) })
    expect(result.current.recommendations.map(r => r.title)).toEqual(['Taze Aday'])
    expect(istek).toBe(2)
  })
})
