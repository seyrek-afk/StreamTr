import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// TMDB_KEY modül yüklenirken okunur: anahtarı ayarlayıp bileşenleri taze içe aktar.
// Sağlayıcı da aynı taze modül grafiğinden gelmeli, yoksa bağlam eşleşmez.
async function yukle() {
  vi.stubEnv('VITE_TMDB_KEY', 'test-key')
  vi.resetModules()
  const { FavoritesProvider } = await import('../contexts/FavoritesContext.jsx')
  const DetailOverlay = (await import('../components/DetailOverlay.jsx')).default
  const ContentCard = (await import('../components/ContentCard.jsx')).default
  return { FavoritesProvider, DetailOverlay, ContentCard }
}

async function overlaySar(item) {
  const { FavoritesProvider, DetailOverlay } = await yukle()
  return render(<FavoritesProvider><DetailOverlay item={item} onClose={() => {}} /></FavoritesProvider>)
}

// Basit TMDB taklidi: URL'ye göre yanıt.
const dizi = (id, ad, ozet) => ({
  id, name: ad, overview: ozet, first_air_date: '2020-03-01', vote_average: 8.04,
  original_name: `${ad} (orijinal)`, genres: [{ name: 'Dram' }], episode_run_time: [45],
  credits: { cast: [{ id: 5, name: 'Oyuncu A', character: 'Rol' }], crew: [] },
  created_by: [{ id: 9, name: 'Yönetmen B' }],
  recommendations: { results: id === 42 ? [{ id: 77, name: 'Benzer Dizi', first_air_date: '2019-01-01' }] : [] },
})
function tmdbYaniti(url) {
  if (url.includes('/watch/providers')) return { results: {} }
  if (url.includes('/reviews')) return { results: [{ author: 'Yorumcu', content: 'Harika.' }] }
  if (url.includes('/videos')) return { results: [] }
  if (url.includes('/person/9/tv_credits')) return { crew: [{ id: 88, job: 'Director', name: 'Başka Dizi', poster_path: '/p.jpg' }] }
  if (url.includes('/tv/77?')) return dizi(77, 'Benzer Dizi', 'Benzer özet')
  return dizi(42, 'Yapım', 'Özet')
}

describe('DetailOverlay — TMDB kimliği çözümleme', () => {
  beforeEach(() => {
    localStorage.clear()
    globalThis.fetch = vi.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(tmdbYaniti(url)) }))
  })
  afterEach(() => { vi.unstubAllEnvs() })

  // REGRESYON: vitrin ("Detaya bak") ve raf kartları _tmdbId/_mediaType taşır.
  // Overlay yalnız tmdbId/mediaType okuyunca istek atmadan "Detay yüklenemedi" diyordu.
  it('kart biçimindeki öğeyi (_tmdbId/_mediaType) yükler', async () => {
    await overlaySar({ title: 'Yapım', _tmdbId: 42, _mediaType: 'tv' })
    await waitFor(() => expect(screen.getByText('Özet')).toBeTruthy())
    expect(screen.queryByText('Detay yüklenemedi.')).toBeNull()
    expect(globalThis.fetch.mock.calls[0][0]).toContain('/tv/42?')
  })

  it('mini/arama biçimindeki öğeyi (tmdbId/mediaType) yükler ve eksik alanları TMDB\'den tamamlar', async () => {
    await overlaySar({ title: 'Yapım', tmdbId: 42, mediaType: 'tv' })
    await waitFor(() => expect(screen.getByText('Özet')).toBeTruthy())
    expect(screen.getByText('Dizi · Dram · 2020 · 45 dk')).toBeTruthy()
    expect(screen.getByText('Orijinal adı: Yapım (orijinal)')).toBeTruthy()
  })

  it('geçersiz kimlikte ağ isteği yapmadan hata gösterir', async () => {
    await overlaySar({ title: 'X', _tmdbId: '../x', _mediaType: 'tv' })
    expect(screen.getByText('Detay yüklenemedi.')).toBeTruthy()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})

