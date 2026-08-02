import { describe, it, expect } from 'vitest'
import { railsFor, RAIL_MIN_ITEMS, RAIL_PROVIDERS } from '../lib/rails.js'
import { VOTE_MIN } from '../lib/discover.js'

const NOW = new Date('2026-08-02T00:00:00Z')

describe('railsFor', () => {
  it('diziler ve filmler için 4\'er raf üretir', () => {
    expect(railsFor('diziler', 'TR', NOW)).toHaveLength(4)
    expect(railsFor('filmler', 'TR', NOW)).toHaveLength(4)
  })

  it('trend ve bilinmeyen sekmelerde raf üretmez', () => {
    // Trend zaten tek eksenli bir sıralamadır; raf modülün kendi gerekçesini çiğnerdi
    expect(railsFor('trend', 'TR', NOW)).toEqual([])
    expect(railsFor('sanaozel', 'TR', NOW)).toEqual([])
  })

  it('her rafın zorunlu alanları vardır', () => {
    for (const tab of ['diziler', 'filmler']) {
      railsFor(tab, 'TR', NOW).forEach(r => {
        expect(typeof r.key).toBe('string')
        expect(typeof r.title).toBe('string')
        expect(['tv', 'movie']).toContain(r.mediaType)
        expect(typeof r.params).toBe('object')
        expect(r.gridAction).toHaveProperty('type')
      })
    }
  })

  it('raf anahtarları sekme içinde tekildir', () => {
    for (const tab of ['diziler', 'filmler']) {
      const keys = railsFor(tab, 'TR', NOW).map(r => r.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('dizi rafları tv, film rafları movie uç noktasını hedefler', () => {
    expect(railsFor('diziler', 'TR', NOW).every(r => r.mediaType === 'tv')).toBe(true)
    expect(railsFor('filmler', 'TR', NOW).every(r => r.mediaType === 'movie')).toBe(true)
  })

  it('"Bu Ay Çıkanlar" son 60 günü, "Yeni Vizyon" son 90 günü kapsar', () => {
    const dizi = railsFor('diziler', 'TR', NOW).find(r => r.key === 'bu-ay')
    expect(dizi.params['first_air_date.gte']).toBe('2026-06-03')

    const film = railsFor('filmler', 'TR', NOW).find(r => r.key === 'yeni-vizyon')
    expect(film.params['primary_release_date.gte']).toBe('2026-05-04')
  })

  it('tarih parametreleri TMDB\'nin beklediği YYYY-MM-DD biçimindedir', () => {
    const all = [...railsFor('diziler', 'TR', NOW), ...railsFor('filmler', 'TR', NOW)]
    for (const r of all) {
      for (const [k, v] of Object.entries(r.params)) {
        if (k.includes('date')) expect(v).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    }
  })

  it('puan bazlı raflar oy eşiği uygular ve istemcide yeniden sıralanır', () => {
    const r = railsFor('diziler', 'TR', NOW).find(x => x.key === 'yuksek-puanli')
    expect(r.params['vote_count.gte']).toBe(VOTE_MIN)
    expect(r.sortByWeighted).toBe(true)
  })

  it('"Bu Ay Çıkanlar" popülerliğe göre gelir, Yerli Skor ile sıralanmaz', () => {
    // Yeni çıkanlarda oy sayısı henüz birikmemiştir; Bayesian ağırlık hepsini
    // havuz ortalamasına ezip rafı anlamsız kılardı.
    const r = railsFor('diziler', 'TR', NOW).find(x => x.key === 'bu-ay')
    expect(r.params.sort_by).toBe('popularity.desc')
    expect(r.sortByWeighted).toBeUndefined()
  })

  it('platform rafı yalnız TMDB\'de kataloğu olan yerli sağlayıcıları kullanır', () => {
    const r = railsFor('diziler', 'TR', NOW).find(x => x.key === 'platformda')
    expect(r.params.with_watch_providers).toBe(RAIL_PROVIDERS)
    expect(r.params.watch_region).toBe('TR')
    // Gain (kayıt yok), Exxen (1791) ve tabii (2235) pratikte boş → rafa girmez
    expect(RAIL_PROVIDERS).not.toContain('1791')
    expect(RAIL_PROVIDERS).not.toContain('2235')
  })

  it('kült rafları gridAction olarak yıl eşiği taşır', () => {
    expect(railsFor('diziler', 'TR', NOW).find(r => r.key === 'kult').gridAction)
      .toEqual({ type: 'yearsBefore', value: 2015 })
    expect(railsFor('filmler', 'TR', NOW).find(r => r.key === 'kult').gridAction)
      .toEqual({ type: 'yearsBefore', value: 2010 })
  })

  it('gridAction tipleri App\'in tanıdığı kümededir', () => {
    const known = ['sort', 'genre', 'trOnly', 'yearsBefore']
    const all = [...railsFor('diziler', 'TR', NOW), ...railsFor('filmler', 'TR', NOW)]
    all.forEach(r => expect(known).toContain(r.gridAction.type))
  })

  it('RAIL_MIN_ITEMS yarım rafı engelleyecek kadar yüksektir', () => {
    expect(RAIL_MIN_ITEMS).toBeGreaterThanOrEqual(3)
  })
})
