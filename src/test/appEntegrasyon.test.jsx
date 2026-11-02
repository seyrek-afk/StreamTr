import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import React from 'react'

// App düzeyi entegrasyon: veri/arama/öneri kancaları taklit edilir, App'in
// kendi mantığı (süzgeç, sıralama, tercih, kaydırma) gerçek kodla çalışır.
const durum = vi.hoisted(() => ({
  veri: {},
  oneriler: [],
  oneriYukleniyor: false,
  raflar: [],
  oneriSecenekleri: [],
  rafSecenekleri: [],
  aramaKarti: null,
}))

vi.mock('../lib/supabase.js', () => ({ getSupabase: async () => null, isSupabaseConfigured: false }))

vi.mock('../hooks/useStreamData.js', async (importOriginal) => {
  const gercek = await importOriginal()
  return {
    ...gercek,
    useStreamData: () => ({
      data: new Proxy(durum.veri, { get: (t, k) => (typeof k === 'string' ? (t[k] ?? []) : undefined) }),
      loading: {}, loadingMore: {}, error: {}, hasMore: {}, enriching: {},
      visible: new Proxy({}, { get: () => 30 }),
      fetchTab: () => {}, showMore: () => {}, retry: () => {},
    }),
  }
})

vi.mock('../hooks/useRecommendations.js', () => ({
  useRecommendations: (_seeds, _keys, _titles, opts) => {
    durum.oneriSecenekleri.push(opts)
    return { recommendations: durum.oneriler, loading: durum.oneriYukleniyor, error: null }
  },
}))

vi.mock('../hooks/useCountryRails.js', () => ({
  useCountryRails: (tab, country, opts) => {
    durum.rafSecenekleri.push({ tab, country, opts })
    return { rails: country ? durum.raflar : [], loading: false }
  },
}))

vi.mock('../hooks/useSearch.js', async () => {
  const { useState, useCallback } = await import('react')
  const oneri = { id: 1, title: 'Aranan Yapım', originalTitle: 'Aranan Yapım', mediaType: 'movie', year: '2020', posterPath: null, score: 8 }
  return {
    useSearch: () => {
      const [s, setS] = useState({ query: '', suggestions: [], selectedItem: null, detailLoading: false, detailError: null })
      const handleQueryChange = useCallback((q) => setS(p => ({
        ...p, query: q, selectedItem: null, detailError: null, suggestions: q ? [oneri] : [],
      })), [])
      const selectSuggestion = useCallback((sug) => {
        setS(p => ({ ...p, query: sug.title, suggestions: [], detailLoading: true, selectedItem: null, detailError: null }))
        setTimeout(() => setS(p => ({ ...p, detailLoading: false, selectedItem: durum.aramaKarti })), 10)
      }, [])
      const clearSearch = useCallback(() => setS({ query: '', suggestions: [], selectedItem: null, detailLoading: false, detailError: null }), [])
      const clearSuggestions = useCallback(() => setS(p => ({ ...p, suggestions: [] })), [])
      return {
        ...s, suggesting: false, correctedFrom: null, noApiKey: false,
        handleQueryChange, selectSuggestion, clearSearch, clearSuggestions, retryDetail: () => {},
      }
    },
  }
})

const { default: App } = await import('../App.jsx')
const { ThemeProvider } = await import('../contexts/ThemeContext.jsx')
const { DeviceProvider } = await import('../contexts/DeviceContext.jsx')
const { FavoritesProvider } = await import('../contexts/FavoritesContext.jsx')

