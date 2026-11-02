import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { isAnimation, withoutAnimation } from '../lib/listLogic.js'

const ANAHTAR = 'test-anahtar'
const ANIMASYON = 16

let useStreamData
let listeUrl

const yanit = (json) => ({ ok: true, json: async () => json, clone() { return this } })
const hata = (status = 503) => ({ ok: false, status, json: async () => ({}) })

function sayfaNo(url) {
  return Number(new URL(url).searchParams.get('page'))
}

function liste({ page, anim = 12, duz = 8, toplam = 50, idTabani = 0, populerlik = 1000 }) {
  const results = []
  for (let i = 0; i < anim + duz; i++) {
    const animasyon = i < anim
    results.push({
      id: idTabani + page * 100 + i,
      name: `Yapım ${page}-${i}`,
      title: `Yapım ${page}-${i}`,
      vote_average: 7 + (i % 10) / 10,
      vote_count: 500 + i,
      popularity: populerlik - page * 20 - i,
      poster_path: null,
      first_air_date: '2020-01-01',
      release_date: '2020-01-01',
      genre_ids: animasyon ? [ANIMASYON, 18] : [18],
      overview: '',
    })
  }
  return { page, total_pages: toplam, results }
}

function trendSayfasi({ page, anim = 12, duz = 8, toplam = 500 }) {
  const json = liste({ page, anim, duz, toplam })
  json.results = json.results.map((r, i) => ({ ...r, media_type: i % 2 === 0 ? 'movie' : 'tv' }))
  return json
}

function tmdbTaklidi({ anim = 12, duz = 8, toplam = 50, sayfa } = {}) {
  return vi.fn((url) => {
    if (url.includes('/watch/providers')) return Promise.resolve(yanit({ results: {} }))
    const page = sayfaNo(url)
    if (sayfa) {
      const ozel = sayfa(url, page)
      if (ozel) return ozel
    }
    if (url.includes('/trending/')) return Promise.resolve(yanit(trendSayfasi({ page, anim, duz, toplam: 500 })))
    return Promise.resolve(yanit(liste({ page, anim, duz, toplam })))
  })
}

const istekler = (needle) =>
  global.fetch.mock.calls.map(c => c[0]).filter(u => u.includes(needle) && !u.includes('/watch/providers'))
const sayfalar = (needle) => istekler(needle).map(sayfaNo)

async function bosalt() {
  await act(async () => { await vi.runAllTimersAsync() })
}

function kanca(hide = true) {
  return renderHook(({ hide: h }) => useStreamData({ hideAnimation: h }), { initialProps: { hide } })
}

async function yukle(result, key) {
  act(() => { result.current.fetchTab(key) })
  await bosalt()
}

const animasyonsuz = (items) => withoutAnimation(items).length

function erteleyici() {
  const bekleyenler = []
  const ertele = (deger) => new Promise(resolve => bekleyenler.push(() => resolve(deger)))
  const coz = () => { while (bekleyenler.length) bekleyenler.shift()() }
  return { ertele, coz, bekleyenler }
}

beforeEach(async () => {
  vi.useFakeTimers()
  delete globalThis.__streamtrErken
  vi.stubEnv('VITE_TMDB_KEY', ANAHTAR)
  vi.resetModules()
  ;({ useStreamData } = await import('../hooks/useStreamData.js'))
  ;({ listeUrl } = await import('../erken.js'))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  delete globalThis.__streamtrErken
})

