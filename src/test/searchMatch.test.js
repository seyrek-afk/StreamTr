import { describe, it, expect } from 'vitest'
import {
  normalizeTitle, relevanceScore, mergeSearchResults,
  rankSearchResults, typoVariants, shouldShowOriginal,
} from '../lib/searchMatch.js'

describe('normalizeTitle', () => {
  it('Türkçe aksanları ve büyük/küçük farkını siler', () => {
    expect(normalizeTitle('Yıldızlararası')).toBe('yildizlararasi')
    expect(normalizeTitle('YÜZÜKLERİN EFENDİSİ')).toBe('yuzuklerin efendisi')
    expect(normalizeTitle('Şahsiyet')).toBe('sahsiyet')
    expect(normalizeTitle('Çağan Irmak')).toBe('cagan irmak')
  })

  it('aksanlı ve aksansız yazım aynı sonuca iner', () => {
    expect(normalizeTitle('Karayip Korsanları')).toBe(normalizeTitle('Karayip Korsanlari'))
    expect(normalizeTitle('Bir Zamanlar Anadolu\'da')).toBe(normalizeTitle('Bir Zamanlar Anadoluda'))
  })

  it('noktalama ve fazla boşluğu sadeleştirir', () => {
    expect(normalizeTitle('  Spider-Man: No Way Home!  ')).toBe('spider man no way home')
  })

  it('boş/tanımsız girdide boş string döner', () => {
    expect(normalizeTitle('')).toBe('')
    expect(normalizeTitle(null)).toBe('')
    expect(normalizeTitle(undefined)).toBe('')
  })
})

describe('relevanceScore', () => {
  const item = { title: 'Başlangıç', originalTitle: 'Inception' }

  it('tam eşleşme en yüksek puanı alır — hangi dilde yazıldığı fark etmez', () => {
    expect(relevanceScore(item, 'Başlangıç')).toBe(100)
    expect(relevanceScore(item, 'inception')).toBe(100)
  })

  it('ön-ek eşleşmesi içerme eşleşmesinden yüksektir', () => {
    const prefix   = relevanceScore(item, 'incep')
    const contains = relevanceScore({ title: 'The Inception Files', originalTitle: '' }, 'incep')
    expect(prefix).toBe(80)
    expect(contains).toBeLessThan(prefix)
  })

  it('kelime örtüşmesi kısmi puan verir', () => {
    const s = relevanceScore({ title: 'Yüzüklerin Efendisi: İki Kule', originalTitle: '' }, 'yuzuklerin kule')
    expect(s).toBeGreaterThan(0)
    expect(s).toBeLessThan(60)
  })

  it('alakasız sorguda 0 döner', () => {
    expect(relevanceScore(item, 'breaking bad')).toBe(0)
  })

  it('boş sorguda 0 döner', () => {
    expect(relevanceScore(item, '')).toBe(0)
  })
})

describe('mergeSearchResults', () => {
  const trHit = {
    id: 27205, media_type: 'movie', title: 'Başlangıç',
    original_title: 'Inception', release_date: '2010-07-15', popularity: 90,
  }
  const enHit = {
    id: 27205, media_type: 'movie', title: 'Inception',
    original_title: 'Inception', release_date: '2010-07-15', popularity: 90,
  }

  it('aynı yapımı tekilleştirir ve Türkçe adı gösterim adı yapar', () => {
    const out = mergeSearchResults([trHit], [enHit])
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Başlangıç')
    expect(out[0].originalTitle).toBe('Inception')
  })

  it('yalnız bir dilde çıkan sonucu da alır', () => {
    const only = { id: 5, media_type: 'tv', name: 'Hope', original_name: 'Hope', first_air_date: '2020-01-01' }
    const out = mergeSearchResults([], [only])
    expect(out).toHaveLength(1)
    expect(out[0].mediaType).toBe('tv')
    expect(out[0].year).toBe('2020')
  })

  it('kişi/koleksiyon gibi film-dizi olmayan sonuçları eler', () => {
    const person = { id: 9, media_type: 'person', name: 'Nolan' }
    expect(mergeSearchResults([person], [])).toHaveLength(0)
  })

  it('aynı id farklı medya türündeyse ayrı kayıt kalır', () => {
    const a = { id: 1, media_type: 'movie', title: 'X', original_title: 'X' }
    const b = { id: 1, media_type: 'tv',    name:  'X', original_name:  'X' }
    expect(mergeSearchResults([a, b], [])).toHaveLength(2)
  })
})

describe('rankSearchResults', () => {
  it('tam eşleşmeyi popüler ama alakasız sonucun üstüne çıkarır', () => {
    // TMDB salt popülerlikle sıralayınca "Interstellar Wars" öne geçiyordu.
    const items = [
      { title: 'Interstellar Wars', originalTitle: 'Interstellar Wars', popularity: 500 },
      { title: 'Yıldızlararası',    originalTitle: 'Interstellar',      popularity: 100 },
    ]
    const out = rankSearchResults(items, 'interstellar')
    expect(out[0].originalTitle).toBe('Interstellar')
  })

  it('alaka eşitse popülerlik belirler', () => {
    const items = [
      { title: 'A', originalTitle: 'A', popularity: 10 },
      { title: 'A', originalTitle: 'A', popularity: 90 },
    ]
    expect(rankSearchResults(items, 'A')[0].popularity).toBe(90)
  })

  it('girdiyi bozmaz', () => {
    const items = [{ title: 'B', originalTitle: 'B', popularity: 1 }, { title: 'A', originalTitle: 'A', popularity: 9 }]
    rankSearchResults(items, 'A')
    expect(items[0].title).toBe('B')
  })
})

describe('typoVariants', () => {
  it('sondaki fazla harfi kurtaracak kısaltmalar üretir', () => {
    const v = typoVariants('Inceptionn')
    expect(v.length).toBeGreaterThan(0)
    // "Inceptio" TMDB'de Başlangıç'ı buluyor (ön-ek eşleşmesi)
    expect(v[0].startsWith('Incepti')).toBe(true)
  })

  it('kısa sorguda deneme üretmez — çok genel sonuç verirdi', () => {
    expect(typoVariants('abc')).toEqual([])
    expect(typoVariants('Ezel')).toEqual([])
  })

  it('en fazla 2 deneme üretir ve tekrar etmez', () => {
    const v = typoVariants('Breaking Bad Season')
    expect(v.length).toBeLessThanOrEqual(2)
    expect(new Set(v).size).toBe(v.length)
  })

  it('boş girdide boş dizi döner', () => {
    expect(typoVariants('')).toEqual([])
    expect(typoVariants(null)).toEqual([])
  })
})

describe('shouldShowOriginal', () => {
  it('anlamlı biçimde farklıysa gösterir', () => {
    expect(shouldShowOriginal('Başlangıç', 'Inception')).toBe(true)
    expect(shouldShowOriginal('Parazit', 'Parasite')).toBe(true)
  })

  it('yalnız aksan farkı varsa gösterme — gürültü olur', () => {
    expect(shouldShowOriginal('Yıldızlararası', 'Yildizlararasi')).toBe(false)
    expect(shouldShowOriginal('Inception', 'Inception')).toBe(false)
  })

  it('orijinal ad yoksa gösterme', () => {
    expect(shouldShowOriginal('X', null)).toBe(false)
    expect(shouldShowOriginal('X', '')).toBe(false)
  })
})
