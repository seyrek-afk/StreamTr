import { describe, it, expect } from 'vitest'
import {
  genreKeysOf, genreProfile, excludedGenres, genreAffinity,
  passesQualityFloor, qualityScore, clusterSeeds, seedProfile,
  rankRecommendations, diversify, titleKeys, MAX_PER_CLUSTER,
} from '../lib/recommend.js'

// Test kartı: TMDB recommendations ucundan gelmiş gibi
const card = (id, extra = {}) => ({
  key: `tmdb:movie:${id}`, title: `Film ${id}`, originalTitle: `Film ${id}`, year: '2015',
  genres: ['Dram'], _mediaType: 'movie', _voteAvg: 7.5, _voteCount: 5000, ...extra,
})
const cardsOf = list => new Map(list.map(c => [c.key, c]))
const run = (seeds, cards, extra = {}) => rankRecommendations({
  seeds, cardsByKey: cardsOf(cards),
  profile: seedProfile(seeds),
  excludeKeys: new Set(), excludeTitles: new Set(), ...extra,
})

describe('tür etiketleri', () => {
  it('dizi birleşik türleri iki anahtara açılır', () => {
    expect(genreKeysOf(['Aksiyon & Macera'])).toEqual(['aksiyon', 'macera'])
    expect(genreKeysOf(['Bilim Kurgu & Fantezi', 'Fantezi'])).toEqual(['bilimkurgu', 'fantastik'])
  })
  it('bilinmeyen etiket yok sayılır', () => {
    expect(genreKeysOf(['Biyografi', 'Dram'])).toEqual(['dram'])
  })
})

describe('zevk profili', () => {
  it('çok türlü yapımın ağırlığı türlerine bölünür, toplam 1', () => {
    const p = genreProfile([{ genres: ['Suç', 'Dram'] }, { genres: ['Suç'] }])
    expect(p.suc).toBeCloseTo(0.75)
    expect(p.dram).toBeCloseTo(0.25)
  })
  it('profilde yeri olmayan animasyon/çocuk elenir; payı olan elenmez', () => {
    expect(excludedGenres({ dram: 1 }).has('animasyon')).toBe(true)
    expect(excludedGenres({ dram: 0.7, animasyon: 0.3 }).has('animasyon')).toBe(false)
  })
  it('yalnız dram olan aday tam uyum almaz (dram ayırt edici değil)', () => {
    const p = { dram: 0.4, suc: 0.35, bilimkurgu: 0.25 }
    expect(genreAffinity(['Dram'], p)).toBe(0.5)
    expect(genreAffinity(['Suç', 'Dram'], p)).toBe(1)
  })
  it('aile türü elenmez ama profilde yoksa puanı kırpılır', () => {
    const p = { macera: 0.5, fantastik: 0.5 }
    expect(genreAffinity(['Macera', 'Aile'], p)).toBeLessThan(genreAffinity(['Macera'], p))
  })
})

describe('kalite', () => {
  it('az oylu ya da düşük puanlı yapım tabanı geçemez', () => {
    expect(passesQualityFloor(card(1, { _voteAvg: 6.2 }))).toBe(false)
    expect(passesQualityFloor(card(1, { _voteCount: 90 }))).toBe(false)
    expect(passesQualityFloor(card(1, { _mediaType: 'tv', _voteCount: 90 }))).toBe(true)
  })
  it('oy sayısı bilinmiyorsa taban uygulanmaz (eksik veri öneri sildirmez)', () => {
    expect(passesQualityFloor(card(1, { _voteCount: undefined, _voteAvg: 6.0 }))).toBe(true)
  })
  it('aynı puanda çok oylu yapım daha yüksek kalite alır', () => {
    expect(qualityScore(card(1, { _voteAvg: 8.5, _voteCount: 20000 })))
      .toBeGreaterThan(qualityScore(card(2, { _voteAvg: 8.5, _voteCount: 200 })))
  })
})

