import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, renderHook, screen, fireEvent, act, waitFor } from '@testing-library/react'
import React from 'react'
import { useHistoryLayer } from '../hooks/useHistoryLayer.js'
import Sheet from '../components/mobile/Sheet.jsx'
import BottomNav from '../components/mobile/BottomNav.jsx'
import FilterSheet, { ChipGroup, FilterSection } from '../components/mobile/FilterSheet.jsx'
import SearchOverlay from '../components/mobile/SearchOverlay.jsx'
import ContentCard from '../components/ContentCard.jsx'
import HeroSlider from '../components/HeroSlider.jsx'
import { DeviceProvider } from '../contexts/DeviceContext.jsx'
import { FavoritesProvider } from '../contexts/FavoritesContext.jsx'
import { TABS } from '../constants/index.js'

// Telefon kararını zorla: DeviceProvider saklı tercihi okur.
const telefonda = (ui) => {
  localStorage.setItem('streamtr-gorunum', 'phone')
  return render(<DeviceProvider><FavoritesProvider>{ui}</FavoritesProvider></DeviceProvider>)
}

// Dokunmatik ortam: yalnız (pointer: coarse) eşleşir.
function dokunmatikOrtam(coarse) {
  window.matchMedia = vi.fn((q) => ({
    matches: coarse && q === '(pointer: coarse)',
    media: q, addEventListener() {}, removeEventListener() {},
  }))
}

beforeEach(() => {
  localStorage.clear()
  dokunmatikOrtam(false)
  window.history.replaceState(null, '', '/')
})
afterEach(() => {
  document.body.style.overflow = ''
  delete document.documentElement.dataset.ff
  delete document.documentElement.dataset.input
})

