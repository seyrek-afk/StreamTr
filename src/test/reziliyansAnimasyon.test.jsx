// Reziliyans: animasyon tercihi değişirken raf/öneri kancalarının arıza modları.
// TMDB yanıt vermezse yükleme sonsuza dek sürmemeli, geçici hata oturum boyunca
// önbellekte kalmamalı, iptal edilen istek yükleme bayrağını açık bırakmamalı ve
// tercih gizliye dönünce eski (animasyonlu) raflar bir an bile görünmemeli.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { RAIL_MIN_ITEMS } from '../lib/rails.js'
import { isAnimation } from '../lib/listLogic.js'

const dizi = (id, genreIds) => ({
  id, name: `Dizi ${id}`, original_name: `Dizi ${id}`, first_air_date: '2020-01-01',
  vote_average: 8, vote_count: 500, genre_ids: genreIds,
})

// Her raf 5 animasyonsuz + 2 animasyon taşır: gizliyken de eşiğin üstünde kalır.
const rafYaniti = () => [
  dizi(1, [18]), dizi(2, [80]), dizi(3, [16]), dizi(4, [35]), dizi(5, [16, 18]), dizi(6, [9648]), dizi(7, [18]),
]
const tamam = (url) => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: rafYaniti(url) }) })

// Hiç yanıt vermeyen ama iptale uyan istek (ölü bağlantı taklidi).
const asili = (_url, { signal } = {}) => new Promise((_, reject) => {
  const iptal = () => reject(new DOMException('Aborted', 'AbortError'))
  if (signal?.aborted) return iptal()
  signal?.addEventListener('abort', iptal, { once: true })
})

async function railsYukle() {
  vi.stubEnv('VITE_TMDB_KEY', 'test-key')
  vi.resetModules()
  return import('../hooks/useCountryRails.js')
}

const rafUrlSayisi = (ulke) => globalThis.fetch.mock.calls
  .filter(c => new URL(c[0]).searchParams.get('with_origin_country') === ulke).length

