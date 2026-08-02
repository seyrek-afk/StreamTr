import { describe, it, expect } from 'vitest'
import { PROVIDER_MAP, mapTrProviders } from '../lib/tmdb.js'
import { PLATFORMS, TR_PLATFORMS, ALL_PLATFORMS } from '../constants/index.js'

// Bu testler bir regresyonu kilitler: yerli sağlayıcı ID'leri bir dönem YANLIŞTI
// ve ölü değil, YANLIŞ ETİKETLEYİCİydiler — 479 gerçekte "Home of Horror" iken
// kodda "PUHUTV", 533 "Amazon Arthaus Channel" iken "Gain" yazıyordu. Yani bir
// korku kanalı kullanıcıya puhutv rozetiyle gösterilebilirdi.
const YANLIS_ESKI_IDLER = {
  341: 'hiçbir listede yok',
  479: 'Home of Horror',
  533: 'Amazon Arthaus Channel',
  584: 'Discovery+ Amazon Channel',
}

describe('PROVIDER_MAP — yerli sağlayıcı ID doğruluğu', () => {
  it('TMDB TR listesinden doğrulanmış yerli ID\'leri içerir', () => {
    expect(PROVIDER_MAP[342]).toBe('puhutv')
    expect(PROVIDER_MAP[1791]).toBe('Exxen')
    expect(PROVIDER_MAP[1826]).toBe('TOD')
    expect(PROVIDER_MAP[2235]).toBe('tabii')
    expect(PROVIDER_MAP[1904]).toBe('TV+')
    expect(PROVIDER_MAP[1833]).toBe('Tivibu')
  })

  it('yanlış etiketleyen eski ID\'leri artık içermez', () => {
    for (const id of Object.keys(YANLIS_ESKI_IDLER)) {
      expect(PROVIDER_MAP[id]).toBeUndefined()
    }
  })

  it('Gain için eşleme YOKTUR (TMDB\'de sağlayıcı kaydı yok)', () => {
    expect(Object.values(PROVIDER_MAP)).not.toContain('Gain')
  })

  it('küresel eşlemeler korunur', () => {
    expect(PROVIDER_MAP[8]).toBe('Netflix')
    expect(PROVIDER_MAP[119]).toBe('Amazon Prime')
    expect(PROVIDER_MAP[337]).toBe('Disney+')
    expect(PROVIDER_MAP[1899]).toBe('HBO Max')
  })

  it('her eşleme değeri ALL_PLATFORMS\'ta karşılık bulur (gri fallback olmaz)', () => {
    const ids = new Set(ALL_PLATFORMS.map(p => p.id))
    for (const name of Object.values(PROVIDER_MAP)) {
      expect(ids.has(name), `${name} ALL_PLATFORMS'ta yok → rozet gri fallback'e düşer`).toBe(true)
    }
  })
})

describe('mapTrProviders — yerli sağlayıcılar', () => {
  it('yerli provider_id\'lerini doğru isme çevirir', () => {
    const out = mapTrProviders({
      results: { TR: { flatrate: [{ provider_id: 342, provider_name: 'puhutv' }, { provider_id: 1826, provider_name: 'TOD TV' }] } },
    })
    expect(out).toEqual(['puhutv', 'TOD'])
  })

  it('eşlenmemiş sağlayıcıda provider_name\'e düşer', () => {
    const out = mapTrProviders({
      results: { TR: { flatrate: [{ provider_id: 999999, provider_name: 'Bilinmeyen TV' }] } },
    })
    expect(out).toEqual(['Bilinmeyen TV'])
  })

  it('TR verisi yoksa boş dizi döner', () => {
    expect(mapTrProviders({ results: { US: { flatrate: [] } } })).toEqual([])
    expect(mapTrProviders(null)).toEqual([])
  })
})

describe('TR_PLATFORMS', () => {
  it('Dünya çip satırıyla aynı sayıda çip içerir (hiza korunur)', () => {
    expect(TR_PLATFORMS).toHaveLength(PLATFORMS.length)
  })

  it('Netflix\'i içerir — Türk orijinallerinin büyük bölümü oradadır', () => {
    expect(TR_PLATFORMS.map(p => p.id)).toContain('Netflix')
  })

  it('gerçek yerli platformları içerir', () => {
    const ids = TR_PLATFORMS.map(p => p.id)
    expect(ids).toContain('puhutv')
    expect(ids).toContain('TOD')
    expect(ids).toContain('TV+')
  })

  it('her çipin zorunlu alanları ve geçerli hex rengi vardır', () => {
    TR_PLATFORMS.forEach(p => {
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('label')
      expect(p).toHaveProperty('badge')
      expect(p.color).toMatch(/^#[0-9A-Fa-f]{3,6}$/)
    })
  })
})

describe('ALL_PLATFORMS', () => {
  it('küresel ve yerli setlerin tümünü kapsar', () => {
    const ids = ALL_PLATFORMS.map(p => p.id)
    for (const p of [...PLATFORMS, ...TR_PLATFORMS]) {
      expect(ids).toContain(p.id)
    }
  })

  it('id tekrarı yoktur (rozet çözümlemesi tek anlamlı olmalı)', () => {
    const ids = ALL_PLATFORMS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