// ── Geçmiş katmanı ───────────────────────────────────────────────────────────
describe('useHistoryLayer', () => {
  it('açıkken geçmişe bir giriş yazar, geri tuşu (popstate) katmanı kapatır', async () => {
    const onClose = vi.fn()
    renderHook(() => useHistoryLayer(true, onClose))
    expect(window.history.state?.streamtrLayer).toMatch(/^katman-/)

    // Geri tuşu: giriş düşer, popstate gelir.
    act(() => {
      window.history.replaceState(null, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('kapalıyken geçmişe dokunmaz', () => {
    const before = window.history.length
    renderHook(() => useHistoryLayer(false, () => {}))
    expect(window.history.state?.streamtrLayer).toBeUndefined()
    expect(window.history.length).toBe(before)
  })

  it('katman geri tuşu DIŞINDA kapanırsa kendi girişini geri alır', async () => {
    vi.useFakeTimers()
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const { rerender } = renderHook(({ acik }) => useHistoryLayer(acik, () => {}), { initialProps: { acik: true } })
    expect(back).not.toHaveBeenCalled()
    rerender({ acik: false })           // X ile kapandı
    act(() => { vi.runAllTimers() })
    expect(back).toHaveBeenCalledTimes(1)
    back.mockRestore()
    vi.useRealTimers()
  })

  it('geçmişin tepesinde sahipsiz bir katman girişi varsa üstüne yazar, yenisini eklemez', () => {
    // Sayfa yenilendi ya da StrictMode efekti çift kurdu: giriş var, katman yok.
    window.history.pushState({ streamtrLayer: 'katman-eski' }, '', '/')
    const len = window.history.length
    renderHook(() => useHistoryLayer(true, () => {}))
    expect(window.history.length).toBe(len)
    expect(window.history.state.streamtrLayer).not.toBe('katman-eski')
  })

  it('iki katman yığılınca geri tuşu yalnız ÜSTTEKİNİ kapatır', () => {
    const altKapat = vi.fn(), ustKapat = vi.fn()
    renderHook(() => useHistoryLayer(true, altKapat))
    const altJeton = window.history.state.streamtrLayer
    renderHook(() => useHistoryLayer(true, ustKapat))
    act(() => {
      window.history.replaceState({ streamtrLayer: altJeton }, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate', { state: { streamtrLayer: altJeton } }))
    })
    expect(ustKapat).toHaveBeenCalledTimes(1)
    expect(altKapat).not.toHaveBeenCalled()
  })
})

// ── Alt sayfa ────────────────────────────────────────────────────────────────
describe('Sheet', () => {
  it('kapalıyken çizilmez; açıkken dialog, başlık, gövde ve altbilgi', () => {
    const { rerender } = render(<Sheet open={false} onClose={() => {}} title="Filtrele">içerik</Sheet>)
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(<Sheet open onClose={() => {}} title="Filtrele" footer={<b>alt</b>}>içerik</Sheet>)
    const dlg = screen.getByRole('dialog', { name: 'Filtrele' })
    expect(dlg).toBeTruthy()
    expect(screen.getByText('içerik')).toBeTruthy()
    expect(screen.getByText('alt')).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('X, scrim ve ESC kapatır; içeriğe dokunmak kapatmaz', () => {
    const onClose = vi.fn()
    render(<Sheet open onClose={onClose} title="T">içerik</Sheet>)
    fireEvent.click(screen.getByText('içerik'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Kapat' }))
    fireEvent.click(document.querySelector('.sheet-scrim'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})

// ── Alt sekme çubuğu ─────────────────────────────────────────────────────────
describe('BottomNav', () => {
  const ikon = () => (p) => <svg data-testid="ikon" {...p} />
  it('dört sekmeyi çizer, aktifi işaretler, dokunuş sekme değiştirir', () => {
    const onChange = vi.fn()
    render(<BottomNav tabs={TABS} active="diziler" onChange={onChange} iconFor={ikon} />)
    const nav = screen.getByRole('navigation', { name: 'Bölümler' })
    expect(nav.querySelectorAll('.bnav-item')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Diziler' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'Trend' }))
    expect(onChange).toHaveBeenCalledWith('trend')
  })

  it('aktif sekmeye yeniden dokunmak sayfayı başa sarar, sekme değiştirmez', () => {
    const onChange = vi.fn()
    window.scrollTo = vi.fn()
    render(<BottomNav tabs={TABS} active="diziler" onChange={onChange} iconFor={ikon} />)
    fireEvent.click(screen.getByRole('button', { name: 'Diziler' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })

  it('yüklenen sekme dönen gösterge taşır', () => {
    render(<BottomNav tabs={TABS} active="diziler" onChange={() => {}} iconFor={ikon} busyFor={t => t.id === 'filmler'} />)
    expect(screen.getByRole('button', { name: 'Filmler' }).querySelector('.spin')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Diziler' }).querySelector('.spin')).toBeNull()
  })
})

// ── Çipler ve filtre sayfası ─────────────────────────────────────────────────
describe('ChipGroup / FilterSheet', () => {
  const sec = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B', count: 3 }]

  it('tekli: dokunuş seçer; seçiliye dokunmak allowClear yoksa değişmez, varsa kaldırır', () => {
    const onChange = vi.fn()
    const { rerender } = render(<ChipGroup options={sec} value="a" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'A' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /B/ }))
    expect(onChange).toHaveBeenCalledWith('b')
    rerender(<ChipGroup options={sec} value="a" onChange={onChange} allowClear />)
    fireEvent.click(screen.getByRole('button', { name: 'A' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('çoklu: ekler ve çıkarır; sayaç görünür', () => {
    const onChange = vi.fn()
    render(<ChipGroup multi options={sec} value={['a']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /B/ }))
    expect(onChange).toHaveBeenCalledWith(['a', 'b'])
    fireEvent.click(screen.getByRole('button', { name: 'A' }))
    expect(onChange).toHaveBeenCalledWith([])
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('FilterSheet: sonuç sayısı altbilgide, Temizle yalnız filtre varken', () => {
    const onClear = vi.fn(), onClose = vi.fn()
    const { rerender } = render(
      <FilterSheet open onClose={onClose} resultCount={42} hasActive={false} onClear={onClear}>
        <FilterSection title="Tür">x</FilterSection>
      </FilterSheet>
    )
    expect(screen.getByText('Tür')).toBeTruthy()
    expect(screen.getByText('· 42')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Temizle' })).toBeNull()
    rerender(
      <FilterSheet open onClose={onClose} resultCount={42} hasActive onClear={onClear}>x</FilterSheet>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Temizle' }))
    expect(onClear).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Sonuçları göster/ }))
    expect(onClose).toHaveBeenCalled()
  })
})

// ── Tam ekran arama ──────────────────────────────────────────────────────────
describe('SearchOverlay', () => {
  const arama = (ek = {}) => ({
    query: '', suggestions: [], suggesting: false, correctedFrom: null,
    selectedItem: null, detailLoading: false, noApiKey: false,
    handleQueryChange: vi.fn(), selectSuggestion: vi.fn(), clearSearch: vi.fn(), clearSuggestions: vi.fn(),
    ...ek,
  })

  it('boşken ipucu, önerilerle liste; öneri dokunuşu seçimi iletir', () => {
    const s = arama({
      query: 'dark',
      suggestions: [{ id: 1, title: 'Dark', originalTitle: 'Dark', mediaType: 'tv', year: '2017', posterPath: null, score: 8.7 }],
    })
    const { rerender } = render(<SearchOverlay open onClose={() => {}} search={arama()} />)
    expect(screen.getByText(/Film veya dizi adı yaz/)).toBeTruthy()
    rerender(<SearchOverlay open onClose={() => {}} search={s} />)
    fireEvent.click(screen.getByRole('option', { name: /Dark/ }))
    expect(s.selectSuggestion).toHaveBeenCalledWith(s.suggestions[0])
  })

  it('bir yapım seçilince (selectedItem) katman kendini kapatır', () => {
    const onClose = vi.fn()
    const { rerender } = render(<SearchOverlay open onClose={onClose} search={arama()} />)
    expect(onClose).not.toHaveBeenCalled()
    rerender(<SearchOverlay open onClose={onClose} search={arama({ selectedItem: { title: 'X' } })} />)
    expect(onClose).toHaveBeenCalled()
  })

  it('geri oku kapatır ve kutu odaklı açılır', () => {
    const onClose = vi.fn()
    render(<SearchOverlay open onClose={onClose} search={arama()} />)
    expect(document.activeElement).toBe(screen.getByRole('searchbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Geri' }))
    expect(onClose).toHaveBeenCalled()
  })
})

// ── Kart telefonda alt sayfaya gider ─────────────────────────────────────────
describe('ContentCard — telefon', () => {
  const yapim = { key: 'k1', title: 'Yapım', year: '2020', type: 'dizi', genres: ['Dram'], imdbScore: 8, platforms: [] }

  it('dokunuş kartı yerinde açmaz, detay penceresini açar', async () => {
    telefonda(<ContentCard item={yapim} isTrend={false} />)
    const kart = screen.getByRole('button', { name: 'Yapım — detayına bak' })
    expect(kart).not.toHaveAttribute('aria-expanded')
    expect(kart).toHaveAttribute('aria-haspopup', 'dialog')
    fireEvent.click(kart)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    // Kart içinde açılan detay (DetailBody variant=card) ÇİZİLMEZ.
    expect(kart.querySelector('.cc-detail')).toBeNull()
  })

  it('masaüstünde eski davranış: kart yerinde açılır', () => {
    render(<FavoritesProvider><ContentCard item={yapim} isTrend={false} /></FavoritesProvider>)
    const kart = screen.getByRole('button', { name: 'Yapım — detayları aç' })
    fireEvent.click(kart)
    expect(kart).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

// ── Vitrin dokunmatikte ──────────────────────────────────────────────────────
describe('HeroSlider — dokunmatik', () => {
  const yapim = (i) => ({ key: `k${i}`, title: `Yapım ${i}`, year: '2020', type: 'dizi', genres: [], imdbScore: 8, backdropPath: `/b${i}.jpg` })
  const uc = [yapim(1), yapim(2), yapim(3)]

  it('parmakta otomatik dönmez', () => {
    vi.useFakeTimers()
    dokunmatikOrtam(true)
    render(<DeviceProvider><FavoritesProvider><HeroSlider items={uc} /></FavoritesProvider></DeviceProvider>)
    act(() => { vi.advanceTimersByTime(8000) })
    expect(screen.getByText('Yapım 1')).toBeTruthy()
    vi.useRealTimers()
  })

  it('farede döner (kontrol)', () => {
    vi.useFakeTimers()
    render(<DeviceProvider><FavoritesProvider><HeroSlider items={uc} /></FavoritesProvider></DeviceProvider>)
    act(() => { vi.advanceTimersByTime(7100) })
    expect(screen.getByText('Yapım 2')).toBeTruthy()
    vi.useRealTimers()
  })

  it('sola kaydırma ileri, sağa kaydırma geri gider; küçük sapma yok sayılır', () => {
    dokunmatikOrtam(true)
    const { container } = render(<DeviceProvider><FavoritesProvider><HeroSlider items={uc} /></FavoritesProvider></DeviceProvider>)
    const slayt = container.querySelector('.hslide')
    fireEvent.touchStart(slayt, { touches: [{ clientX: 300 }] })
    fireEvent.touchEnd(slayt, { changedTouches: [{ clientX: 200 }] })
    expect(screen.getByText('Yapım 2')).toBeTruthy()
    fireEvent.touchStart(slayt, { touches: [{ clientX: 100 }] })
    fireEvent.touchEnd(slayt, { changedTouches: [{ clientX: 120 }] })
    expect(screen.getByText('Yapım 2')).toBeTruthy()
    fireEvent.touchStart(slayt, { touches: [{ clientX: 100 }] })
    fireEvent.touchEnd(slayt, { changedTouches: [{ clientX: 220 }] })
    expect(screen.getByText('Yapım 1')).toBeTruthy()
  })
})
