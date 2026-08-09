import { describe, it, expect } from 'vitest'
import { GENRES, genreIdsFor, genresUnsupportedFor, genreLabels } from '../lib/genres.js'

describe('tür id çevrimi', () => {
  // SESSİZ HATA REGRESYONU: TMDB'de film ve dizi tür id'leri farklıdır.
  // Önceden yalnız film id'leri üretilip dizi ucuna da gönderiliyordu; TMDB
  // geçersiz id'de hata vermeyip BOŞ sonuç döndürdüğü için "aksiyon dizisi"
  // araması sessizce sonuçsuz kalıyordu.
  it('aynı tür film ve dizide FARKLI id verir', () => {
    expect(genreIdsFor(['aksiyon'], 'movie')).toEqual([28])
    expect(genreIdsFor(['aksiyon'], 'tv')).toEqual([10759])

    expect(genreIdsFor(['bilimkurgu'], 'movie')).toEqual([878])
    expect(genreIdsFor(['bilimkurgu'], 'tv')).toEqual([10765])

    expect(genreIdsFor(['savas'], 'movie')).toEqual([10752])
    expect(genreIdsFor(['savas'], 'tv')).toEqual([10768])
  })

  it('iki uçta da aynı olan türleri bozmaz', () => {
    for (const key of ['komedi', 'dram', 'suc', 'belgesel', 'animasyon', 'aile', 'gizem', 'western']) {
      expect(genreIdsFor([key], 'movie'), key).toEqual(genreIdsFor([key], 'tv'))
    }
  })

  it('birden çok anahtarı birleştirir ve tekrarı eler', () => {
    // aksiyon ve macera dizide aynı id'ye (10759) düşer — bir kez çıkmalı.
    expect(genreIdsFor(['aksiyon', 'macera'], 'tv')).toEqual([10759])
    expect(genreIdsFor(['aksiyon', 'komedi'], 'movie').sort()).toEqual([28, 35])
  })

  it('bilinmeyen anahtarı yok sayar', () => {
    expect(genreIdsFor(['aksiyon', 'uydurma'], 'movie')).toEqual([28])
    expect(genreIdsFor([], 'movie')).toEqual([])
  })

  it('dizide karşılığı olmayan türü bildirir (filtre sessizce düşürülmesin)', () => {
    // TMDB'de korku/gerilim/romantik/tarih/müzik DİZİ türü yoktur.
    for (const key of ['korku', 'gerilim', 'romantik', 'tarih', 'muzik']) {
      expect(genresUnsupportedFor([key], 'tv'), key).toBe(true)
      expect(genresUnsupportedFor([key], 'movie'), key).toBe(false)
    }
  })

  it('tür istenmediğinde "desteklenmiyor" demez', () => {
    expect(genresUnsupportedFor([], 'tv')).toBe(false)
  })

  it('en az bir tür eşleşiyorsa uç sorgulanabilir sayılır', () => {
    expect(genresUnsupportedFor(['korku', 'komedi'], 'tv')).toBe(false)
  })

  it('her türün en az film karşılığı vardır', () => {
    for (const [key, g] of Object.entries(GENRES)) {
      expect(g.movie.length, key).toBeGreaterThan(0)
      expect(typeof g.label, key).toBe('string')
    }
  })

  it('etiketleri kullanıcıya gösterilecek biçimde verir', () => {
    expect(genreLabels(['bilimkurgu', 'suc'])).toEqual(['bilim kurgu', 'suç'])
  })
})