describe('useStreamData — animasyonlar gizliyken 100 içeriğe tamamlama', () => {
  it.each([
    ['diziler', 'tv/top_rated'],
    ['filmler', 'movie/top_rated'],
    ['TR:diziler', 'discover/tv'],
  ])('AC-1: %s yüksek animasyon oranında ≥100 animasyonsuz içeriğe tamamlanır', async (key, needle) => {
    global.fetch = tmdbTaklidi({ anim: 12, duz: 8, toplam: 50 })
    const { result } = kanca(true)
    await yukle(result, key)

    expect(animasyonsuz(result.current.data[key])).toBeGreaterThanOrEqual(100)
    const istenen = sayfalar(needle)
    expect(Math.max(...istenen)).toBeLessThanOrEqual(15)
    expect(new Set(istenen).size).toBe(istenen.length)
    expect(istenen.slice(0, 5).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
    expect(result.current.loading[key]).toBe(false)
    expect(result.current.loadingMore[key]).toBe(false)
    expect(result.current.error[key]).toBeNull()
    if (key.startsWith('TR:')) {
      expect(istekler(needle).every(u => u.includes('with_origin_country=TR'))).toBe(true)
    }
  })

  it('AC-1: ülke listesinde ek sayfalar ilk yüklemenin havuz ortalamasıyla puanlanır', async () => {
    global.fetch = tmdbTaklidi({ anim: 12, duz: 8, toplam: 50 })
    const { result } = kanca(true)
    await yukle(result, 'TR:diziler')
    const ekKart = result.current.data['TR:diziler'].find(k => k._tmdbId >= 600)
    expect(ekKart).toBeTruthy()
    expect(ekKart.originCountry).toBe('TR')
    expect(ekKart._weightedScore).toBeGreaterThan(0)
  })

  it('AC-2: %90 animasyonda tam 15 sayfa istenir, 16. istenmez; hasMore açık kalır', async () => {
    global.fetch = tmdbTaklidi({ anim: 18, duz: 2, toplam: 50 })
    const { result } = kanca(true)
    await yukle(result, 'diziler')

    const istenen = sayfalar('tv/top_rated').sort((a, b) => a - b)
    expect(istenen).toEqual(Array.from({ length: 15 }, (_, i) => i + 1))
    expect(result.current.loadingMore.diziler).toBe(false)
    expect(result.current.hasMore.diziler).toBe(true)
    expect(animasyonsuz(result.current.data.diziler)).toBe(30)
  })

  it('AC-3: total_pages=7 iken 8. sayfa istenmez', async () => {
    global.fetch = tmdbTaklidi({ anim: 18, duz: 2, toplam: 7 })
    const { result } = kanca(true)
    await yukle(result, 'filmler')

    const istenen = sayfalar('movie/top_rated')
    expect(Math.max(...istenen)).toBe(7)
    expect(istenen).not.toContain(8)
    expect(result.current.loadingMore.filmler).toBe(false)
    expect(result.current.hasMore.filmler).toBe(false)
  })

  it('AC-4: gösterilirken ve argümansız çağrıda ek istek yok (liste 5, trend 5, ülke trendi 6)', async () => {
    global.fetch = tmdbTaklidi({ anim: 18, duz: 2, toplam: 50 })
    const { result } = renderHook(() => useStreamData())
    await yukle(result, 'diziler')
    expect(istekler('tv/top_rated')).toHaveLength(5)
    expect(result.current.data.diziler).toHaveLength(100)

    const gosterilen = kanca(false)
    await yukle(gosterilen.result, 'trend')
    expect(istekler('/trending/')).toHaveLength(5)
    expect(gosterilen.result.current.data.trend).toHaveLength(100)

    await yukle(gosterilen.result, 'JP:trend')
    expect(istekler('sort_by=popularity.desc')).toHaveLength(6)
    expect(gosterilen.result.current.data['JP:trend']).toHaveLength(120)
    expect(gosterilen.result.current.loadingMore['JP:trend']).toBe(false)
  })

  it('AC-5: dünya trendi 6+ sayfalarla tamamlanır, sıra numarası havuzda devam eder', async () => {
    global.fetch = tmdbTaklidi({ anim: 12, duz: 8 })
    const { result } = kanca(true)
    await yukle(result, 'trend')

    const istenen = sayfalar('/trending/')
    expect(istenen.some(p => p >= 6)).toBe(true)
    expect(Math.max(...istenen)).toBeLessThanOrEqual(15)
    const trend = result.current.data.trend
    expect(animasyonsuz(trend)).toBeGreaterThanOrEqual(100)
    expect(trend.map(t => t.trendRank)).toEqual(trend.map((_, i) => i + 1))
    expect(result.current.loadingMore.trend).toBe(false)
  })

  it('AC-5: ülke trendi 4+ sayfalarla tv+movie tamamlanır, tür başına 7 sayfa sınırı, popülerliğe göre sıralı', async () => {
    global.fetch = tmdbTaklidi({ anim: 18, duz: 2, toplam: 50 })
    const { result } = kanca(true)
    await yukle(result, 'JP:trend')

    const tv = istekler('discover/tv').map(sayfaNo)
    const film = istekler('discover/movie').map(sayfaNo)
    expect(tv.some(p => p >= 4)).toBe(true)
    expect(film.some(p => p >= 4)).toBe(true)
    expect(Math.max(...tv)).toBe(7)
    expect(Math.max(...film)).toBe(7)
    expect(tv.length + film.length).toBeLessThanOrEqual(14)
    expect(new Set(tv).size).toBe(tv.length)

    const kartlar = result.current.data['JP:trend']
    const populerlik = kartlar.map(k => Number(k.popularityCriteria.find(c => c.label === 'Popülerlik Endeksi').value))
    expect(populerlik).toEqual([...populerlik].sort((a, b) => b - a))
    expect(kartlar.map(k => k.trendRank)).toEqual(kartlar.map((_, i) => i + 1))
    expect(result.current.loadingMore['JP:trend']).toBe(false)
  })

  it('AC-6: erken havuzdaki 1-5 sayfalar fetch edilmez, 6+ ağdan istenir', async () => {
    global.fetch = tmdbTaklidi({ anim: 12, duz: 8, toplam: 50 })
    const havuz = (globalThis.__streamtrErken = new Map())
    for (let p = 1; p <= 5; p++) havuz.set(listeUrl(ANAHTAR, p), Promise.resolve(yanit(liste({ page: p }))))

    const { result } = kanca(true)
    await yukle(result, 'diziler')

    const istenen = sayfalar('tv/top_rated')
    expect(istenen.filter(p => p <= 5)).toEqual([])
    expect(istenen.length).toBeGreaterThan(0)
    expect(Math.min(...istenen)).toBe(6)
    expect(havuz.size).toBe(0)
    expect(animasyonsuz(result.current.data.diziler)).toBeGreaterThanOrEqual(100)
  })

  it('AC-7: gizliyken "Daha fazla göster" süzülmüş sayıyla ilerler, sayfa tavanını aşmaz', async () => {
    global.fetch = tmdbTaklidi({ anim: 12, duz: 8, toplam: 50 })
    const { result } = kanca(true)
    await yukle(result, 'diziler')

    for (let tur = 0; tur < 15 && result.current.hasMore.diziler; tur++) {
      const once = result.current.visible.diziler
      await act(async () => {
        result.current.showMore('diziler')
        await vi.runAllTimersAsync()
      })
      const veri = result.current.data.diziler
      const sayi = animasyonsuz(veri)
      const gorunur = result.current.visible.diziler
      expect(gorunur).toBe(Math.min(once + 30, sayi, 250))
      expect(withoutAnimation(veri).slice(0, gorunur).length).toBe(Math.min(gorunur, sayi))
      const enBuyuk = Math.max(...sayfalar('tv/top_rated'))
      if (!result.current.hasMore.diziler) {
        expect(sayi >= 250 || enBuyuk >= 25).toBe(true)
      }
      expect(result.current.loadingMore.diziler).toBe(false)
    }
    expect(result.current.hasMore.diziler).toBe(false)
    expect(Math.max(...sayfalar('tv/top_rated'))).toBe(25)
    expect(animasyonsuz(result.current.data.diziler)).toBe(200)
  })

  it('AC-7: yüklü animasyonsuz öğe varken showMore ağa çıkmaz', async () => {
    global.fetch = tmdbTaklidi({ anim: 12, duz: 8, toplam: 50 })
    const { result } = kanca(true)
    await yukle(result, 'diziler')
    const onceki = istekler('tv/top_rated').length

    await act(async () => {
      result.current.showMore('diziler')
      await vi.runAllTimersAsync()
    })
    expect(result.current.visible.diziler).toBe(60)
    expect(istekler('tv/top_rated').length).toBe(onceki)
  })

  // Gizliyken animasyonlu tamamlama kartları zenginleştirilmez (mobil veri/kota);
  // "göster"e geçişte liste yeniden istenmez, yalnız o kartların platformu BİR KEZ çekilir.
  it('AC-8: gizli yüklenmiş anahtarda gizli→göster geçişi liste isteği atmaz; atlanan rozetler bir kez çekilir', async () => {
    global.fetch = tmdbTaklidi({ anim: 12, duz: 8, toplam: 50 })
    const { result, rerender } = kanca(true)
    await yukle(result, 'diziler')
    const oncekiListe = istekler('tv/top_rated').length
    const oncekiToplam = global.fetch.mock.calls.length
    const anahtarlar = result.current.data.diziler.map(k => `${k._mediaType}:${k._tmdbId}`)

    rerender({ hide: false })
    await yukle(result, 'diziler')
    expect(istekler('tv/top_rated').length).toBe(oncekiListe)
    const yeniSaglayici = global.fetch.mock.calls.slice(oncekiToplam).map(c => c[0])
    expect(yeniSaglayici.every(u => u.includes('/watch/providers'))).toBe(true)
    const animasyonluEk = result.current.data.diziler
      .filter(k => k._tmdbId >= 600 && isAnimation(k))
    expect(yeniSaglayici).toHaveLength(animasyonluEk.length)
    expect(result.current.data.diziler.map(k => `${k._mediaType}:${k._tmdbId}`)).toEqual(anahtarlar)
    expect(result.current.loadingMore.diziler).toBe(false)

    // İkinci gidiş-dönüş hiç istek atmaz.
    const ikinci = global.fetch.mock.calls.length
    rerender({ hide: true })
    await yukle(result, 'diziler')
    rerender({ hide: false })
    await yukle(result, 'diziler')
    expect(global.fetch.mock.calls.length).toBe(ikinci)
  })

  it('AC-8: gösterilir yüklenmiş anahtarda göster→gizli geçişi yalnız 6+ sayfaları ister', async () => {
    global.fetch = tmdbTaklidi({ anim: 12, duz: 8, toplam: 50 })
    const { result, rerender } = kanca(false)
    await yukle(result, 'diziler')
    expect(sayfalar('tv/top_rated')).toHaveLength(5)

    rerender({ hide: true })
    await yukle(result, 'diziler')
    const ek = sayfalar('tv/top_rated').slice(5)
    expect(ek.length).toBeGreaterThan(0)
    expect(ek.every(p => p >= 6)).toBe(true)
    expect(new Set(ek).size).toBe(ek.length)
    expect(animasyonsuz(result.current.data.diziler)).toBeGreaterThanOrEqual(100)
    expect(result.current.loadingMore.diziler).toBe(false)
  })

  it('AC-8: tamamlama sürerken ikinci tetikleme yeni istek atmaz', async () => {
    const { ertele, coz } = erteleyici()
    global.fetch = tmdbTaklidi({
      anim: 12, duz: 8, toplam: 50,
      sayfa: (url, page) => (page >= 6 ? ertele(yanit(liste({ page }))) : null),
    })
    const { result } = kanca(true)
    await yukle(result, 'diziler')
    expect(result.current.loadingMore.diziler).toBe(true)
    const ucusta = sayfalar('tv/top_rated').length

    act(() => { result.current.fetchTab('diziler') })
    act(() => { result.current.showMore('diziler') })
    expect(sayfalar('tv/top_rated').length).toBe(ucusta)

    for (let i = 0; i < 5 && result.current.loadingMore.diziler; i++) {
      await act(async () => { coz() })
      await bosalt()
    }
    expect(result.current.loadingMore.diziler).toBe(false)
    expect(animasyonsuz(result.current.data.diziler)).toBeGreaterThanOrEqual(100)
  })

  it('AC-9: tamamlama sürerken retry → eski yanıt veriyi/imleci değiştirmez, bayraklar kapanır', async () => {
    const { ertele, coz, bekleyenler } = erteleyici()
    let nesil = 1
    global.fetch = vi.fn((url) => {
      if (url.includes('/watch/providers')) return Promise.resolve(yanit({ results: {} }))
      const page = sayfaNo(url)
      if (nesil === 1) {
        const json = liste({ page, idTabani: 0 })
        json.results = json.results.map(r => ({ ...r, name: `Eski ${r.id}` }))
        return page >= 6 ? ertele(yanit(json)) : Promise.resolve(yanit(json))
      }
      const json = liste({ page, idTabani: 50_000 })
      json.results = json.results.map(r => ({ ...r, name: `Yeni ${r.id}` }))
      return Promise.resolve(yanit(json))
    })

    const { result } = kanca(true)
    await yukle(result, 'diziler')
    expect(result.current.loadingMore.diziler).toBe(true)
    expect(bekleyenler.length).toBeGreaterThan(0)

    nesil = 2
    act(() => { result.current.retry('diziler') })
    await bosalt()
    const yeniVeri = result.current.data.diziler
    const yeniSayfalar = sayfalar('tv/top_rated').length

    await act(async () => { coz() })
    await bosalt()

    expect(result.current.data.diziler).toBe(yeniVeri)
    expect(result.current.data.diziler.some(d => d.title.startsWith('Eski'))).toBe(false)
    expect(animasyonsuz(result.current.data.diziler)).toBeGreaterThanOrEqual(100)
    expect(sayfalar('tv/top_rated').length).toBe(yeniSayfalar)
    expect(result.current.loading.diziler).toBe(false)
    expect(result.current.loadingMore.diziler).toBe(false)
    expect(result.current.error.diziler).toBeNull()
  })

  it('AC-9: tamamlama sürerken sekme değişirse yanıt yalnız kendi anahtarına yazılır', async () => {
    const { ertele, coz } = erteleyici()
    global.fetch = tmdbTaklidi({
      anim: 12, duz: 8, toplam: 50,
      sayfa: (url, page) => (url.includes('tv/top_rated') && page >= 6 ? ertele(yanit(liste({ page }))) : null),
    })
    const { result } = kanca(true)
    await yukle(result, 'diziler')
    expect(result.current.loadingMore.diziler).toBe(true)

    await yukle(result, 'filmler')
    const filmler = result.current.data.filmler
    expect(result.current.loadingMore.filmler).toBe(false)

    for (let i = 0; i < 5 && result.current.loadingMore.diziler; i++) {
      await act(async () => { coz() })
      await bosalt()
    }
    expect(result.current.data.filmler).toBe(filmler)
    expect(result.current.data.filmler.every(k => k._mediaType === 'movie')).toBe(true)
    expect(result.current.data.diziler.every(k => k._mediaType === 'tv')).toBe(true)
    expect(animasyonsuz(result.current.data.diziler)).toBeGreaterThanOrEqual(100)
    expect(result.current.loadingMore.diziler).toBe(false)
  })

  it('AC-10: tamamlama partisinin tüm istekleri başarısızsa ilk veri korunur, hata yazılmaz', async () => {
    global.fetch = tmdbTaklidi({
      anim: 12, duz: 8, toplam: 50,
      sayfa: (url, page) => (page >= 6 ? Promise.resolve(hata(503)) : null),
    })
    const { result } = kanca(true)
    await yukle(result, 'diziler')

    expect(result.current.data.diziler).toHaveLength(100)
    expect(result.current.error.diziler).toBeNull()
    expect(result.current.loading.diziler).toBe(false)
    expect(result.current.loadingMore.diziler).toBe(false)
    expect(sayfalar('tv/top_rated').filter(p => p >= 6)).toEqual([6, 7, 8, 9, 10])
  })

  it('AC-10: zaman aşımı/ağ hatası (reddedilen fetch) da aynı şekilde tolere edilir', async () => {
    global.fetch = tmdbTaklidi({
      anim: 12, duz: 8, toplam: 50,
      sayfa: (url, page) => (page >= 6 ? Promise.reject(new DOMException('zaman aşımı', 'TimeoutError')) : null),
    })
    const { result } = kanca(true)
    await yukle(result, 'diziler')
    expect(result.current.data.diziler).toHaveLength(100)
    expect(result.current.error.diziler).toBeNull()
    expect(result.current.loadingMore.diziler).toBe(false)
  })

  it('AC-11: tamamlama zenginleşmiş platformları silmez ve tekrar eden yapımı eklemez', async () => {
    const { ertele, coz } = erteleyici()
    global.fetch = vi.fn((url) => {
      if (url.includes('/watch/providers')) {
        return Promise.resolve(yanit({ results: { TR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] } } }))
      }
      const page = sayfaNo(url)
      if (page >= 6) {
        const json = liste({ page })
        json.results = [...liste({ page: 5 }).results.slice(0, 5), ...json.results]
        return ertele(yanit(json))
      }
      return Promise.resolve(yanit(liste({ page })))
    })

    const { result } = kanca(true)
    await yukle(result, 'diziler')
    const ilk = result.current.data.diziler.find(k => k._tmdbId === 101)
    expect(ilk.platforms.length).toBeGreaterThan(0)

    for (let i = 0; i < 5 && result.current.loadingMore.diziler; i++) {
      await act(async () => { coz() })
      await bosalt()
    }

    const veri = result.current.data.diziler
    expect(veri.find(k => k._tmdbId === 101).platforms.length).toBeGreaterThan(0)
    const anahtarlar = veri.map(k => `${k._mediaType}:${k._tmdbId}`)
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length)
    // Gizliyken yalnız görünen (animasyonsuz) tamamlama kartları zenginleştirilir.
    expect(withoutAnimation(veri.filter(k => k._tmdbId >= 600)).every(k => k.platforms.length > 0)).toBe(true)
  })
  it('AC-2: hedefe ulaşınca durur — 12/8 oranında 13. sayfadan ötesi istenmez (aşırı çekme yok)', async () => {
    global.fetch = tmdbTaklidi({ anim: 12, duz: 8, toplam: 50 })
    const { result } = kanca(true)
    await yukle(result, 'diziler')
    expect(animasyonsuz(result.current.data.diziler)).toBeGreaterThanOrEqual(100)
    expect(Math.max(...sayfalar('tv/top_rated'))).toBeLessThanOrEqual(13)
  })

  it('AC-8: tamamlama sürerken animasyon gösterilmeye geçilirse sonraki parti istenmez', async () => {
    const { ertele, coz } = erteleyici()
    global.fetch = tmdbTaklidi({
      anim: 12, duz: 8, toplam: 50,
      sayfa: (url, page) => (page >= 6 ? ertele(yanit(liste({ page }))) : null),
    })
    const { result, rerender } = kanca(true)
    await yukle(result, 'diziler')
    expect(result.current.loadingMore.diziler).toBe(true)

    rerender({ hide: false })
    await act(async () => { coz() })
    await bosalt()
    // yalnız uçuştaki parti (6-10); 11+ istenmemeli
    expect(Math.max(...sayfalar('tv/top_rated'))).toBe(10)
    expect(result.current.loadingMore.diziler).toBe(false)
  })
})
