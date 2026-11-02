// Reziliyans: animasyonlar gizliyken arka planda yapılan "100 içeriğe tamamlama"
// (useStreamData topUp) yolunun arıza modları.
//  1) Bir tamamlama partisinin TÜM istekleri düşerse (mobilde kopma, 429, zaman
//     aşımı) imleç o sayfaların üstünden atlamamalı; sonraki deneme aynı
//     sayfalardan devam etmeli — aksi hâlde 6-10 gibi en üst sıradaki sayfalar
//     oturum boyunca hiç gösterilmez.
//  2) Tamamlama sayfaları platform zenginleştirmesini anahtar başına 7'lik
//     eşzamanlılığın üstüne çıkarmamalı (TMDB oran sınırı / mobil bağlantı).
//  3) Yanıt vermeyen bir platform isteği zenginleştirmeyi kilitlememeli; zaman
//     aşımı "platform yok" diye önbelleğe yazılmamalı.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { withoutAnimation } from '../lib/listLogic.js'

const ANAHTAR = 'test-anahtar'
const ANIMASYON = 16

let useStreamData
let providerCache

const yanit = (json) => ({ ok: true, json: async () => json, clone() { return this } })
const hata = (status = 503) => ({ ok: false, status, json: async () => ({}) })
const NETFLIX = { results: { TR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] } } }

const sayfaNo = (url) => Number(new URL(url).searchParams.get('page'))

function liste({ page, anim = 12, duz = 8, toplam = 50 }) {
  const results = []
  for (let i = 0; i < anim + duz; i++) {
    results.push({
      id: page * 100 + i,
      name: `Yapım ${page}-${i}`,
      title: `Yapım ${page}-${i}`,
      vote_average: 7 + (i % 10) / 10,
      vote_count: 500 + i,
      popularity: 1000 - page * 20 - i,
      poster_path: null,
      first_air_date: '2020-01-01',
      release_date: '2020-01-01',
      genre_ids: i < anim ? [ANIMASYON, 18] : [18],
      overview: '',
    })
  }
  return { page, total_pages: toplam, results }
}

function trendSayfasi(page) {
  const json = liste({ page, toplam: 500 })
  json.results = json.results.map((r, i) => ({ ...r, media_type: i % 2 === 0 ? 'movie' : 'tv' }))
  return json
}

// TMDB taklidi. `ozel(url, page, opts)` bir yanıt dönerse o kullanılır.
function tmdb(ozel = () => null, { anim = 12, duz = 8 } = {}) {
  return vi.fn((url, opts) => {
    const page = url.includes('/watch/providers') ? null : sayfaNo(url)
    const o = ozel(url, page, opts)
    if (o) return o
    if (url.includes('/watch/providers')) return Promise.resolve(yanit(NETFLIX))
    if (url.includes('/trending/')) return Promise.resolve(yanit(trendSayfasi(page)))
    return Promise.resolve(yanit(liste({ page, anim, duz })))
  })
}

const listeIstekleri = (needle) =>
  global.fetch.mock.calls.map(c => c[0]).filter(u => u.includes(needle) && !u.includes('/watch/providers'))
const sayfalar = (needle) => listeIstekleri(needle).map(sayfaNo)

async function bosalt() {
  await act(async () => { await vi.runAllTimersAsync() })
}

async function yukle(result, key) {
  act(() => { result.current.fetchTab(key) })
  await bosalt()
}

const kanca = () => renderHook(() => useStreamData({ hideAnimation: true }))
const animasyonsuz = (items) => withoutAnimation(items).length

beforeEach(async () => {
  vi.useFakeTimers()
  delete globalThis.__streamtrErken
  vi.stubEnv('VITE_TMDB_KEY', ANAHTAR)
  vi.resetModules()
  ;({ useStreamData } = await import('../hooks/useStreamData.js'))
  ;({ providerCache } = await import('../lib/platforms.js'))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  delete globalThis.__streamtrErken
})