// ── Veri ────────────────────────────────────────────────────────────────────
const cizgi = (i) => ({
  title: `Çizgi ${i}`, year: '2021', type: 'dizi', genres: ['Animasyon', 'Komedi'],
  imdbScore: 9.9 - i * 0.01, rottenTomatoesScore: 99, letterboxdScore: 4.9, platforms: [],
})
// IMDB sırası Dizi 1 > Dizi 2 > …; RT sırası tersine (Dizi 11 en yüksek), Dizi 12 puansız.
const dizi = (i) => ({
  title: `Dizi ${i}`, year: String(2000 + i), type: 'dizi', genres: ['Dram'],
  imdbScore: Number((9 - i * 0.1).toFixed(1)),
  rottenTomatoesScore: i === 12 ? null : 50 + i * 3,
  letterboxdScore: 3, platforms: [],
})
const DIZILER = [cizgi(1), cizgi(2), cizgi(3), ...Array.from({ length: 12 }, (_, i) => dizi(i + 1))]

const izgaraBasliklari = () =>
  [...document.querySelectorAll('.grid-cards.enter .cc-title')].map(e => e.textContent)
const vitrinBasliklari = () =>
  screen.queryAllByRole('tab', { name: /\. öneri: / }).map(t => t.getAttribute('aria-label').replace(/^\d+\. öneri: /, ''))

function uygulama({ telefon = false } = {}) {
  if (telefon) localStorage.setItem('streamtr-gorunum', 'phone')
  return render(
    <ThemeProvider><DeviceProvider><FavoritesProvider><App /></FavoritesProvider></DeviceProvider></ThemeProvider>
  )
}

// ── Konum taklidi ───────────────────────────────────────────────────────────
const BASLIK_H = 120
let hedefTepe = -2500
const gercekRect = Element.prototype.getBoundingClientRect
function konumTaklidi() {
  Element.prototype.getBoundingClientRect = function () {
    const bos = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0 }
    if (this.classList?.contains('app-header')) return { ...bos, bottom: BASLIK_H, height: BASLIK_H }
    if (this.classList?.contains('search-result-anchor') || this.classList?.contains('ai-panel-anchor')) {
      return { ...bos, top: hedefTepe, bottom: hedefTepe + 400, height: 400 }
    }
    return bos
  }
}

let overflowCagrida
beforeEach(() => {
  localStorage.clear()
  durum.veri = { diziler: DIZILER, 'TR:diziler': DIZILER, filmler: [], trend: [] }
  durum.oneriler = []
  durum.raflar = []
  durum.oneriSecenekleri = []
  durum.oneriYukleniyor = false
  durum.rafSecenekleri = []
  durum.aramaKarti = { title: 'Aranan Yapım', year: '2020', type: 'film', genres: ['Animasyon'], imdbScore: 8, platforms: [] }
  hedefTepe = -2500
  overflowCagrida = []
  konumTaklidi()
  Object.defineProperty(window, 'scrollY', { value: 3000, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true })
  window.scrollTo = vi.fn(() => { overflowCagrida.push(document.body.style.overflow) })
  window.matchMedia = vi.fn((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
  window.history.replaceState(null, '', '/')
  globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) }))
})
afterEach(() => {
  Element.prototype.getBoundingClientRect = gercekRect
  document.body.style.overflow = ''
  delete document.documentElement.dataset.ff
  delete document.documentElement.dataset.input
  vi.restoreAllMocks()
})

