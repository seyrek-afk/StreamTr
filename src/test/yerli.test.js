import { describe, it, expect } from 'vitest'
import {
  yerliScore, sortByYerliScore, discoverUrl, yerliListParams,
  TR_VOTE_MIN, BAYES_M, BAYES_C,
} from '../lib/yerli.js'

describe('yerliScore — Bayesian ağırlıklı puan', () => {
  it('düşük oylu yüksek ortalamayı havuz ortalamasına çeker', () => {
    // 3 oyla 10.0 → ham ortalama yanıltıcı; ağırlıklı puan çok daha düşük olmalı
    const s = yerliScore(10, 3, 'tv')
    expect(s).toBeLessThan(8.5)
    expect(s).toBeGreaterThan(BAYES_C.tv)
  })

  it('yüksek oy sayısında ham ortalamaya yaklaşır', () => {
    const s = yerliScore(8.2, 3000, 'tv')
    expect(Math.abs(s - 8.2)).toBeLessThan(0.05)
  })

  it('oy sayısı m ile eşitken ortalama ile C tam ortada buluşur', () => {
    const s = yerliScore(9, BAYES_M, 'tv')
    expect(s).toBeCloseTo((9 + BAYES_C.tv) / 2, 5)
  })

  it('dizi ve film için farklı havuz ortalaması kullanır', () => {
    // Aynı ham veri, farklı medya türü → film havuzunun ortalaması daha düşük
    const tv    = yerliScore(8, 30, 'tv')
    const movie = yerliScore(8, 30, 'movie')
    expect(tv).toBeGreaterThan(movie)
  })

  it('bilinmeyen medya türünde dizi ortalamasına düşer', () => {
    expect(yerliScore(8, 30, 'bilinmeyen')).toBeCloseTo(yerliScore(8, 30, 'tv'), 10)
  })

  it('geçersiz/sıfır girdilerde 0 döner', () => {
    expect(yerliScore(0, 100, 'tv')).toBe(0)
    expect(yerliScore(8, 0, 'tv')).toBe(0)
    expect(yerliScore(null, null, 'tv')).toBe(0)
    expect(yerliScore(undefined, 50, 'tv')).toBe(0)
    expect(yerliScore('abc', 'xyz', 'tv')).toBe(0)
  })

  it('asıl koruma: tek haneli oylu mükemmel puan, çok oylu iyi puanı GEÇEMEZ', () => {
    // Sen Çal Kapımı (3135 oy, 8.2) vs 3 oyla 10/10 alan bir yapım.
    // Ham ortalamada ikincisi listenin başına geçerdi; ağırlıklı puanda geçemez.
    expect(yerliScore(8.2, 3135, 'tv')).toBeGreaterThan(yerliScore(10, 3, 'tv'))
  })

  it('makul örneklemli yüksek puan meşru biçimde öne geçebilir', () => {
    // Yabani (54 oy, 8.7) vs Sen Çal Kapımı (3135 oy, 8.2).
    // 54 oy m=25'in iki katından fazla: örneklem yeterli, 8.7 > 8.2 gerçek bir fark.
    // Bayesian önceliğin amacı az oylu UÇLARI bastırmaktır, makul örneklemi değil.
    expect(yerliScore(8.7, 54, 'tv')).toBeGreaterThan(yerliScore(8.2, 3135, 'tv'))
  })
})

describe('sortByYerliScore', () => {
  it('azalan skora göre sıralar ve girdiyi bozmaz', () => {
    const input = [
      { title: 'a', _yerliScore: 5 },
      { title: 'b', _yerliScore: 9 },
      { title: 'c', _yerliScore: 7 },
    ]
    const out = sortByYerliScore(input)
    expect(out.map(x => x.title)).toEqual(['b', 'c', 'a'])
    expect(input.map(x => x.title)).toEqual(['a', 'b', 'c']) // orijinal korunur
  })

  it('eşit skorda oy sayısı yüksek olan öne gelir', () => {
    const out = sortByYerliScore([
      { title: 'az',  _yerliScore: 8, _voteCount: 30 },
      { title: 'cok', _yerliScore: 8, _voteCount: 900 },
    ])
    expect(out[0].title).toBe('cok')
  })

  it('boş/tanımsız girdide boş dizi döner', () => {
    expect(sortByYerliScore([])).toEqual([])
    expect(sortByYerliScore(undefined)).toEqual([])
  })
})

describe('discoverUrl', () => {
  it('her zaman with_origin_country=TR uygular', () => {
    const url = discoverUrl('tv', { apiKey: 'k' })
    expect(url).toContain('/discover/tv')
    expect(url).toContain('with_origin_country=TR')
    expect(url).toContain('language=tr-TR')
    expect(url).toContain('page=1')
    expect(url).toContain('api_key=k')
  })

  it('ek parametreleri geçirir ve nokta içeren anahtarları korur', () => {
    const url = discoverUrl('movie', { page: 3, apiKey: 'k', 'vote_count.gte': 20 })
    expect(url).toContain('page=3')
    expect(decodeURIComponent(url)).toContain('vote_count.gte=20')
  })

  it('boş/undefined parametreleri atlar', () => {
    const url = discoverUrl('tv', { apiKey: 'k', sort_by: undefined, with_genres: '' })
    expect(url).not.toContain('sort_by')
    expect(url).not.toContain('with_genres')
  })

  it('api anahtarı yoksa api_key eklemez', () => {
    expect(discoverUrl('tv', {})).not.toContain('api_key')
  })
})

describe('yerliListParams', () => {
  it('oy eşiği ve sunucu sıralaması içerir', () => {
    const p = yerliListParams()
    expect(p['vote_count.gte']).toBe(TR_VOTE_MIN)
    expect(p.sort_by).toBe('vote_average.desc')
  })
})