describe('Reziliyans — tamamlama partisi tümden düşerse imleç atlamaz', () => {
  it('liste: düşen 6-10 sayfaları sonraki denemede yeniden istenir, içerikleri kaybolmaz', async () => {
    let kopuk = true
    global.fetch = tmdb((url, page) => (kopuk && page >= 6 ? Promise.resolve(hata(503)) : null))
    const { result } = kanca()
    await yukle(result, 'diziler')
    expect(animasyonsuz(result.current.data.diziler)).toBe(40)
    expect(result.current.loadingMore.diziler).toBe(false)

    // Bağlantı geri geldi; kullanıcı sekmeye geri döner (yüklü anahtar → tamamlama).
    kopuk = false
    await yukle(result, 'diziler')

    const istenen = sayfalar('tv/top_rated')
    expect(istenen.filter(p => p === 6)).toHaveLength(2)
    const veri = result.current.data.diziler
    expect(veri.some(k => k._tmdbId >= 600 && k._tmdbId < 700)).toBe(true)
    expect(animasyonsuz(veri)).toBeGreaterThanOrEqual(100)
    expect(result.current.loadingMore.diziler).toBe(false)
  })

  it('liste: düşen partiden sonra "Daha fazla göster" 6. sayfadan devam eder', async () => {
    let kopuk = true
    global.fetch = tmdb((url, page) => (kopuk && page >= 6 ? Promise.reject(new TypeError('Failed to fetch')) : null))
    const { result } = kanca()
    await yukle(result, 'diziler')
    expect(result.current.hasMore.diziler).toBe(true)

    kopuk = false
    // 40 yüklü animasyonsuz içerik var; 30→60 isteği yüklü veriyi aşar, ağa çıkar.
    await act(async () => { result.current.showMore('diziler'); await vi.runAllTimersAsync() })
    const ikinciTur = sayfalar('tv/top_rated').slice(10)
    expect(ikinciTur[0]).toBe(6)
    expect(result.current.data.diziler.some(k => k._tmdbId >= 600 && k._tmdbId < 700)).toBe(true)
  })

  it('"Daha fazla göster" çok sayfalı turda ortadaki sayfa düşerse gelen sayfalar korunur, sonraki tıklama düşen sayfadan sürer', async () => {
    // %90 animasyon: tamamlama 15. sayfada durur (30 animasyonsuz); 30→60 için
    // tek tıklama 16, 17, 18… sayfalarını sırayla ister.
    let kopuk = true
    global.fetch = tmdb((url, page) => (kopuk && page === 18 ? Promise.resolve(hata(503)) : null), { anim: 18, duz: 2 })
    const { result } = kanca()
    await yukle(result, 'diziler')
    expect(Math.max(...sayfalar('tv/top_rated'))).toBe(15)

    await act(async () => { result.current.showMore('diziler'); await vi.runAllTimersAsync() })
    const veri = result.current.data.diziler
    expect(veri.some(k => k._tmdbId >= 1600 && k._tmdbId < 1700)).toBe(true)
    expect(veri.some(k => k._tmdbId >= 1700 && k._tmdbId < 1800)).toBe(true)
    expect(result.current.visible.diziler).toBe(34)
    expect(result.current.hasMore.diziler).toBe(true)
    expect(result.current.loadingMore.diziler).toBe(false)

    kopuk = false
    const once = sayfalar('tv/top_rated').length
    await act(async () => { result.current.showMore('diziler'); await vi.runAllTimersAsync() })
    expect(sayfalar('tv/top_rated')[once]).toBe(18)
  })

  it('dünya trendi: düşen 6+ sayfaları sonraki denemede yeniden istenir', async () => {
    let kopuk = true
    global.fetch = tmdb((url, page) => (kopuk && url.includes('/trending/') && page >= 6 ? Promise.resolve(hata(429)) : null))
    const { result } = kanca()
    await yukle(result, 'trend')
    expect(animasyonsuz(result.current.data.trend)).toBe(40)

    kopuk = false
    await yukle(result, 'trend')
    expect(sayfalar('/trending/').filter(p => p === 6)).toHaveLength(2)
    expect(result.current.data.trend.some(k => k._tmdbId >= 600 && k._tmdbId < 700)).toBe(true)
    expect(result.current.loadingMore.trend).toBe(false)
  })

  it('ülke trendi: düşen 4. sayfa çifti sonraki denemede yeniden istenir', async () => {
    let kopuk = true
    global.fetch = tmdb((url, page) => (kopuk && url.includes('/discover/') && page >= 4 ? Promise.resolve(hata(503)) : null))
    const { result } = kanca()
    await yukle(result, 'JP:trend')
    expect(result.current.data['JP:trend']).toHaveLength(120)

    kopuk = false
    await yukle(result, 'JP:trend')
    expect(listeIstekleri('discover/tv').map(sayfaNo).filter(p => p === 4)).toHaveLength(2)
    expect(result.current.data['JP:trend'].some(k => k._tmdbId >= 400 && k._tmdbId < 500)).toBe(true)
    expect(result.current.loadingMore['JP:trend']).toBe(false)
  })
})

