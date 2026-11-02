// Güvenlik regresyonu — animasyonlar gizliyken içerik tamamlama (useStreamData).
//
// TMDB yanıtı güven sınırının dışındadır: total_pages, results ve alan adları
// istek sayısını, URL'yi ve bellekteki nesneleri etkiler. Bu testler kodun
// düşmanca/bozuk yanıtta da (1) sınırlı sayıda istek attığını, (2) URL'ye
// yanıttan gelen metin taşımadığını, (3) prototip kirlenmesine kapalı olduğunu
// ve (4) hata loglarında API anahtarı sızdırmadığını kilitler.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const ANAHTAR = 'guvenlik-test-anahtari'
const ANIMASYON = 16

let useStreamData

const yanit = (json) => ({ ok: true, json: async () => json, clone() { return this } })
const sayfaNo = (url) => Number(new URL(url).searchParams.get('page'))
const saglayici = (url) => url.includes('/watch/providers')

function sayfa({ page, anim, duz, toplam }) {
  const results = []
  for (let i = 0; i < anim + duz; i++) {
    results.push({
      id: page * 100 + i,
      name: `Yapım ${page}-${i}`,
      title: `Yapım ${page}-${i}`,
      vote_average: 7.5,
      vote_count: 500,
      popularity: 1000 - page * 20 - i,
      first_air_date: '2020-01-01',
      release_date: '2020-01-01',
      genre_ids: i < anim ? [ANIMASYON, 18] : [18],
      overview: '',
      media_type: i % 2 ? 'tv' : 'movie',
    })
  }
  return { page, total_pages: toplam, results }
}

function tmdb(uret) {
  return vi.fn((url) => saglayici(url)
    ? Promise.resolve(yanit({ results: {} }))
    : uret(url, sayfaNo(url)))
}

const listeIstekleri = () =>
  global.fetch.mock.calls.map(c => c[0]).filter(u => !saglayici(u))

async function bosalt() {
  await act(async () => { await vi.runAllTimersAsync() })
}

async function yukle(result, key) {
  act(() => { result.current.fetchTab(key) })
  await bosalt()
}

beforeEach(async () => {
  vi.useFakeTimers()
  delete globalThis.__streamtrErken
  vi.stubEnv('VITE_TMDB_KEY', ANAHTAR)
  vi.resetModules()
  ;({ useStreamData } = await import('../hooks/useStreamData.js'))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  delete globalThis.__streamtrErken
})

describe('güvenlik — tamamlama istek sınırları (kaynak tüketimi)', () => {
  it('%100 animasyon + total_pages=1e9: yükleme ≤15, "daha fazla" seli dahil ≤25 sayfa; tekrar yok, düğme takılı kalmaz', async () => {
    // Sigorta: sınır kalkarsa döngü belleği tüketip işçiyi çökertmesin, test
    // temiz kırmızıya dönsün (TMDB de 500. sayfadan sonra hata döner).
    let n = 0
    global.fetch = tmdb((url, page) => (++n > 60)
      ? Promise.resolve({ ok: false, status: 422, json: async () => ({}) })
      : Promise.resolve(yanit(sayfa({ page, anim: 20, duz: 0, toplam: 1e9 }))))
    const { result } = renderHook(() => useStreamData({ hideAnimation: true }))
    await yukle(result, 'diziler')

    expect(listeIstekleri().length).toBeLessThanOrEqual(15)

    for (let i = 0; i < 20; i++) {
      act(() => { result.current.showMore('diziler') })
      await bosalt()
    }
    const istenen = listeIstekleri().map(sayfaNo)
    expect(istenen.length).toBeLessThanOrEqual(25)
    expect(Math.max(...istenen)).toBeLessThanOrEqual(25)
    expect(new Set(istenen).size).toBe(istenen.length)
    expect(result.current.hasMore.diziler).toBe(false)
    expect(result.current.loadingMore.diziler).toBe(false)
  })

  it.each([
    ['diziler', 15],
    ['trend', 15],
    ['JP:trend', 14],
  ])('aç/kapa seli (30 tur, tamamlama uçuştayken) %s: hiçbir sayfa iki kez istenmez, toplam ≤ %i', async (key, tavan) => {
    global.fetch = tmdb((url, page) =>
      Promise.resolve(yanit(sayfa({ page, anim: 19, duz: 1, toplam: 500 }))))
    const { result, rerender } = renderHook(
      ({ gizli }) => useStreamData({ hideAnimation: gizli }), { initialProps: { gizli: false } })
    await yukle(result, key)

    // Zamanlayıcılar boşaltılmadan art arda: ilk tamamlama partisi henüz
    // dönmeden her "gizle" yeni bir tamamlama tetiklemeye çalışır.
    for (let i = 0; i < 30; i++) {
      rerender({ gizli: true })
      act(() => { result.current.fetchTab(key) })
      rerender({ gizli: false })
      act(() => { result.current.fetchTab(key) })
    }
    rerender({ gizli: true })
    act(() => { result.current.fetchTab(key) })
    await bosalt()

    const urls = listeIstekleri()
    expect(urls.length).toBeLessThanOrEqual(tavan)
    expect(new Set(urls).size).toBe(urls.length)
    expect(result.current.loadingMore[key]).toBe(false)
  })
})