// ── Animasyon ───────────────────────────────────────────────────────────────
describe('App — animasyon tercihi', () => {
  it('AC-1: varsayılanda animasyon ızgarada yok, sayaç onu saymaz', async () => {
    uygulama()
    await screen.findByText('12 sonuç')
    expect(izgaraBasliklari()).toHaveLength(12)
    expect(izgaraBasliklari().some(t => t.startsWith('Çizgi'))).toBe(false)
    expect(screen.getByRole('button', { name: 'Animasyon' })).toHaveAttribute('aria-pressed', 'false')
    expect(durum.rafSecenekleri.at(-1).opts).toEqual({ hideAnimation: true })
    expect(durum.oneriSecenekleri.at(-1)).toEqual({ hideAnimation: true })
  })

  it('AC-2: localStorage okuma/yazma hata verirse App çökmez, varsayılan gizli', async () => {
    const getItem = Storage.prototype.getItem
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (k) {
      if (k === 'streamtr-animasyon') throw new Error('erişim yok')
      return getItem.call(this, k)
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (k, v) {
      if (k === 'streamtr-animasyon') throw new Error('kota')
      return setItem.call(this, k, v)
    })
    uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: 'Animasyon' }))
    expect(await screen.findByText('15 sonuç')).toBeTruthy()
  })

  it('AC-3: masaüstü düğmesi açar, tercih kalıcıdır ve yeniden mount sonrası korunur', async () => {
    const { unmount } = uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: 'Animasyon' }))
    expect(screen.getByRole('button', { name: 'Animasyon' })).toHaveAttribute('aria-pressed', 'true')
    await screen.findByText('15 sonuç')
    expect(izgaraBasliklari()).toContain('Çizgi 1')
    expect(localStorage.getItem('streamtr-animasyon')).toBe('1')
    expect(durum.oneriSecenekleri.at(-1)).toEqual({ hideAnimation: false })
    unmount()

    uygulama()
    await screen.findByText('15 sonuç')
    expect(screen.getByRole('button', { name: 'Animasyon' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('AC-6: vitrin animasyonsuz 10 yapımla dolar', async () => {
    uygulama()
    await screen.findByText('12 sonuç')
    const vitrin = vitrinBasliklari()
    expect(vitrin).toHaveLength(10)
    expect(vitrin.some(t => t.startsWith('Çizgi'))).toBe(false)
    expect(vitrin[0]).toBe('Dizi 1')
  })

  it('AC-10: Tür filtresinde "Animasyon" seçiliyse tercih kapalıyken de görünür', async () => {
    uygulama({ telefon: true })
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: /Filtrele/ }))
    const tur = screen.getByRole('group', { name: 'Tür' })
    fireEvent.click(within(tur).getByRole('button', { name: 'Animasyon' }))
    await screen.findByText('3 sonuç')
    expect(izgaraBasliklari()).toEqual(['Çizgi 1', 'Çizgi 2', 'Çizgi 3'])
    expect(screen.queryByText('Bu filtrelerle eşleşen içerik yok')).toBeNull()
  })

  it('AC-11: aramayla seçilen animasyon yapımı tercih kapalıyken de gösterilir', async () => {
    uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'aranan' } })
    fireEvent.click(await screen.findByRole('option', { name: /Aranan Yapım/ }))
    expect(await screen.findByText('Arama sonucu')).toBeTruthy()
    const sonuc = screen.getByText('Arama sonucu').closest('section')
    expect(within(sonuc).getByText('Aranan Yapım', { selector: '.cc-title' })).toBeTruthy()
  })

  it('AC-12: tercih filtre sayılmaz — ülke merceğinde raflar ve vitrin kalır, Temizle yok', async () => {
    durum.raflar = [{ key: 'r1', title: 'Test Rafı', items: DIZILER.slice(3, 8), gridAction: null }]
    uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: 'Yerli' }))
    expect(await screen.findByText('Test Rafı')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Animasyon' }))
    await screen.findByText('15 sonuç')
    expect(screen.getByText('Test Rafı')).toBeTruthy()
    expect(vitrinBasliklari().length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Temizle/ })).toBeNull()
    expect(durum.rafSecenekleri.at(-1)).toMatchObject({ country: 'TR', opts: { hideAnimation: false } })
  })

  it('AC-4 + AC-12 (telefon): çip katalogda ve Bana Özel\'de var; rozet değişmez, Temizle sıfırlamaz', async () => {
    uygulama({ telefon: true })
    await screen.findByText('12 sonuç')
    const filtrele = () => screen.getByRole('button', { name: /Filtrele/ })
    fireEvent.click(filtrele())
    const cip = () => within(screen.getByRole('group', { name: 'Animasyon' })).getByRole('button', { name: 'Animasyonları göster' })
    expect(cip()).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(cip())
    expect(cip()).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('streamtr-animasyon')).toBe('1')
    expect(filtrele().querySelector('.ctl-count')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Temizle' })).toBeNull()

    fireEvent.click(within(screen.getByRole('group', { name: 'Tür' })).getByRole('button', { name: 'Dram' }))
    expect(filtrele().querySelector('.ctl-count').textContent).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: 'Temizle' }))
    expect(cip()).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /Sonuçları göster/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Bana Özel' }))
    fireEvent.click(filtrele())
    expect(cip()).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(cip())
    expect(cip()).toHaveAttribute('aria-pressed', 'false')
    expect(localStorage.getItem('streamtr-animasyon')).toBe('0')
  })

  it('AC-9: Bana Özel önerilerde ve vitrinde animasyon yok; kullanıcının kayıtları görünür', async () => {
    durum.oneriler = [
      { key: 'title:Önerilen Çizgi:2020', title: 'Önerilen Çizgi', year: '2020', type: 'film', genres: ['Animasyon'], imdbScore: 8.8, platforms: [] },
      { key: 'title:Önerilen Dram:2020', title: 'Önerilen Dram', year: '2020', type: 'film', genres: ['Dram'], imdbScore: 8.1, platforms: [] },
      { key: 'title:Önerilen Suç:2019', title: 'Önerilen Suç', year: '2019', type: 'film', genres: ['Suç'], imdbScore: 7.9, platforms: [] },
    ]
    localStorage.setItem('streamtr-favorites', JSON.stringify([
      { key: 'title:Sevilen Çizgi:2001', title: 'Sevilen Çizgi', year: '2001', type: 'film', genres: ['Animasyon'], like: 2, watchlist: false },
    ]))
    uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: 'Bana Özel' }))

    const oneriRafi = (await screen.findByText('Bana özel öneriler')).closest('.rail-section')
    expect(within(oneriRafi).queryByText('Önerilen Çizgi')).toBeNull()
    expect(within(oneriRafi).getAllByText('Önerilen Dram').length).toBeGreaterThan(0)
    expect(vitrinBasliklari()).toEqual(['Önerilen Dram', 'Önerilen Suç'])

    const bayildiklarim = screen.getByText('Bayıldıklarım').closest('.rail-section')
    expect(within(bayildiklarim).getAllByText('Sevilen Çizgi').length).toBeGreaterThan(0)

    const tercih = screen.getByRole('button', { name: 'Animasyon' })
    expect(tercih).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(tercih)
    await waitFor(() => expect(vitrinBasliklari()).toEqual(['Önerilen Çizgi', 'Önerilen Dram', 'Önerilen Suç']))
  })
})