describe('Reziliyans — unmount', () => {
  it('tamamlama partisi uçuştayken unmount: geç yanıtlar hata/uyarı üretmez, döngü sınırlı kalır', async () => {
    const bekleyen = []
    global.fetch = tmdb((url, page) => (page >= 6
      ? new Promise(resolve => bekleyen.push(() => resolve(yanit(liste({ page })))))
      : null))
    const hatalar = vi.spyOn(console, 'error')
    const { result, unmount } = kanca()
    await yukle(result, 'diziler')
    expect(bekleyen.length).toBeGreaterThan(0)

    unmount()
    for (let i = 0; i < 20 && bekleyen.length; i++) {
      await act(async () => { while (bekleyen.length) bekleyen.shift()() })
      await bosalt()
    }
    expect(hatalar).not.toHaveBeenCalled()
    expect(Math.max(...sayfalar('tv/top_rated'))).toBeLessThanOrEqual(15)
  })
})

describe('Reziliyans — platform zenginleştirmesi tamamlamayla şişmez', () => {
  it('anahtar başına eşzamanlı watch/providers isteği 7\'yi aşmaz; tamamlama kartları yine de zenginleşir', async () => {
    const bekleyen = []
    let ucusta = 0
    let enFazla = 0
    global.fetch = tmdb((url) => {
      if (!url.includes('/watch/providers')) return null
      ucusta++
      enFazla = Math.max(enFazla, ucusta)
      return new Promise(resolve => bekleyen.push(() => { ucusta--; resolve(yanit(NETFLIX)) }))
    })
    const { result } = kanca()
    // runAllTimersAsync burada kullanılmaz: saati 10 sn ileri sarıp uçuştaki
    // platform isteklerini zaman aşımına düşürürdü. Saat yalnız 1 ms ilerler.
    act(() => { result.current.fetchTab('diziler') })
    for (let i = 0; i < 400; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1) })
      if (bekleyen.length) {
        await act(async () => { while (bekleyen.length) bekleyen.shift()() })
      } else if (!result.current.loading.diziler && !result.current.loadingMore.diziler &&
                 !result.current.enriching.diziler) {
        break
      }
    }

    expect(result.current.loadingMore.diziler).toBe(false)
    expect(enFazla).toBeLessThanOrEqual(7)
    const ek = withoutAnimation(result.current.data.diziler.filter(k => k._tmdbId >= 600))
    expect(ek.length).toBeGreaterThan(0)
    expect(ek.every(k => k.platforms.length > 0)).toBe(true)
    expect(result.current.enriching.diziler).toBe(false)
  })

  it('yanıt vermeyen platform isteği zaman aşımına uğrar: zenginleştirme biter, sonuç önbelleğe yazılmaz', async () => {
    global.fetch = tmdb((url, _page, opts) => {
      if (!url.includes('/tv/101/watch/providers')) return null
      return new Promise((_, reject) => {
        const iptal = () => reject(new DOMException('Aborted', 'AbortError'))
        if (opts?.signal?.aborted) return iptal()
        opts?.signal?.addEventListener('abort', iptal, { once: true })
      })
    })
    const { result } = kanca()
    await yukle(result, 'diziler')

    expect(result.current.enriching.diziler).toBe(false)
    expect(providerCache.has('tv:101')).toBe(false)
    expect(providerCache.get('tv:102')).toEqual(['Netflix'])
    const ek = withoutAnimation(result.current.data.diziler.filter(k => k._tmdbId >= 600))
    expect(ek.length).toBeGreaterThan(0)
    expect(ek.every(k => k.platforms.length > 0)).toBe(true)
  })

  it('tamamlama yokken de (animasyon gösterilirken) asılı platform isteği "zenginleşiyor" göstergesini açık bırakmaz', async () => {
    global.fetch = tmdb((url, _page, opts) => {
      if (!url.includes('/tv/101/watch/providers')) return null
      return new Promise((_, reject) => {
        opts?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      })
    })
    const { result } = renderHook(() => useStreamData({ hideAnimation: false }))
    await yukle(result, 'diziler')

    expect(result.current.enriching.diziler).toBe(false)
    expect(providerCache.has('tv:101')).toBe(false)
    expect(result.current.data.diziler.find(k => k._tmdbId === 102).platforms).toEqual(['Netflix'])
  })

  it('gizliyken görünmeyen animasyonlu tamamlama kartları için watch/providers istenmez (mobil veri/kota)', async () => {
    // %90 animasyon: 10 ek sayfa = 200 kart, bunun 180'i gizli animasyon.
    global.fetch = tmdb(() => null, { anim: 18, duz: 2 })
    const { result } = kanca()
    await yukle(result, 'diziler')

    const saglayici = global.fetch.mock.calls.map(c => c[0]).filter(u => u.includes('/watch/providers'))
    const idOf = (u) => Number(u.match(/\/tv\/(\d+)\/watch/)[1])
    const ekIstek = saglayici.map(idOf).filter(id => id >= 600)
    // Ek sayfalarda yalnız animasyonsuz kartlar (sayfa başına i=18,19) istenir.
    expect(ekIstek.every(id => id % 100 >= 18)).toBe(true)
    expect(ekIstek).toHaveLength(20)
    // İlk 5 sayfanın zenginleştirmesi değişmedi (100 kartın hepsi).
    expect(saglayici.map(idOf).filter(id => id < 600)).toHaveLength(100)
  })
})

describe('Reziliyans — "Daha fazla göster" sayfa tavanı gösterilir modda da geçerli', () => {
  it('boş/seyrek sayfa dönen yukarı akışta tek tıklama 25. sayfayı aşmaz, düğme kapanır', async () => {
    // Sayfa başına 2 öğe, total_pages büyük: 250'ye ulaşmak için yüzlerce sayfa gerekir.
    global.fetch = tmdb((url, page) => (url.includes('tv/top_rated')
      ? Promise.resolve(yanit(liste({ page, anim: 0, duz: 2, toplam: 500 })))
      : null))
    const { result } = renderHook(() => useStreamData({ hideAnimation: false }))
    await yukle(result, 'diziler')
    expect(sayfalar('tv/top_rated')).toEqual([1, 2, 3, 4, 5])

    for (let i = 0; i < 5 && result.current.hasMore.diziler; i++) {
      await act(async () => { result.current.showMore('diziler'); await vi.runAllTimersAsync() })
    }
    expect(Math.max(...sayfalar('tv/top_rated'))).toBe(25)
    expect(result.current.hasMore.diziler).toBe(false)
    expect(result.current.loadingMore.diziler).toBe(false)
  })
})