describe('useCountryRails — arıza modları', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('önbellekten dönüşte, iptal edilen isteğin açık bıraktığı yükleme bayrağı kapanır', async () => {
    let asiliMod = false
    globalThis.fetch = vi.fn((url, o) => (asiliMod ? asili(url, o) : tamam(url)))
    const { useCountryRails } = await railsYukle()
    const { result, rerender } = renderHook(
      ({ hide }) => useCountryRails('diziler', 'TR', { hideAnimation: hide }),
      { initialProps: { hide: true } },
    )
    await waitFor(() => expect(result.current.rails.length).toBeGreaterThan(0))
    expect(result.current.loading).toBe(false)

    asiliMod = true
    rerender({ hide: false })            // önbellekte yok → istek asılı kalır
    expect(result.current.loading).toBe(true)

    rerender({ hide: true })             // önbellekte var → asılı istek iptal edilir
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('başarısız raf isteği önbelleğe yazılmaz; merceğe dönünce yeniden denenir', async () => {
    let hata = true
    globalThis.fetch = vi.fn((url) => (hata
      ? Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) })
      : tamam(url)))
    const { useCountryRails } = await railsYukle()
    const { result, rerender } = renderHook(
      ({ ulke }) => useCountryRails('diziler', ulke, { hideAnimation: true }),
      { initialProps: { ulke: 'TR' } },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rails).toEqual([])
    const ilk = rafUrlSayisi('TR')
    expect(ilk).toBeGreaterThan(0)

    hata = false
    rerender({ ulke: 'KR' })
    await waitFor(() => expect(result.current.rails.length).toBeGreaterThan(0))
    rerender({ ulke: 'TR' })
    await waitFor(() => expect(result.current.rails.length).toBeGreaterThan(0))
    expect(rafUrlSayisi('TR')).toBe(ilk * 2)
  })

  it('TMDB yanıt vermezse süre sınırında yükleme biter; gelen raflar gösterilir, kısmi sonuç önbelleğe yazılmaz', async () => {
    vi.useFakeTimers()
    // "Bu ay" rafı asılı kalır, diğerleri yanıt verir.
    globalThis.fetch = vi.fn((url, o) => (url.includes('first_air_date.gte') ? asili(url, o) : tamam(url)))
    const { useCountryRails, RAIL_TIMEOUT_MS } = await railsYukle()
    expect(RAIL_TIMEOUT_MS).toBeGreaterThan(0)

    const { result, rerender } = renderHook(
      ({ ulke }) => useCountryRails('diziler', ulke, { hideAnimation: true }),
      { initialProps: { ulke: 'TR' } },
    )
    expect(result.current.loading).toBe(true)
    await act(async () => { await vi.advanceTimersByTimeAsync(RAIL_TIMEOUT_MS - 1) })
    expect(result.current.loading).toBe(true)

    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(result.current.loading).toBe(false)
    const keys = result.current.rails.map(r => r.key)
    expect(keys.length).toBeGreaterThan(0)
    expect(keys).not.toContain('bu-ay')

    // Kısmi sonuç önbellekte değil: aynı merceğe dönüş yeniden ister.
    const ilk = rafUrlSayisi('TR')
    rerender({ ulke: 'KR' })
    await act(async () => { await vi.advanceTimersByTimeAsync(RAIL_TIMEOUT_MS) })
    rerender({ ulke: 'TR' })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(rafUrlSayisi('TR')).toBe(ilk * 2)
  })

  it('unmount süre sınırı zamanlayıcısını temizler (sızıntı yok)', async () => {
    vi.useFakeTimers()
    globalThis.fetch = vi.fn(asili)
    const { useCountryRails } = await railsYukle()
    const { unmount } = renderHook(() => useCountryRails('diziler', 'TR', { hideAnimation: true }))
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('tercih gizliye dönünce yeni raflar gelene kadar eski raflardaki animasyon da gösterilmez', async () => {
    let asiliMod = false
    globalThis.fetch = vi.fn((url, o) => (asiliMod ? asili(url, o) : tamam(url)))
    const { useCountryRails } = await railsYukle()
    const { result, rerender } = renderHook(
      ({ hide }) => useCountryRails('diziler', 'TR', { hideAnimation: hide }),
      { initialProps: { hide: false } },
    )
    await waitFor(() => expect(result.current.rails.some(r => r.items.some(isAnimation))).toBe(true))

    asiliMod = true
    rerender({ hide: true })
    expect(result.current.loading).toBe(true)
    expect(result.current.rails.length).toBeGreaterThan(0)
    result.current.rails.forEach(r => {
      expect(r.items.some(isAnimation)).toBe(false)
      expect(r.items.length).toBeGreaterThanOrEqual(RAIL_MIN_ITEMS)
    })
  })
})

// ── useRecommendations: hattın toplam süre sınırı ───────────────────────────
const tohum = [{
  key: 'tmdb:movie:777', title: 'Suç Draması', year: '2019',
  genres: ['Dram', 'Suç'], tmdbId: 777, mediaType: 'movie', _w: 2,
}]

