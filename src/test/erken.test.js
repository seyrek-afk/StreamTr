import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { baslat, vitrinAdayi, gorseliOnYukle, listeUrl } from '../erken.js'

// Erken veri: index.html'deki küçük betik ana paket inmeden varsayılan
// görünümün TMDB isteklerini başlatır; useStreamData aynı URL için bekleyen
// yanıtı alır, ikinci kez istemez. Vitrin adayı App.jsx'in varsayılan
// sıralamasını (imdbScore azalan, eşitlikte sayfa sırası) birebir izlemeli.

const sayfa = (ortalamalar, onek) => ({
  results: ortalamalar.map((v, i) => ({ id: i, vote_average: v, backdrop_path: `/${onek}${i}.jpg` })),
})

const yanit = (json) => ({ ok: true, json: async () => json, clone() { return this } })

describe('erken veri — vitrin adayı', () => {
  it('tüm sayfalarda en yüksek puanı seçer, eşitlikte önce geleni (kararlı sıralama)', () => {
    const s = [sayfa([8.71, 8.2], 'a'), sayfa([8.74, 7.9], 'b')]
    // 8.71 ve 8.74 ikisi de 8.7'ye yuvarlanır → kartlardaki imdbScore eşit → ilk gelen (a0) kazanır
    expect(vitrinAdayi(s)).toBe('/a0.jpg')
  })

  it('daha yüksek puan sonraki sayfadaysa onu seçer', () => {
    expect(vitrinAdayi([sayfa([8.0], 'a'), sayfa([9.1], 'b')])).toBe('/b0.jpg')
  })

  it('başarısız sayfaları (null) ve görselsiz adayı tolere eder', () => {
    expect(vitrinAdayi([null, { results: [{ vote_average: 9 }] }])).toBeNull()
    expect(vitrinAdayi([])).toBeNull()
  })
})

describe('erken veri — ön yükleme bağlantısı', () => {
  afterEach(() => { document.head.querySelectorAll('link[data-erken-vitrin]').forEach(l => l.remove()) })

  it('vitrin görseli için HeroSlider ile aynı srcset/sizes değerlerini taşıyan preload ekler', () => {
    const l = gorseliOnYukle('/x.jpg')
    expect(l.rel).toBe('preload')
    expect(l.as).toBe('image')
    expect(l.href).toBe('https://image.tmdb.org/t/p/w780/x.jpg')
    expect(l.imageSrcset).toContain('w780/x.jpg 780w')
    expect(l.imageSrcset).toContain('w1280/x.jpg 1280w')
    expect(l.imageSizes).toBe('(max-width: 639px) calc(100vw - 32px), 54vw')
    expect(l.fetchPriority).toBe('high')
    expect(document.head.contains(l)).toBe(true)
  })

  it('ikinci çağrı ikinci bir bağlantı eklemez', () => {
    gorseliOnYukle('/x.jpg')
    expect(gorseliOnYukle('/y.jpg')).toBeNull()
    expect(document.head.querySelectorAll('link[data-erken-vitrin]')).toHaveLength(1)
  })
})

describe('erken veri — havuz ve useStreamData', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    delete globalThis.__streamtrErken
    vi.stubEnv('VITE_TMDB_KEY', 'test-anahtar')
    vi.resetModules()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    delete globalThis.__streamtrErken
    document.head.querySelectorAll('link[data-erken-vitrin]').forEach(l => l.remove())
  })

  it('anahtar yoksa hiçbir istek atmaz', () => {
    const fetcher = vi.fn()
    expect(baslat({ key: '', fetcher })).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('5 sayfayı ister, havuza koyar ve adayın görselini ön-yükler', async () => {
    const fetcher = vi.fn((url) => Promise.resolve(yanit(sayfa([url.includes('page=3') ? 9.5 : 7], `p${url.slice(-1)}`))))
    const havuz = baslat({ key: 'k', fetcher })
    expect(fetcher).toHaveBeenCalledTimes(5)
    expect(havuz.size).toBe(5)
    expect(havuz.has(listeUrl('k', 1))).toBe(true)
    await vi.runAllTimersAsync()
    const l = document.head.querySelector('link[data-erken-vitrin]')
    expect(l).toBeTruthy()
    expect(l.href).toContain('/w780/')
  })

  it('useStreamData bekleyen yanıtı kullanır ve o URL için fetch ATMAZ; havuzdan siler', async () => {
    const { useStreamData } = await import('../hooks/useStreamData.js')
    const birinci = listeUrl('test-anahtar', 1)
    const havuz = (globalThis.__streamtrErken = new Map())
    const erkenYanit = yanit({ results: [{ id: 1, name: 'Erken', vote_average: 8, genre_ids: [] }], total_pages: 5 })
    havuz.set(birinci, Promise.resolve(erkenYanit))
    global.fetch = vi.fn().mockResolvedValue(yanit({ results: [{ id: 2, name: 'Ağ', vote_average: 7, genre_ids: [] }], total_pages: 5 }))

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('diziler') })
    await act(async () => { await vi.runAllTimersAsync() })

    const istenen = global.fetch.mock.calls.map(c => c[0])
    expect(istenen).not.toContain(birinci)
    expect(istenen.filter(u => u.includes('top_rated'))).toHaveLength(4)
    expect(havuz.has(birinci)).toBe(false)
    expect(result.current.data.diziler.some(d => d.title === 'Erken')).toBe(true)
  })
})
