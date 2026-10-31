import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import React from 'react'
import HeroSlider from '../components/HeroSlider.jsx'
import { HeroSkeleton } from '../components/SkeletonGrid.jsx'
import SaveControls from '../components/SaveControls.jsx'
import UndoToast from '../components/UndoToast.jsx'
import { FavoritesProvider } from '../contexts/FavoritesContext.jsx'

// Vitrinin CANLI katmanı: ölçer (.hslide-olcu) tüm başlıkları görünmez taşır.
const aktif = () => within(document.querySelector('.hslide-live'))

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
    expect(aktif().getByText('Yapım 1')).toBeTruthy()
    expect(container.querySelectorAll('.hslide-dot')).toHaveLength(3)
  })

  it('geniş görsel iki boyla (w780/w1280) srcset taşır — telefon küçük boyu indirir', () => {
    const { container } = sar(<HeroSlider items={uc} />)
    const img = container.querySelector('.hslide-img')
    expect(img.getAttribute('src')).toContain('/w1280/b1.jpg')
    expect(img.getAttribute('srcset')).toContain('/w780/b1.jpg 780w')
    expect(img.getAttribute('srcset')).toContain('/w1280/b1.jpg 1280w')
    expect(img.getAttribute('sizes')).toContain('100vw')
  })

  it('poster yedeğinde srcset yok — tek boy yeter', () => {
    const { container } = sar(<HeroSlider items={[{ ...yapim(1), backdropPath: null, posterPath: '/p1.jpg' }]} />)
    const img = container.querySelector('.hslide-img')
    expect(img.getAttribute('src')).toContain('/w780/p1.jpg')
    expect(img.hasAttribute('srcset')).toBe(false)
  })

  it('count ile sınırlanır — vitrin tüm listeyi taşımaz', () => {
    const { container } = sar(<HeroSlider items={[...uc, yapim(4), yapim(5)]} count={2} />)
    expect(container.querySelectorAll('.hslide-dot')).toHaveLength(2)
  })

  it('ok ileri gider ve sonda başa sarar', () => {
    sar(<HeroSlider items={uc} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki öneri' }))
    expect(aktif().getByText('Yapım 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki öneri' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki öneri' }))
    expect(aktif().getByText('Yapım 1')).toBeTruthy()
  })

  it('geri ok baştan sona sarar', () => {
    sar(<HeroSlider items={uc} />)
    fireEvent.click(screen.getByRole('button', { name: 'Önceki öneri' }))
    expect(aktif().getByText('Yapım 3')).toBeTruthy()
  })

  it('noktaya tıklamak doğrudan o yapıma gider ve seçili olanı bildirir', () => {
    sar(<HeroSlider items={uc} />)
    fireEvent.click(screen.getByRole('tab', { name: '3. öneri: Yapım 3' }))
    expect(aktif().getByText('Yapım 3')).toBeTruthy()
    expect(screen.getByRole('tab', { name: '3. öneri: Yapım 3' }).getAttribute('aria-selected')).toBe('true')
  })

  // Kicker çağırandan gelir: aynı bileşen Diziler'de "Listenin zirvesinde",
  // Trend'de "Bu hafta perdede", Bana Özel'de "Bana özel öneri" der. Bileşenin
  // hangi listeyi taşıdığını bilmesi gerekmez.
  // Bana Özel: gerekçe ("Beğendiğin: …") başlığın üstünde eyebrow olarak değil,
  // en altta "Neden önerildi" etiketiyle durur — ad önce, açıklama sonra.
  const gerekceliUc = uc.map((d, i) => ({ ...d, _reason: i === 2 ? undefined : `Beğendiğin: Dizi ${i}` }))

  it('gerekçeli öneride başlık en üstte, gerekçe en altta etiketiyle durur', () => {
    sar(<HeroSlider items={gerekceliUc} kicker="Bana özel öneri" />)
    const canli = document.querySelector('.hslide-live')
    expect(canli.querySelector('.hslide-kick')).toBeNull()
    expect(canli.firstElementChild.classList.contains('hslide-title')).toBe(true)
    const gerekce = canli.querySelector('.hslide-reason')
    expect(gerekce).toBe(canli.lastElementChild)
    expect(within(gerekce).getByText('Neden önerildi')).toBeTruthy()
    expect(within(gerekce).getByText('Beğendiğin: Dizi 0')).toBeTruthy()
    expect(within(gerekce).getByText('1 / 3')).toBeTruthy()
  })

  it('aynı vitrinde gerekçesiz öneri etiket yerine genel kicker metnini taşır', () => {
    const { container } = sar(<HeroSlider items={gerekceliUc} kicker="Bana özel öneri" />)
    fireEvent.click(container.querySelectorAll('.hslide-dot')[2])
    const gerekce = document.querySelector('.hslide-live .hslide-reason')
    expect(within(gerekce).queryByText('Neden önerildi')).toBeNull()
    expect(within(gerekce).getByText('Bana özel öneri')).toBeTruthy()
    expect(document.querySelector('.hslide-live .hslide-kick')).toBeNull()
  })

  it('kicker metnini ve sıra sayacını çağırandan alır', () => {
    sar(<HeroSlider items={uc} kicker="Bu hafta perdede" />)
    expect(aktif().getByText(/Bu hafta perdede/)).toBeTruthy()
    expect(aktif().getByText('1 / 3')).toBeTruthy()
  })

  it('kicker verilmezse güvenli bir metne düşer', () => {
    sar(<HeroSlider items={uc} />)
    expect(aktif().getByText(/Listenin zirvesinde/)).toBeTruthy()
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
    expect(aktif().getByText('Yapım 1')).toBeTruthy()
    vi.useRealTimers()
  })

  it('azaltılmış hareket kapalıyken kendiliğinden döner', () => {
    vi.useFakeTimers()
    sar(<HeroSlider items={uc} />)
    act(() => { vi.advanceTimersByTime(7100) })
    expect(aktif().getByText('Yapım 2')).toBeTruthy()
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

  it('boştan doğrudan herhangi bir duruma geçilebilir', () => {
    sar(<SaveControls item={yapim(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Bayıldım olarak işaretle' }))
    expect(screen.getByRole('button', { name: 'Bayıldım işaretini kaldır' }).getAttribute('aria-pressed')).toBe('true')
  })

  // ÜÇÜ BİRBİRİNİ DIŞLAR: son seçim kazanır, aynı anda yalnız biri işaretli.
  it('yeni seçim öncekini bırakır — hiçbir zaman iki düğme birden basılı olmaz', () => {
    const { container } = sar(<SaveControls item={yapim(1)} />)
    const basiliSayisi = () =>
      container.querySelectorAll('.save-btn[aria-pressed="true"]').length

    fireEvent.click(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }))
    expect(basiliSayisi()).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'İzleyeceklerime ekle' }))
    expect(basiliSayisi()).toBe(1)
    expect(screen.getByRole('button', { name: 'Beğendim olarak işaretle' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Bayıldım olarak işaretle' }))
    expect(basiliSayisi()).toBe(1)
    expect(screen.getByRole('button', { name: 'İzleyeceklerime ekle' })).toBeTruthy()
  })

  it('aynı düğmeye tekrar basmak durumu kaldırır', () => {
    const { container } = sar(<SaveControls item={yapim(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Beğenimi kaldır' }))
    expect(container.querySelectorAll('.save-btn[aria-pressed="true"]')).toHaveLength(0)
  })

  it('grubun erişilebilir adı yapımı söyler', () => {
    sar(<SaveControls item={yapim(1)} />)
    expect(screen.getByRole('group', { name: 'Yapım 1 — kaydetme' })).toBeTruthy()
  })
})

describe('UndoToast — geri al bildirimi', () => {
  beforeEach(() => { localStorage.clear() })

  const sarToast = (ui) => render(
    <FavoritesProvider>{ui}<UndoToast /></FavoritesProvider>
  )

  it('durum değişince ne olduğunu SOMUT söyler ve geri al sunar', () => {
    sarToast(<SaveControls item={yapim(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }))
    expect(screen.getByText(/Beğendiklerime eklendi/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Geri al/ })).toBeTruthy()
  })

  // Dışlayıcı modelde en kritik bilgi ÖNCEKİ durumun silindiğidir; mesaj
  // "kaydedildi" deyip geçerse kullanıcı ne kaybettiğini bilemez.
  it('taşıma mesajı hem çıkılan hem girilen listeyi adlandırır', () => {
    sarToast(<SaveControls item={yapim(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bayıldım olarak işaretle' }))
    expect(screen.getByText(/Beğendiklerimden Bayıldıklarıma taşındı/)).toBeTruthy()
  })

  it('geri al önceki durumu gerçekten geri yükler', () => {
    const { container } = sarToast(<SaveControls item={yapim(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bayıldım olarak işaretle' }))
    fireEvent.click(screen.getByRole('button', { name: /Geri al/ }))
    expect(screen.getByRole('button', { name: 'Beğenimi kaldır' }).getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelectorAll('.save-btn[aria-pressed="true"]')).toHaveLength(1)
  })

  // Geri alma yeni bir "son işlem" üretmemeli, yoksa bildirim kendi kendini
  // doğurur ve kullanıcı döngüden çıkamaz.
  it('geri aldıktan sonra bildirim kapanır', () => {
    sarToast(<SaveControls item={yapim(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }))
    fireEvent.click(screen.getByRole('button', { name: /Geri al/ }))
    expect(screen.queryByRole('button', { name: /Geri al/ })).toBeNull()
  })

  it('odağı çalmaz — role=status ile duyurur', () => {
    sarToast(<SaveControls item={yapim(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Beğendim olarak işaretle' }))
    expect(screen.getByRole('status')).toBeTruthy()
  })
})

describe('HeroSkeleton', () => {
  it('vitrinle aynı iskelet sınıflarını taşır ve ekran okuyucudan gizlidir', () => {
    const { container } = render(<HeroSkeleton />)
    const kok = container.querySelector('.hslider.hslide-skeleton')
    expect(kok).toBeTruthy()
    expect(kok.getAttribute('aria-hidden')).toBe('true')
    expect(kok.querySelector('.hslide-media')).toBeTruthy()
    expect(kok.querySelector('.hslide-body')).toBeTruthy()
    expect(kok.querySelector('.hslide-nav')).toBeTruthy()
  })
})