// ── Sıralama ────────────────────────────────────────────────────────────────
describe('App — Rotten Tomatoes / Letterboxd sıralaması', () => {
  it('AC-16: masaüstünde "Rotten Tomatoes" seçilince ızgara RT\'ye göre azalan, Temizle görünür', async () => {
    uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: /Sırala/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Rotten Tomatoes' }))
    await waitFor(() => expect(izgaraBasliklari()[0]).toBe('Dizi 11'))
    expect(izgaraBasliklari()).toEqual([
      'Dizi 11', 'Dizi 10', 'Dizi 9', 'Dizi 8', 'Dizi 7', 'Dizi 6',
      'Dizi 5', 'Dizi 4', 'Dizi 3', 'Dizi 2', 'Dizi 1', 'Dizi 12',
    ])
    expect(screen.getByRole('button', { name: /Temizle/ })).toBeTruthy()
  })

  it('AC-13: telefon Sırala çiplerinde RT ve Letterboxd var; trend\'de Sosyal etki de durur', async () => {
    uygulama({ telefon: true })
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: /Filtrele/ }))
    const sirala = () => within(screen.getByRole('group', { name: 'Sırala' })).getAllByRole('button').map(b => b.textContent)
    expect(sirala()).toEqual(['Varsayılan (IMDB)', 'IMDB Puanı', 'Rotten Tomatoes', 'Letterboxd', 'Yıl (en yeni)'])
    fireEvent.click(within(screen.getByRole('group', { name: 'Sırala' })).getByRole('button', { name: 'Letterboxd' }))
    expect(screen.getByRole('button', { name: /Filtrele/ }).querySelector('.ctl-count').textContent).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: /Sonuçları göster/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Trend' }))
    fireEvent.click(screen.getByRole('button', { name: /Filtrele/ }))
    expect(sirala()).toEqual(['Varsayılan (Sosyal)', 'IMDB Puanı', 'Rotten Tomatoes', 'Letterboxd', 'Yıl (en yeni)', 'Sosyal etki'])
  })
})

