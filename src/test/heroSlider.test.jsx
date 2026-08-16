import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import HeroSlider from '../components/HeroSlider.jsx'
import SaveControls from '../components/SaveControls.jsx'
import { FavoritesProvider } from '../contexts/FavoritesContext.jsx'

const sar = (ui) => render(<FavoritesProvider>{ui}</FavoritesProvider>)

const yapim = (i) => ({
  key: `k${i}`, title: `Yapım ${i}`, year: '2020', type: 'dizi',
  genres: ['Dram'], imdbScore: 8, description: `Özet ${i}`,
  backdropPath: `/b${i}.jpg`, _tmdbId: i, _mediaType: 'tv',
})
const uc = [yapim(1), yapim(2), yapim(3)]

describe('HeroSlider', () => {
  beforeEach(() => {
    localStorage.clear()
    // Varsayılan: azaltılmış hareket KAPALI
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener() {}, removeListener() {} })
  })

  it('öneri yoksa hiçbir şey çizmez', () => {
    const { container } = sar(<HeroSlider items={[]} />)
    expect(container.querySelector('.hslider')).toBeNull()
  })

  it('ilk yapımı gösterir ve her yapım için bir nokta çizer', () => {
    const { container } = sar(<HeroSlider items={uc} />)
    expect(screen.getByText('Yapım 1')).toBeTruthy()
    expect(container.querySelectorAll('.hslide-dot')).toHaveLength(3)
  })

  it('count ile sınırlanır — vitrin tüm listeyi taşımaz', () => {
    const { container } = sar(<HeroSlider items={[...uc, yapim(4), yapim(5)]} count={2} />)
    expect(container.querySelectorAll('.hslide-dot')).toHaveLength(2)
  })

  it('ok ileri gider ve sonda başa sarar', () => {
    sar(<HeroSlider items={uc} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki öneri' }))
    expect(screen.getByText('Yapım 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki öneri' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki öneri' }))
    expect(screen.getByText('Yapım 1')).toBeTruthy()
  })

  it('geri ok baştan sona sarar', () => {
    sar(<HeroSlider items={uc} />)
    fireEvent.click(screen.getByRole('button', { name: 'Önceki öneri' }))
    expect(screen.getByText('Yapım 3')).toBeTruthy()
  })

  it('noktaya tıklamak doğrudan o yapıma gider ve seçili olanı bildirir', () => {
    sar(<HeroSlider items={uc} />)
    fireEvent.click(screen.getByRole('tab', { name: '3. öneri: Yapım 3' }))
    expect(screen.getByText('Yapım 3')).toBeTruthy()
    expect(screen.getByRole('tab', { name: '3. öneri: Yapım 3' }).getAttribute('aria-selected')).toBe('true')
  })

  // Kicker çağırandan gelir: aynı bileşen Diziler'de "Listenin zirvesinde",
  // Trend'de "Bu hafta perdede", Bana Özel'de "Bana özel öneri" der. Bileşenin
  // hangi listeyi taşıdığını bilmesi gerekmez.
  it('kicker metnini ve sıra sayacını çağırandan alır', () => {
    sar(<HeroSlider items={uc} kicker="Bu hafta perdede" />)
    expect(screen.getByText(/Bu hafta perdede/)).toBeTruthy()
    expect(screen.getByText('1 / 3')).toBeTruthy()
  })

  it('kicker verilmezse güvenli bir metne düşer', () => {
    sar(<HeroSlider items={uc} />)
    expect(screen.getByText(/Listenin zirvesinde/)).toBeTruthy()
  })

  it('tek yapım varsa ok ve nokta çizilmez — tıklanacak bir şey yok', () => {
    const { container } = sar(<HeroSlider items={[yapim(1)]} />)
    expect(screen.queryByRole('button', { name: 'Sonraki öneri' })).toBeNull()
    expect(container.querySelectorAll('.hslide-dot')).toHaveLength(0)
  })

  // ERİŞİLEBİLİRLİK KURALI: kendi kendine hareket eden blok, vestibüler
  // duyarlılığı olan kullanıcı için en rahatsız edici öğedir. Tercih açıksa
  // otomatik dönüş HİÇ başlamaz — yavaşlamaz, durur.
  it('azaltılmış hareket açıkken kendiliğinden dönmez', () => {
    vi.useFakeTimers()
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addListener() {}, removeListener() {} })
    sar(<HeroSlider items={uc} />)
    act(() => { vi.advanceTimersByTime(30000) })
    expect(screen.getByText('Yapım 1')).toBeTruthy()
    vi.useRealTimers()
  })

  it('azaltılmış hareket kapalıyken kendiliğinden döner', () => {
    vi.useFakeTimers()
    sar(<HeroSlider items={uc} />)
    act(() => { vi.advanceTimersByTime(7100) })
    expect(screen.getByText('Yapım 2')).toBeTruthy()
    vi.useRealTimers()
  })
})

describe('SaveControls — üçlü grup', () => {
  beforeEach(() => { localStorage.clear() })

  it('üç simgeyi de aynı anda gösterir — hiçbiri gizli değil', () => {
    sar(<SaveControls item={yapim(1)} />)
    expect(screen.getByRole('button', { name: 'Beğendim olarak işaretle' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Bayıldım olarak işaretle' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'İzleyeceklerime ekle' })).toBeTruthy()
  })

  // Doğrudan seçim: 1. kademeden geçmeden 2. kademeye gidilebilmeli.
  it('boştan doğrudan Bayıldım seçilebilir', () => {
    sar(<SaveControls item={yapim(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Bayıldım olarak işaretle' }))
    expect(screen.getByRole('button', { name: 'Bayıldım işaretini kaldır' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }).getAttribute('aria-pressed')).toBe('false')
  })

  // İki kademe aynı eksen: biri seçilince diğeri bırakılmalı.
  it('Beğendim ile Bayıldım birbirini dışlar', () => {
    sar(<SaveControls item={yapim(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }))
    expect(screen.getByRole('button', { name: 'Beğenimi kaldır' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Bayıldım olarak işaretle' }))
    expect(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Bayıldım işaretini kaldır' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('aynı düğmeye tekrar basmak seçimi kaldırır', () => {
    sar(<SaveControls item={yapim(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Beğenimi kaldır' }))
    expect(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('ayraç beğeniden bağımsız çalışır', () => {
    sar(<SaveControls item={yapim(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'İzleyeceklerime ekle' }))
    expect(screen.getByRole('button', { name: 'İzleyeceklerimden çıkar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('grubun erişilebilir adı yapımı söyler', () => {
    sar(<SaveControls item={yapim(1)} />)
    expect(screen.getByRole('group', { name: 'Yapım 1 — kaydetme' })).toBeTruthy()
  })
})
