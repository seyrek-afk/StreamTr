import { describe, it, expect } from 'vitest'
import {
  weightedScore, sortByWeightedScore, discoverUrl, listParams, poolMean,
  VOTE_MIN, BAYES_M, BAYES_C,
} from '../lib/discover.js'
import { COUNTRIES, countryLabel, countryContentTitle, isKnownCountry } from '../constants/countries.js'

describe('weightedScore — Bayesian ağırlıklı puan', () => {
  it('düşük oylu yüksek ortalamayı havuz ortalamasına çeker', () => {
    const s = weightedScore(10, 3, 'tv')
    expect(s).toBeLessThan(8.5)
    expect(s).toBeGreaterThan(BAYES_C.tv)
  })

  it('yüksek oy sayısında ham ortalamaya yaklaşır', () => {
    expect(Math.abs(weightedScore(8.2, 3000, 'tv') - 8.2)).toBeLessThan(0.05)
  })

  it('oy sayısı m ile eşitken ortalama ile C tam ortada buluşur', () => {
    expect(weightedScore(9, BAYES_M, 'tv')).toBeCloseTo((9 + BAYES_C.tv) / 2, 5)
  })

  it('dizi ve film için farklı havuz ortalaması kullanır', () => {
    expect(weightedScore(8, 30, 'tv')).toBeGreaterThan(weightedScore(8, 30, 'movie'))
  })

  it('havuz ortalaması dışarıdan geçilebilir — ülkeler birbirinden farklı', () => {
    // Yüksek ortalamalı bir havuzda aynı yapım daha yukarı çekilir.
    const dusukHavuz = weightedScore(8, 30, 'tv', 5.0)
    const yuksekHavuz = weightedScore(8, 30, 'tv', 8.0)
    expect(yuksekHavuz).toBeGreaterThan(dusukHavuz)
  })

  it('geçersiz havuz ortalamasında yedek sabite düşer', () => {
    expect(weightedScore(8, 30, 'tv', 0)).toBeCloseTo(weightedScore(8, 30, 'tv'), 10)
    expect(weightedScore(8, 30, 'tv', null)).toBeCloseTo(weightedScore(8, 30, 'tv'), 10)
  })

  it('asıl koruma: tek haneli oylu mükemmel puan, çok oylu iyi puanı GEÇEMEZ', () => {
    expect(weightedScore(8.2, 3135, 'tv')).toBeGreaterThan(weightedScore(10, 3, 'tv'))
  })

  it('geçersiz/sıfır girdilerde 0 döner', () => {
    expect(weightedScore(0, 100, 'tv')).toBe(0)
    expect(weightedScore(8, 0, 'tv')).toBe(0)
    expect(weightedScore(null, null, 'tv')).toBe(0)
    expect(weightedScore('abc', 'xyz', 'tv')).toBe(0)
  })
})

describe('poolMean', () => {
  it('yeterli örnek varsa ortalamayı döner', () => {
    const items = Array.from({ length: 25 }, () => ({ vote_average: 8 }))
    expect(poolMean(items)).toBeCloseTo(8, 5)
  })

  it('yetersiz örnekte null döner — 3 öğeden havuz ortalaması gürültüdür', () => {
    expect(poolMean([{ vote_average: 9 }, { vote_average: 8 }])).toBeNull()
    expect(poolMean([])).toBeNull()
    expect(poolMean(null)).toBeNull()
  })

  it('sıfır/geçersiz puanları hesaba katmaz', () => {
    const items = [
      ...Array.from({ length: 20 }, () => ({ vote_average: 7 })),
      ...Array.from({ length: 5 },  () => ({ vote_average: 0 })),
    ]
    expect(poolMean(items)).toBeCloseTo(7, 5)
  })
})

describe('sortByWeightedScore', () => {
  it('azalan skora göre sıralar ve girdiyi bozmaz', () => {
    const input = [
      { title: 'a', _weightedScore: 5 },
      { title: 'b', _weightedScore: 9 },
      { title: 'c', _weightedScore: 7 },
    ]
    expect(sortByWeightedScore(input).map(x => x.title)).toEqual(['b', 'c', 'a'])
    expect(input.map(x => x.title)).toEqual(['a', 'b', 'c'])
  })

  it('eşit skorda oy sayısı yüksek olan öne gelir', () => {
    const out = sortByWeightedScore([
      { title: 'az',  _weightedScore: 8, _voteCount: 30 },
      { title: 'cok', _weightedScore: 8, _voteCount: 900 },
    ])
    expect(out[0].title).toBe('cok')
  })

  it('boş/tanımsız girdide boş dizi döner', () => {
    expect(sortByWeightedScore([])).toEqual([])
    expect(sortByWeightedScore(undefined)).toEqual([])
  })
})