// ── Kaydırma ────────────────────────────────────────────────────────────────
async function masaustundeAraVeSec() {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'aranan' } })
  fireEvent.click(await screen.findByRole('option', { name: /Aranan Yapım/ }))
}

describe('App — arama sonucuna kaydırma', () => {
  it('AC-17: sayfa aşağıdayken öneri seçilince sonuca, başlık yüksekliği düşülerek kaydırır', async () => {
    uygulama()
    await screen.findByText('12 sonuç')
    await masaustundeAraVeSec()
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalled())
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 3000 - 2500 - BASLIK_H - 8, behavior: 'smooth' })
  })

  it('AC-19: azaltılmış harekette behavior auto', async () => {
    window.matchMedia = vi.fn((q) => ({
      matches: q === '(prefers-reduced-motion: reduce)', media: q, addEventListener() {}, removeEventListener() {},
    }))
    uygulama()
    await screen.findByText('12 sonuç')
    await masaustundeAraVeSec()
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalled())
    window.scrollTo.mock.calls.forEach(([arg]) => expect(arg.behavior).toBe('auto'))
  })

  it('AC-20: sonuç zaten görünürse (sayfa en üstte) kaydırmaz', async () => {
    hedefTepe = BASLIK_H + 20
    uygulama()
    await screen.findByText('12 sonuç')
    await masaustundeAraVeSec()
    await screen.findByText('Arama sonucu')
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('AC-21: Bana Özel sekmesinde de aynı davranış', async () => {
    uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: 'Bana Özel' }))
    await masaustundeAraVeSec()
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 3000 - 2500 - BASLIK_H - 8 })))
  })

  it('AC-18: telefonda katman kapanır, kaydırma gövde kilidi kalktıktan sonra yapılır', async () => {
    uygulama({ telefon: true })
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: 'Ara' }))
    expect(screen.getByRole('dialog', { name: 'Film veya dizi ara' })).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'aranan' } })
    fireEvent.click(await screen.findByRole('option', { name: /Aranan Yapım/ }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Film veya dizi ara' })).toBeNull())
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalled())
    expect(overflowCagrida.every(o => o !== 'hidden')).toBe(true)
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 3000 - 2500 - BASLIK_H - 8 }))
    expect(await screen.findByText('Arama sonucu')).toBeTruthy()
  })

  it('AC-22: "AI ile Ara" aşağıdayken açılınca panele kaydırır, en üstteyken kaydırmaz', async () => {
    const { unmount } = uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: /AI ile Ara/ }))
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 3000 - 2500 - BASLIK_H - 8 })))
    unmount()

    window.scrollTo.mockClear()
    hedefTepe = BASLIK_H + 20
    uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: /AI ile Ara/ }))
    await screen.findByRole('textbox', { name: 'Ne izlemek istediğini yaz' })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('AC-23: karta dokunmak (masaüstü genişletme / telefon detay penceresi) kaydırma yapmaz', async () => {
    const { unmount } = uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getAllByRole('button', { name: /^Dizi 1\b/ })[0])
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(window.scrollTo).not.toHaveBeenCalled()
    unmount()

    uygulama({ telefon: true })
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getAllByRole('button', { name: /^Dizi 2\b/ })[0])
    await screen.findByRole('dialog')
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
})