describe('useRecommendations — süre sınırı', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_TMDB_KEY', 'test-key')
    vi.resetModules()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('TMDB yanıt vermezse süre sınırında yükleme biter, hata işaretlenir, yerel yedek gelir', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(asili))
    const { useRecommendations, REC_TIMEOUT_MS } = await import('../hooks/useRecommendations.js')
    expect(REC_TIMEOUT_MS).toBeGreaterThan(0)

    const { result } = renderHook(() => useRecommendations(tohum, [], [], { hideAnimation: true }))
    expect(result.current.loading).toBe(true)
    await act(async () => { await vi.advanceTimersByTimeAsync(REC_TIMEOUT_MS - 1) })
    expect(result.current.loading).toBe(true)

    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Öneriler yüklenemedi.')
    expect(result.current.recommendations.length).toBeGreaterThan(0)
    expect(result.current.recommendations.some(isAnimation)).toBe(false)
  })

  it('unmount süre sınırı zamanlayıcısını temizler (sızıntı yok)', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(asili))
    const { useRecommendations } = await import('../hooks/useRecommendations.js')
    const { unmount } = renderHook(() => useRecommendations(tohum, [], [], { hideAnimation: true }))
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('tercih süre sınırından önce değişirse eski hattın zamanlayıcısı yeni sonucu bozmaz', async () => {
    vi.useFakeTimers()
    const tmdb = { results: [{ id: 5, media_type: 'movie', title: 'Aday', release_date: '2018-01-01',
      vote_average: 8, vote_count: 5000, genre_ids: [80, 18] }] }
    let asiliMod = true
    vi.stubGlobal('fetch', vi.fn((url, o) => (asiliMod
      ? asili(url, o)
      : Promise.resolve({ ok: true, json: () => Promise.resolve(tmdb) }))))
    const { useRecommendations, REC_TIMEOUT_MS } = await import('../hooks/useRecommendations.js')

    const { result, rerender } = renderHook(
      ({ hide }) => useRecommendations(tohum, [], [], { hideAnimation: hide }),
      { initialProps: { hide: true } },
    )
    await act(async () => { await vi.advanceTimersByTimeAsync(REC_TIMEOUT_MS / 2) })
    asiliMod = false
    rerender({ hide: false })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
    const sonuc = result.current.recommendations

    // İlk hattın süre sınırı dolsa da (iptal edildi) yeni sonuca dokunmaz.
    await act(async () => { await vi.advanceTimersByTimeAsync(REC_TIMEOUT_MS) })
    expect(result.current.error).toBe(null)
    expect(result.current.recommendations).toBe(sonuc)
  })
})

// ── Kaydırma zamanlayıcısı / popstate dinleyicisi sızıntısı ─────────────────
describe('kaydırma — iptal ve unmount temizliği', () => {
  let ekle, kaldir
  beforeEach(() => {
    window.scrollTo = vi.fn()
    ekle = vi.spyOn(window, 'addEventListener')
    kaldir = vi.spyOn(window, 'removeEventListener')
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const popstateDinleyicileri = (spy) => spy.mock.calls.filter(c => c[0] === 'popstate').map(c => c[1])

  it('iptal popstate dinleyicisini kaldırır', async () => {
    const { scheduleScrollBelowHeader } = await import('../lib/scroll.js')
    const iptal = scheduleScrollBelowHeader(() => null)
    const [dinleyici] = popstateDinleyicileri(ekle)
    expect(dinleyici).toBeTypeOf('function')
    iptal()
    expect(popstateDinleyicileri(kaldir)).toContain(dinleyici)
  })

  it('yeniden hizalama penceresi dolunca dinleyici kendiliğinden kalkar', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { scheduleScrollBelowHeader, POPSTATE_REALIGN_MS } = await import('../lib/scroll.js')
    scheduleScrollBelowHeader(() => null)
    const [dinleyici] = popstateDinleyicileri(ekle)
    expect(popstateDinleyicileri(kaldir)).not.toContain(dinleyici)
    vi.advanceTimersByTime(POPSTATE_REALIGN_MS)
    expect(popstateDinleyicileri(kaldir)).toContain(dinleyici)
  })

  it('SearchResult seçimden hemen sonra unmount olursa kaydırmaz, dinleyici bırakmaz', async () => {
    const { render } = await import('@testing-library/react')
    const { SearchResult } = await import('../components/SearchBar.jsx')
    const { FavoritesProvider } = await import('../contexts/FavoritesContext.jsx')
    const arama = (ek = {}) => ({
      query: 'dark', selectedItem: null, detailLoading: false, detailError: null,
      retryDetail: () => {}, noApiKey: false, ...ek,
    })
    const { rerender, unmount } = render(<FavoritesProvider><SearchResult search={arama()} /></FavoritesProvider>)
    ekle.mockClear()
    kaldir.mockClear()
    rerender(<FavoritesProvider><SearchResult search={arama({ detailLoading: true })} /></FavoritesProvider>)
    const eklenen = popstateDinleyicileri(ekle)
    expect(eklenen.length).toBeGreaterThan(0)
    unmount()
    await act(async () => { await new Promise(r => setTimeout(r, 40)) })
    expect(window.scrollTo).not.toHaveBeenCalled()
    const kaldirilan = popstateDinleyicileri(kaldir)
    eklenen.forEach(d => expect(kaldirilan).toContain(d))
  })
})