describe('tohum kümeleme — seri baskınlığı', () => {
  // Dokuz "Orta Dünya" tohumu neredeyse aynı listeyi döndürür; tek suç dizisi
  // tohumu bambaşka bir liste.
  const fantasyRecs = Array.from({ length: 10 }, (_, i) => `tmdb:movie:${100 + i}`)
  const crimeRecs   = Array.from({ length: 10 }, (_, i) => `tmdb:movie:${200 + i}`)
  const seeds = [
    ...Array.from({ length: 9 }, (_, i) => ({
      id: i, w: 2, title: `Orta Dünya ${i}`, genres: ['Macera', 'Fantezi'], recKeys: fantasyRecs,
    })),
    { id: 50, w: 2, title: 'Breaking Bad', genres: ['Suç', 'Dram'], recKeys: crimeRecs },
  ]

  it('örtüşen tohumlar tek kümede toplanır, ağırlık logaritmik büyür', () => {
    const clusters = clusterSeeds(seeds)
    expect(clusters).toHaveLength(2)
    const big = clusters.find(c => c.members.length === 9)
    expect(big.weight).toBeLessThan(2 * 3) // 9 × 2 = 18 değil
    expect(big.weight).toBeGreaterThan(2)  // ama tek tohumdan güçlü
  })

  it('profil de kümelenir: fantastik baskın ama tekel değil', () => {
    const p = seedProfile(seeds)
    const ham = genreProfile(seeds.map(s => ({ genres: s.genres, _w: s.w })))
    expect(p.fantastik).toBeLessThan(0.5)
    // Kümelemesiz profilde suç %5'te kalıyordu; kümelenince en az 2.5 katı.
    expect(p.suc).toBeGreaterThan(ham.suc * 2.5)
  })

  it('öneri listesinde suç kümesi de yer bulur', () => {
    const cards = [
      ...fantasyRecs.map((k, i) => card(100 + i, { genres: ['Macera', 'Fantezi'] })),
      ...crimeRecs.map((k, i) => card(200 + i, { genres: ['Suç', 'Dram'] })),
    ]
    const recs = run(seeds, cards)
    const crime = recs.filter(r => r.genres.includes('Suç'))
    expect(crime.length).toBeGreaterThanOrEqual(5)
    // Çeşitlilik: hiçbir küme ilk 10'un yarısından fazlasını almaz
    expect(recs.slice(0, 10).filter(r => r.genres.includes('Fantezi')).length).toBeLessThanOrEqual(MAX_PER_CLUSTER)
  })
})

describe('eleme ve gerekçe', () => {
  const seeds = [{ id: 1, w: 2, title: 'Breaking Bad', genres: ['Suç', 'Dram'],
    recKeys: ['tmdb:movie:1', 'tmdb:movie:2', 'tmdb:movie:3', 'tmdb:movie:4'] }]

  it('profilde animasyon yokken animasyon önerilmez', () => {
    const recs = run(seeds, [card(1, { genres: ['Animasyon', 'Suç'] }), card(2, { genres: ['Suç'] })])
    expect(recs.map(r => r.key)).toEqual(['tmdb:movie:2'])
  })

  it('kayıtlı yapım başlık+yılla da elenir; aynı adlı başka yıl elenmez', () => {
    const saved = { title: 'Carrie', year: '2026' }
    const recs = run(seeds, [
      card(1, { title: 'Carrie', originalTitle: 'Carrie', year: '2026' }),
      card(2, { title: 'Carrie', originalTitle: 'Carrie', year: '1976' }),
    ], { excludeTitles: new Set(titleKeys(saved)) })
    expect(recs.map(r => r.year)).toEqual(['1976'])
  })

  it('her öneri hangi beğeniden geldiğini taşır', () => {
    const recs = run(seeds, [card(1, { genres: ['Suç'] })])
    expect(recs[0]._reason).toBe('Beğendiğin: Breaking Bad')
  })

  it('keşif adayları boşluğu doldurur ama komşuluk adaylarının önüne geçmez', () => {
    const recs = rankRecommendations({
      seeds, cardsByKey: cardsOf([card(1, { genres: ['Suç'], _voteAvg: 7.0 })]),
      discovered: [card(9, { genres: ['Suç'], _voteAvg: 8.9, _voteCount: 30000 })],
      profile: seedProfile(seeds), excludeKeys: new Set(), excludeTitles: new Set(),
    })
    expect(recs.map(r => r.key)).toEqual(['tmdb:movie:1', 'tmdb:movie:9'])
    expect(recs[1]._reason).toMatch(/^Sevdiğin türlerden:/)
  })
})

describe('çeşitlilik', () => {
  it('sınır aşanlar bekletilir, liste dolmazsa yine eklenir', () => {
    const scored = Array.from({ length: 8 }, (_, i) => ({ card: card(i), cluster: 0, score: 1 - i / 10 }))
    const out = diversify(scored, 20)
    expect(out).toHaveLength(8) // eksik liste çeşitlilikten kötüdür
  })
})