describe('discoverUrl', () => {
  it('ülke verilirse with_origin_country uygular', () => {
    const url = discoverUrl('tv', { country: 'KR', apiKey: 'k' })
    expect(url).toContain('/discover/tv')
    expect(url).toContain('with_origin_country=KR')
    expect(url).toContain('language=tr-TR')
  })

  it('ülke verilmezse küresel keşif olur', () => {
    expect(discoverUrl('movie', { apiKey: 'k' })).not.toContain('with_origin_country')
  })

  it('nokta içeren parametre anahtarlarını korur', () => {
    const url = discoverUrl('movie', { country: 'TR', page: 3, apiKey: 'k', 'vote_count.gte': 20 })
    expect(url).toContain('page=3')
    expect(decodeURIComponent(url)).toContain('vote_count.gte=20')
  })

  it('boş/undefined parametreleri atlar', () => {
    const url = discoverUrl('tv', { apiKey: 'k', sort_by: undefined, with_genres: '' })
    expect(url).not.toContain('sort_by')
    expect(url).not.toContain('with_genres')
  })
})

describe('listParams', () => {
  it('oy eşiği ve sunucu sıralaması içerir', () => {
    expect(listParams()['vote_count.gte']).toBe(VOTE_MIN)
    expect(listParams().sort_by).toBe('vote_average.desc')
  })
})

describe('COUNTRIES', () => {
  it('Türkiye ve Güney Kore listede', () => {
    const codes = COUNTRIES.map(c => c.code)
    expect(codes).toContain('TR')
    expect(codes).toContain('KR')
  })

  it('ülke kodları tekildir ve iki harflidir', () => {
    const codes = COUNTRIES.map(c => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    codes.forEach(c => expect(c).toMatch(/^[A-Z]{2}$/))
  })

  it('her ülkenin Türkçe adı vardır', () => {
    COUNTRIES.forEach(c => expect(typeof c.label).toBe('string'))
    COUNTRIES.forEach(c => expect(c.label.length).toBeGreaterThan(1))
  })

  it('countryLabel bilinmeyen kodda kodun kendisine düşer', () => {
    expect(countryLabel('KR')).toBe('Güney Kore')
    expect(countryLabel('ZZ')).toBe('ZZ')
  })

  // DİLBİLGİSİ REGRESYONU: sıfat karşılığı olan ülkede isim tamlaması kurulur
  // ("Türk dizileri"), olmayanda sıfat öbeği ("Norveç yapımı diziler"). Tek
  // biçim ikisine birden uygulanırsa biri daima bozulur — üretimde ızgara
  // başlığı "Tüm Türk diziler", raf başlığı "… Norveç yapımı Dizileri"
  // üretiyordu.
  it('countryContentTitle sıfatlı ülkede tamlama kurar', () => {
    expect(countryContentTitle('TR', 'dizi')).toBe('Türk dizileri')
    expect(countryContentTitle('TR', 'film')).toBe('Türk filmleri')
    expect(countryContentTitle('KR', 'dizi')).toBe('Kore dizileri')
  })

  it('countryContentTitle sıfatı olmayan ülkede uydurmaz, sıfat öbeğine düşer', () => {
    expect(countryContentTitle('NO', 'dizi')).toBe('Norveç yapımı diziler')
    expect(countryContentTitle('NO', 'film')).toBe('Norveç yapımı filmler')
    // Fazla tamlama kurulmamalı
    expect(countryContentTitle('NO', 'dizi')).not.toContain('dizileri')
  })

  it('countryContentTitle başlık düzeninde her sözcüğü büyütür', () => {
    expect(countryContentTitle('TR', 'dizi', { titleCase: true })).toBe('Türk Dizileri')
    expect(countryContentTitle('NO', 'film', { titleCase: true })).toBe('Norveç Yapımı Filmler')
  })

  it('isKnownCountry doğrular', () => {
    expect(isKnownCountry('JP')).toBe(true)
    expect(isKnownCountry('ZZ')).toBe(false)
  })
})
