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
  it('sıralı listenin başını verir', () => {
    const items = [{ title: 'A' }, { title: 'B' }, { title: 'C' }]
    expect(pickHeroItem(items).title).toBe('A')
  })

  // TUTARLILIK REGRESYONU: sıralama ölçütü sekmeye göre değişir (trend sosyal
  // etkiye, ülke merceği ağırlıklı puana, Dünya ham IMDB'ye bakar) ve ızgarada
  // bir kez uygulanır. Bu fonksiyon kendi başına yeniden sıralarsa — hangi
  // ölçütle olursa olsun — "1. sıradaki yapım" hero'da ve ızgaranın ilk
  // kartında FARKLI çıkar. O yüzden burada sıralama OLMAMALI.
  it('kendi başına yeniden sıralamaz: puanı düşük olsa da başı verir', () => {
    const items = [
      { title: 'Izgaranın ilki', imdbScore: 6.1, socialScore: 40, _weightedScore: 3 },
      { title: 'Puanı yüksek',   imdbScore: 9.4, socialScore: 99, _weightedScore: 9 },
    ]
    expect(pickHeroItem(items).title).toBe('Izgaranın ilki')
  })

  it('kaynak diziye dokunmaz', () => {
    const items = [{ title: 'A' }, { title: 'B' }]
    pickHeroItem(items)
    expect(items.map(i => i.title)).toEqual(['A', 'B'])
  })

  it('boş, tanımsız ve dizi olmayan girdide null döner', () => {
    expect(pickHeroItem([])).toBeNull()
    expect(pickHeroItem(undefined)).toBeNull()
    expect(pickHeroItem(null)).toBeNull()
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
    expect(screen.getByText(/Film · Dram · Gerilim · 2022/)).toBeTruthy()
    expect(screen.getByText('7.3')).toBeTruthy()
  })

  // Kicker sekmeye göre değişir: Trend'de "bu hafta" doğrudur, Diziler'de
  // yanıltıcı olurdu (o liste haftalık değil, puan sıralı).
  it('kicker metnini çağırandan alır', () => {
    render(
      <FavoritesProvider><HeroSpotlight item={ITEM} kicker="Bu hafta perdede" /></FavoritesProvider>
    )
    expect(screen.getByText('Bu hafta perdede')).toBeTruthy()
  })

  it('kicker verilmezse sekmeden bağımsız güvenli bir metne düşer', () => {
    renderHero(ITEM)
    expect(screen.getByText('Listenin zirvesinde')).toBeTruthy()
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