// ── Tur 2: yalnız animasyon yüzünden boş kalan bölgeler ─────────────────────
const yalnizCizgi = [cizgi(1), cizgi(2), cizgi(3)]
const sevilen = { key: 'title:Sevilen Dram:2001', title: 'Sevilen Dram', year: '2001', type: 'film', genres: ['Dram'], like: 2, watchlist: false }
const cizgiOneri = (i) => ({ key: `title:Öneri Çizgi ${i}:2020`, title: `Öneri Çizgi ${i}`, year: '2020', type: 'film', genres: ['Animasyon'], imdbScore: 8, platforms: [] })

describe('App — tur 2: animasyon gizliyken boş bölgeler', () => {
  it('ızgara yalnız animasyon yüzünden boşsa "Animasyonları göster" sunar (masaüstü)', async () => {
    durum.veri.diziler = yalnizCizgi
    uygulama()
    expect(await screen.findByText('Burada yalnız animasyon yapımlar var')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Filtreleri temizle' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Animasyonları göster' }))
    await screen.findByText('3 sonuç')
    expect(izgaraBasliklari()).toEqual(['Çizgi 1', 'Çizgi 2', 'Çizgi 3'])
    expect(localStorage.getItem('streamtr-animasyon')).toBe('1')
  })

  it('telefonda da aynı eylem; filtre aktifse "Filtreleri temizle" de durur', async () => {
    durum.veri.diziler = [...yalnizCizgi, dizi(1)]
    uygulama({ telefon: true })
    await screen.findByText('1 sonuç')
    fireEvent.click(screen.getByRole('button', { name: /Filtrele/ }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Tür' })).getByRole('button', { name: 'Komedi' }))
    fireEvent.click(screen.getByRole('button', { name: /Sonuçları göster/ }))
    expect(await screen.findByText('Burada yalnız animasyon yapımlar var')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Filtreleri temizle' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Animasyonları göster' }))
    await screen.findByText('3 sonuç')
  })

  it('filtre animasyon dışı nedenle boşsa eski boş durum kalır', async () => {
    uygulama({ telefon: true })
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: /Filtrele/ }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Tür' })).getByRole('button', { name: 'Korku' }))
    fireEvent.click(screen.getByRole('button', { name: /Sonuçları göster/ }))
    expect(await screen.findByText('Bu filtrelerle eşleşen içerik yok')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Animasyonları göster' })).toBeNull()
  })

  it('Bana Özel: öneriler yüklenirken hepsi animasyonsa iskelet görünür', async () => {
    durum.oneriler = [cizgiOneri(1), cizgiOneri(2)]
    durum.oneriYukleniyor = true
    localStorage.setItem('streamtr-favorites', JSON.stringify([sevilen]))
    uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: 'Bana Özel' }))
    await screen.findByText('Bayıldıklarım')
    expect(document.querySelector('main .skeleton-card')).toBeTruthy()
  })

  it('Bana Özel: öneriler yalnız animasyonsa boş kalmaz, açıklama ve "Animasyonları göster" eylemi çıkar', async () => {
    durum.oneriler = [cizgiOneri(1), cizgiOneri(2)]
    localStorage.setItem('streamtr-favorites', JSON.stringify([sevilen]))
    uygulama()
    await screen.findByText('12 sonuç')
    fireEvent.click(screen.getByRole('button', { name: 'Bana Özel' }))
    expect(await screen.findByText(/yalnız animasyon yapımlardan oluşuyor/)).toBeTruthy()
    expect(vitrinBasliklari()).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Animasyonları göster' }))
    await waitFor(() => expect(vitrinBasliklari()).toEqual(['Öneri Çizgi 1', 'Öneri Çizgi 2']))
  })
})