// Vitrin/raf overlay'i ile açılan kart AYNI bölümleri göstermeli. Önce overlay
// ayrı bir kopyaydı; benzer yapımlar, yönetmen, RT/LB puanı, popülerlik
// kriterleri ve oyuncu filmografisi eksikti.
describe('Detay içeriği — kart ve overlay eşitliği', () => {
  const vitrinOgesi = {
    title: 'Yapım', year: '2020', type: 'dizi', genres: ['Dram', 'Suç'],
    imdbScore: 8, rottenTomatoesScore: 91, description: 'Kendi özeti',
    trendReason: 'Bu hafta çok konuşuldu', socialScore: 70,
    popularityCriteria: [{ label: 'İzlenme', value: '1M', score: 80, source: 'TMDB' }],
    _tmdbId: 42, _mediaType: 'tv',
  }
  const ortakBolumler = [
    'Kendi özeti', 'Bu hafta çok konuşuldu', 'Popülerlik kriterleri', "Türkiye'de izle",
    'Benzer yapımlar', 'Benzer Dizi', 'Yönetmen B — diğer yapımları', 'Başka Dizi',
    'Oyuncular', 'Öne çıkan yorumlar',
  ]

  beforeEach(() => {
    localStorage.clear()
    globalThis.fetch = vi.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(tmdbYaniti(url)) }))
  })
  afterEach(() => { vi.unstubAllEnvs() })

  it('overlay, açık kartın tüm bölümlerini gösterir', async () => {
    await overlaySar(vitrinOgesi)
    await waitFor(() => expect(screen.getByText('Başka Dizi')).toBeTruthy())
    for (const metin of ortakBolumler) expect(screen.getByText(metin)).toBeTruthy()
    // Overlay'in üst satırı: kartın özetindeki puanlar da burada
    expect(screen.getByText('RT %91')).toBeTruthy()
    // Öğenin kendi özeti TMDB'ninkini ezer (kartla tutarlı)
    expect(screen.queryByText('Özet')).toBeNull()
  })

  it('açık kart da aynı bölümleri gösterir', async () => {
    const { FavoritesProvider, ContentCard } = await yukle()
    render(<FavoritesProvider><ContentCard item={vitrinOgesi} /></FavoritesProvider>)
    fireEvent.click(screen.getByRole('button', { name: /Yapım — detayları aç/ }))
    await waitFor(() => expect(screen.getByText('Başka Dizi')).toBeTruthy())
    for (const metin of ortakBolumler) expect(screen.getByText(metin)).toBeTruthy()
  })

  it('overlay içinde oyuncuya tıklayınca filmografi açılır', async () => {
    globalThis.fetch = vi.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(
      url.includes('/person/5/combined_credits')
        ? { cast: [{ id: 500, media_type: 'movie', title: 'Oyuncunun Filmi', poster_path: '/f.jpg' }] }
        : tmdbYaniti(url)
    ) }))
    await overlaySar(vitrinOgesi)
    await waitFor(() => expect(screen.getByText('Oyuncu A')).toBeTruthy())
    fireEvent.click(screen.getByText('Oyuncu A'))
    await waitFor(() => expect(screen.getByText('Oyuncunun Filmi')).toBeTruthy())
  })

  // Pencere içinden benzer yapıma geçiş ikinci pencere açmaz; Geri ile dönülür.
  it('benzer yapıma tıklamak içeriği değiştirir, Geri önceki yapıma döner', async () => {
    await overlaySar(vitrinOgesi)
    await waitFor(() => expect(screen.getByText('Benzer Dizi')).toBeTruthy())
    fireEvent.click(screen.getByText('Benzer Dizi'))
    await waitFor(() => expect(screen.getByText('Benzer özet')).toBeTruthy())
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Benzer Dizi')

    fireEvent.click(screen.getByRole('button', { name: 'Geri: Yapım' }))
    await waitFor(() => expect(screen.getByText('Kendi özeti')).toBeTruthy())
    expect(screen.queryByRole('button', { name: /^Geri:/ })).toBeNull()
  })
})
