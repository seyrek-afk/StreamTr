import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isAnimation, withoutAnimation, readShowAnimation, saveShowAnimation, ANIMATION_PREF_KEY,
  sortItems, makeComparator, effectiveSort, compareByScoreField,
} from '../lib/listLogic.js'

describe('isAnimation (AC-5)', () => {
  it('Türkçe etiketi büyük/küçük harf ve boşluktan bağımsız tanır', () => {
    expect(isAnimation({ genres: ['Animasyon'] })).toBe(true)
    expect(isAnimation({ genres: ['animasyon'] })).toBe(true)
    expect(isAnimation({ genres: [' Animasyon '] })).toBe(true)
    expect(isAnimation({ genres: ['ANİMASYON'] })).toBe(true)
    expect(isAnimation({ genres: ['Aksiyon', 'Animasyon'] })).toBe(true)
  })

  it('animasyon olmayan ya da türü bilinmeyen yapım false', () => {
    expect(isAnimation({ genres: ['Dram'] })).toBe(false)
    expect(isAnimation({ genres: [] })).toBe(false)
    expect(isAnimation({ genres: null })).toBe(false)
    expect(isAnimation({})).toBe(false)
    expect(isAnimation(null)).toBe(false)
    expect(isAnimation(undefined)).toBe(false)
    expect(isAnimation({ genres: [16, null] })).toBe(false)
  })

  it('withoutAnimation animasyonları çıkarır, sırayı korur', () => {
    const list = [
      { title: 'A', genres: ['Dram'] },
      { title: 'B', genres: ['Animasyon'] },
      { title: 'C' },
    ]
    expect(withoutAnimation(list).map(i => i.title)).toEqual(['A', 'C'])
    expect(withoutAnimation(null)).toEqual([])
  })
})

describe('animasyon tercihi — localStorage (FR-1, AC-2)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('boşken varsayılan gizli (false)', () => {
    expect(readShowAnimation()).toBe(false)
  })

  it("'1' / '0' olarak yazılır ve geri okunur", () => {
    saveShowAnimation(true)
    expect(localStorage.getItem(ANIMATION_PREF_KEY)).toBe('1')
    expect(readShowAnimation()).toBe(true)
    saveShowAnimation(false)
    expect(localStorage.getItem(ANIMATION_PREF_KEY)).toBe('0')
    expect(readShowAnimation()).toBe(false)
  })

  it('localStorage hata fırlatırsa çökmez, varsayılana düşer', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('kapalı') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('kota') })
    expect(readShowAnimation()).toBe(false)
    expect(saveShowAnimation(true)).toBe(false)
  })
})