describe('güvenlik — URL bütünlüğü (yanıt verisi URL\'ye taşınmaz)', () => {
  it.each([
    ['5&api_key=saldirgan#x'],
    [-1],
    [1e308],
    ['7'],
    [6.5],
    [null],
    [{ sayfa: 99 }],
    [0],
  ])('düşmanca total_pages=%j: tüm istekler sabit host, tek api_key, pozitif tamsayı page', async (toplam) => {
    global.fetch = tmdb((url, page) =>
      Promise.resolve(yanit({ ...sayfa({ page, anim: 18, duz: 2, toplam: 50 }), total_pages: toplam })))

    for (const key of ['diziler', 'TR:filmler', 'trend', 'KR:trend']) {
      const { result, unmount } = renderHook(() => useStreamData({ hideAnimation: true }))
      await yukle(result, key)
      for (let i = 0; i < 5; i++) {
        act(() => { result.current.showMore(key) })
        await bosalt()
      }
      unmount()
    }

    const urls = global.fetch.mock.calls.map(c => c[0])
    expect(urls.length).toBeGreaterThan(0)
    for (const u of urls) {
      const x = new URL(u)
      expect(x.origin).toBe('https://api.themoviedb.org')
      expect(x.hash).toBe('')
      expect(x.searchParams.getAll('api_key')).toEqual([ANAHTAR])
      const page = x.searchParams.get('page')
      if (page !== null) expect(page).toMatch(/^[1-9]\d*$/)
    }
    expect(Math.max(...listeIstekleri().map(sayfaNo))).toBeLessThanOrEqual(25)
  })

  it('tamamlama sayfalarındaki düşmanca id platform (watch/providers) URL\'sine yol enjekte etmez', async () => {
    global.fetch = tmdb((url, page) => {
      const json = sayfa({ page, anim: 18, duz: 2, toplam: 50 })
      if (page > 5) {
        json.results = json.results.map((r, i) => (i % 2
          ? { ...r, id: `${r.id}/../../account?session_id=x#` }
          : r))
      }
      return Promise.resolve(yanit(json))
    })

    for (const key of ['diziler', 'trend', 'TR:trend']) {
      const { result, unmount } = renderHook(() => useStreamData({ hideAnimation: true }))
      await yukle(result, key)
      unmount()
    }

    const saglayicilar = global.fetch.mock.calls.map(c => c[0]).filter(saglayici)
    expect(saglayicilar.length).toBeGreaterThan(0)
    for (const u of saglayicilar) {
      const x = new URL(u)
      expect(x.origin).toBe('https://api.themoviedb.org')
      expect(x.pathname).toMatch(/^\/3\/(tv|movie)\/[1-9]\d*\/watch\/providers$/)
      expect(x.search).toBe(`?api_key=${ANAHTAR}`)
    }
  })
})

describe('güvenlik — yanıt verisinin işlenmesi ve loglama', () => {
  afterEach(() => {
    delete Object.prototype.kirli
    delete Object.prototype.kirli2
  })

  it('__proto__ / constructor anahtarlı TMDB sonuçları Object.prototype\'ı kirletmez', async () => {
    global.fetch = tmdb((url, page) => {
      const metin = JSON.stringify(sayfa({ page, anim: 18, duz: 2, toplam: 50 })).replaceAll(
        '"overview":""',
        '"overview":"","__proto__":{"kirli":"evet"},"constructor":{"prototype":{"kirli2":"evet"}}')
      return Promise.resolve(yanit(JSON.parse(metin)))
    })

    for (const key of ['diziler', 'trend', 'TR:trend']) {
      const { result, unmount } = renderHook(() => useStreamData({ hideAnimation: true }))
      await yukle(result, key)
      expect(result.current.data[key].length).toBeGreaterThan(100)
      unmount()
    }
    expect(({}).kirli).toBeUndefined()
    expect(({}).kirli2).toBeUndefined()
  })

  it('başarısız tamamlama sayfaları loglanır ama log API anahtarı / URL içermez', async () => {
    global.fetch = tmdb((url, page) => {
      if (page > 5) {
        return page % 2
          ? Promise.reject(new TypeError('Failed to fetch'))
          : Promise.resolve({ ok: false, status: 401, json: async () => ({ status_message: 'Invalid API key' }) })
      }
      return Promise.resolve(yanit(sayfa({ page, anim: 18, duz: 2, toplam: 50 })))
    })

    for (const key of ['diziler', 'trend', 'TR:trend']) {
      const { result, unmount } = renderHook(() => useStreamData({ hideAnimation: true }))
      await yukle(result, key)
      expect(result.current.error[key]).toBeNull()
      expect(result.current.loadingMore[key]).toBe(false)
      unmount()
    }

    const loglar = console.warn.mock.calls.map(c => c.map(String).join(' '))
    expect(loglar.length).toBeGreaterThan(0)
    for (const satir of loglar) {
      expect(satir).not.toContain(ANAHTAR)
      expect(satir).not.toContain('api_key')
      expect(satir).not.toContain('api.themoviedb.org')
    }
  })
})
