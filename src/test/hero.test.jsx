import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { pickHeroItem } from '../lib/hero.js'
import { FavoritesProvider } from '../contexts/FavoritesContext.jsx'
import HeroSpotlight from '../components/HeroSpotlight.jsx'

const ITEM = {
  title: 'Kurak Günler',
  type: 'film',
  year: '2022',
  imdbScore: 7.3,
  genres: ['Dram', 'Gerilim'],
  description: 'Küçük bir kasabaya atanan savcı, kuraklıkla birlikte yüzeye çıkan bir suçun izini sürer.',
  posterPath: '/abc.jpg',
  socialScore: 80,
}

const renderHero = (item) =>
  render(<FavoritesProvider><HeroSpotlight item={item} /></FavoritesProvider>)

describe('pickHeroItem', () => {
  it('socialScore en yüksek olanı seçer', () => {
    const items = [
      { title: 'A', socialScore: 61 },
      { title: 'B', socialScore: 93 },
      { title: 'C', socialScore: 77 },
    ]
    expect(pickHeroItem(items).title).toBe('B')
  })

  // TUTARLILIK REGRESYONU: trend ızgarası da socialScore'a göre sıralanır.
  // Hero ham liste sırasını (veya trendRank'i) kullanırsa "1. sıradaki yapım"
  // hero'da ve ızgaranın ilk kartında FARKLI çıkar.
  it('ham liste sırasını değil socialScore sırasını kullanır', () => {
    const items = [
      { title: 'Listede ilk', socialScore: 40, trendRank: 1 },
      { title: 'Sosyalde ilk', socialScore: 95, trendRank: 9 },
    ]
    expect(pickHeroItem(items).title).toBe('Sosyalde ilk')
  })

  it('kaynak diziyi yerinde sıralamaz', () => {
    const items = [{ title: 'A', socialScore: 10 }, { title: 'B', socialScore: 90 }]
    pickHeroItem(items)
    expect(items[0].title).toBe('A')
  })

  it('boş, tanımsız ve dizi olmayan girdide null döner', () => {
    expect(pickHeroItem([])).toBeNull()
    expect(pickHeroItem(undefined)).toBeNull()
    expect(pickHeroItem(null)).toBeNull()
  })

  it('socialScore taşımayan kayıtlarda çökmez', () => {
    expect(pickHeroItem([{ title: 'A' }, { title: 'B' }]).title).toBe('A')
  })
})

describe('HeroSpotlight', () => {
  it('konu yoksa hiçbir şey çizmez', () => {
    const { container } = renderHero(null)
    expect(container.querySelector('.hero')).toBeNull()
  })

  it('künyeyi ve puanı gösterir', () => {
    renderHero(ITEM)
    expect(screen.getByText('Kurak Günler')).toBeTruthy()
    expect(screen.getByText('Bu hafta perdede')).toBeTruthy()
    expect(screen.getByText(/Film · Dram · Gerilim · 2022/)).toBeTruthy()
    expect(screen.getByText('7.3')).toBeTruthy()
  })

  // Ekran okuyucu düğmeyi bağlamsız duyduğunda "Detaya bak" hangi yapım belli
  // olmalı; görünen etiketin kısa kalması bunu bozmamalı.
  it('eylem düğmesinin erişilebilir adı yapım adını taşır', () => {
    renderHero(ITEM)
    expect(screen.getByRole('button', { name: 'Kurak Günler detayına bak' })).toBeTruthy()
  })

  // Poster fare için tıklanabilir ama klavye/AT için gizli: aynı eylemin iki
  // durağı olmasın. Poster tekrar odaklanabilir hâle gelirse bu test düşer.
  it('poster klavye sırasında ve erişilebilirlik ağacında yer almaz', () => {
    const { container } = renderHero(ITEM)
    const hit = container.querySelector('.hero-poster-hit')
    expect(hit).toBeTruthy()
    expect(hit.getAttribute('tabindex')).toBe('-1')
    expect(hit.getAttribute('aria-hidden')).toBe('true')
  })

  it('özet yoksa boş paragraf bırakmaz', () => {
    const { container } = renderHero({ ...ITEM, description: '' })
    expect(container.querySelector('.hero-desc')).toBeNull()
  })
})