describe('sıralama — Rotten Tomatoes / Letterboxd (AC-14)', () => {
  const titles = list => list.map(i => i.title)

  it('RT azalan, puansız sonda', () => {
    const items = [
      { title: 'a', rottenTomatoesScore: 70 },
      { title: 'b', rottenTomatoesScore: null },
      { title: 'c', rottenTomatoesScore: 95 },
      { title: 'd', rottenTomatoesScore: 80 },
    ]
    const sorted = sortItems(items, { sortBy: 'rt', tab: 'diziler' })
    expect(sorted.map(i => i.rottenTomatoesScore)).toEqual([95, 80, 70, null])
  })

  it('LB azalan, undefined sonda', () => {
    const items = [
      { title: 'a', letterboxdScore: 3.2 },
      { title: 'b' },
      { title: 'c', letterboxdScore: 4.4 },
      { title: 'd', letterboxdScore: 3.9 },
    ]
    const sorted = sortItems(items, { sortBy: 'lb', tab: 'filmler' })
    expect(sorted.map(i => i.letterboxdScore)).toEqual([4.4, 3.9, 3.2, undefined])
  })

  it('sayı olmayan puan da sona gider; 0 puan puansızdan önce gelir', () => {
    const items = [
      { title: 'metin', rottenTomatoesScore: '90' },
      { title: 'nan', rottenTomatoesScore: NaN },
      { title: 'sifir', rottenTomatoesScore: 0 },
      { title: 'elli', rottenTomatoesScore: 50 },
    ]
    const sorted = sortItems(items, { sortBy: 'rt' })
    expect(titles(sorted).slice(0, 2)).toEqual(['elli', 'sifir'])
    expect(titles(sorted).slice(2).sort()).toEqual(['metin', 'nan'])
  })

  it('eşit RT puanında yüksek IMDB önce gelir', () => {
    const items = [
      { title: 'dusuk', rottenTomatoesScore: 88, imdbScore: 7.1 },
      { title: 'yuksek', rottenTomatoesScore: 88, imdbScore: 8.4 },
      { title: 'puansiz-yuksek', rottenTomatoesScore: null, imdbScore: 9.9 },
      { title: 'puansiz-dusuk', rottenTomatoesScore: null, imdbScore: 5 },
    ]
    expect(titles(sortItems(items, { sortBy: 'rt' })))
      .toEqual(['yuksek', 'dusuk', 'puansiz-yuksek', 'puansiz-dusuk'])
  })

  it('karşılaştırıcı alanı doğrudan da kullanılabilir', () => {
    const cmp = compareByScoreField('letterboxdScore')
    expect(cmp({ letterboxdScore: null }, { letterboxdScore: 1 })).toBeGreaterThan(0)
    expect(cmp({ letterboxdScore: 2 }, { letterboxdScore: null })).toBeLessThan(0)
  })

  it('sonuç yeni bir dizi — girdi değişmez', () => {
    const items = [{ title: 'x', rottenTomatoesScore: 1 }, { title: 'y', rottenTomatoesScore: 2 }]
    const before = [...items]
    sortItems(items, { sortBy: 'rt' })
    expect(items).toEqual(before)
  })
})

describe('sıralama — mevcut dallar değişmez (AC-15 regresyon)', () => {
  const items = [
    { title: 'A', imdbScore: 8.5, socialScore: 70, year: '2010', _weightedScore: 7.0, _voteCount: 900 },
    { title: 'B', imdbScore: 7.2, socialScore: 85, year: '2024', _weightedScore: 7.9, _voteCount: 100 },
    { title: 'C', imdbScore: 9.0, socialScore: 60, year: '2018', _weightedScore: 7.0, _voteCount: 5000 },
    { title: 'D', imdbScore: null, socialScore: null, year: null, _weightedScore: 6.0, _voteCount: 50 },
  ]
  const order = (opts) => sortItems(items, opts).map(i => i.title)

  it('imdb / year / social', () => {
    expect(order({ sortBy: 'imdb', tab: 'diziler' })).toEqual(['C', 'A', 'B', 'D'])
    expect(order({ sortBy: 'year', tab: 'diziler' })).toEqual(['B', 'C', 'A', 'D'])
    expect(order({ sortBy: 'social', tab: 'trend' })).toEqual(['B', 'A', 'C', 'D'])
  })

  it('default: trend sosyal, dünya IMDB, ülke ağırlıklı puan (eşitlikte oy sayısı)', () => {
    expect(order({ sortBy: 'default', tab: 'trend' })).toEqual(['B', 'A', 'C', 'D'])
    expect(order({ sortBy: 'default', tab: 'diziler', country: null })).toEqual(['C', 'A', 'B', 'D'])
    expect(order({ sortBy: 'default', tab: 'diziler', country: 'TR' })).toEqual(['B', 'C', 'A', 'D'])
  })

  it('sosyal sıralama trend dışında varsayılana düşer', () => {
    expect(effectiveSort('social', 'diziler')).toBe('default')
    expect(effectiveSort('social', 'trend')).toBe('social')
    expect(effectiveSort('rt', 'diziler')).toBe('rt')
    expect(order({ sortBy: 'social', tab: 'filmler', country: 'TR' })).toEqual(['B', 'C', 'A', 'D'])
  })

  it('bilinmeyen sıralama anahtarı varsayılan gibi davranır', () => {
    const cmp = makeComparator('bilinmeyen', { tab: 'diziler' })
    expect([...items].sort(cmp).map(i => i.title)).toEqual(['C', 'A', 'B', 'D'])
  })
})
