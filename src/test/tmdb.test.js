import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isValidMediaType, isValidTmdbId, isValidTmdbRef, mapTrProviders, fetchTrPlatforms } from '../lib/tmdb.js'

// Güvenlik regresyonu: saklanan favori `item` snapshot'ları Supabase'de jsonb
// olarak tutulur ve RLS yalnızca sahipliği doğrular (içeriği değil). Bu yüzden
// kimliği doğrulanmış bir kullanıcı kendi `item`'ına keyfi tmdbId/mediaType
// yazabilir; bu değerler TMDB URL'lerine `/${mediaType}/${tmdbId}/...` biçiminde
// gömülür. Doğrulama bozulursa path-injection geri gelir.

describe('isValidMediaType', () => {
  it('yalnızca movie/tv kabul eder', () => {
    expect(isValidMediaType('movie')).toBe(true)
    expect(isValidMediaType('tv')).toBe(true)
  })
  it('diğer her şeyi reddeder', () => {
    for (const bad of ['person', 'MOVIE', 'tv/x', '../x', '', null, undefined, 1]) {
      expect(isValidMediaType(bad)).toBe(false)
    }
  })
})

describe('isValidTmdbId', () => {
  it('pozitif tam sayı id kabul eder (number veya numeric string)', () => {
    expect(isValidTmdbId(27205)).toBe(true)
    expect(isValidTmdbId('27205')).toBe(true)
    expect(isValidTmdbId(1)).toBe(true)
  })
  it('path-injection taşıyan / geçersiz id reddeder', () => {
    const bad = [
      '../../account/secret', '1/../2', '1?api_key=x', '1 ', ' 1',
      '0', 0, -5, 1.5, 'abc', '', null, undefined, {}, [], NaN, Infinity,
    ]
    for (const v of bad) expect(isValidTmdbId(v)).toBe(false)
  })
})

describe('isValidTmdbRef', () => {
  it('geçerli id + geçerli tür true', () => {
    expect(isValidTmdbRef(27205, 'movie')).toBe(true)
    expect(isValidTmdbRef('1399', 'tv')).toBe(true)
  })
  it('saldırgan-kontrollü path-injection payloadlarını reddeder', () => {
    // Tipik kötüye kullanım: kendi favoriline manipüle edilmiş tmdbId yaz
    expect(isValidTmdbRef('../../authentication/token', 'movie')).toBe(false)
    expect(isValidTmdbRef('550/../../account', 'tv')).toBe(false)
    expect(isValidTmdbRef(550, 'account')).toBe(false)
    expect(isValidTmdbRef(550, '../person')).toBe(false)
    expect(isValidTmdbRef(undefined, undefined)).toBe(false)
  })
})

// ── T-TMDB-1: mapTrProviders — temel dönüşüm ─────────────────────────────────
describe('mapTrProviders — temel dönüşüm (T-TMDB-1)', () => {
  it('flatrate listesindeki provider_id\'leri platform id\'sine çevirir', () => {
    const wpJson = {
      results: {
        TR: {
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix' },
            { provider_id: 337, provider_name: 'Disney Plus' },
          ],
        },
      },
    }
    const result = mapTrProviders(wpJson)
    expect(result).toContain('Netflix')
    expect(result).toContain('Disney+')
    expect(result).toHaveLength(2)
  })

  it('free listesindeki provider_id\'leri de dönüştürür', () => {
    const wpJson = {
      results: {
        TR: {
          free: [
            { provider_id: 119, provider_name: 'Amazon Prime Video' },
          ],
        },
      },
    }
    const result = mapTrProviders(wpJson)
    expect(result).toContain('Amazon Prime')
  })

  it('flatrate + free birleştirir', () => {
    const wpJson = {
      results: {
        TR: {
          flatrate: [{ provider_id: 8, provider_name: 'Netflix' }],
          free:     [{ provider_id: 350, provider_name: 'Apple TV Plus' }],
        },
      },
    }
    const result = mapTrProviders(wpJson)
    expect(result).toContain('Netflix')
    expect(result).toContain('Apple TV+')
    expect(result).toHaveLength(2)
  })
})

// ── T-TMDB-2: mapTrProviders — tekilleştirme ─────────────────────────────────
describe('mapTrProviders — tekilleştirme (T-TMDB-2)', () => {
  it('1899 ve 384 her ikisi de HBO Max, yalnızca bir kez döner', () => {
    const wpJson = {
      results: {
        TR: {
          flatrate: [
            { provider_id: 1899, provider_name: 'HBO Max' },
            { provider_id: 384,  provider_name: 'Max' },
          ],
        },
      },
    }
    const result = mapTrProviders(wpJson)
    expect(result.filter(p => p === 'HBO Max')).toHaveLength(1)
    expect(result).toHaveLength(1)
  })

  it('ekleme sırası korunur (flatrate önce)', () => {
    const wpJson = {
      results: {
        TR: {
          flatrate: [{ provider_id: 337, provider_name: 'Disney Plus' }],
          free:     [{ provider_id: 8,   provider_name: 'Netflix' }],
        },
      },
    }
    const result = mapTrProviders(wpJson)
    expect(result[0]).toBe('Disney+')
    expect(result[1]).toBe('Netflix')
  })
})

// ── T-TMDB-3: mapTrProviders — TR yoksa [] ───────────────────────────────────
describe('mapTrProviders — TR verisi yoksa [] (T-TMDB-3)', () => {
  it('results.TR yoksa [] döner', () => {
    expect(mapTrProviders({ results: { US: {} } })).toEqual([])
  })

  it('results boşsa [] döner', () => {
    expect(mapTrProviders({ results: {} })).toEqual([])
  })

  it('null/undefined wpJson için [] döner', () => {
    expect(mapTrProviders(null)).toEqual([])
    expect(mapTrProviders(undefined)).toEqual([])
    expect(mapTrProviders({})).toEqual([])
  })

  it('flatrate ve free her ikisi boş dizi ise [] döner', () => {
    const wpJson = { results: { TR: { flatrate: [], free: [] } } }
    expect(mapTrProviders(wpJson)).toEqual([])
  })
})

// ── T-TMDB-4: mapTrProviders — eşlenmeyen provider_name'e düşer ───────────────
describe('mapTrProviders — bilinmeyen provider → provider_name (T-TMDB-4)', () => {
  it('PROVIDER_MAP\'te olmayan provider_id için provider_name kullanır', () => {
    const wpJson = {
      results: {
        TR: {
          flatrate: [{ provider_id: 99999, provider_name: 'BilinmeyenPlatform' }],
        },
      },
    }
    const result = mapTrProviders(wpJson)
    expect(result).toContain('BilinmeyenPlatform')
  })
})

// ── T-TMDB-5: fetchTrPlatforms — geçersiz ref → ağ isteği yapmaz ─────────────
describe('fetchTrPlatforms — path-injection koruması (T-TMDB-5)', () => {
  beforeEach(() => { global.fetch = vi.fn() })
  afterEach(() => { vi.restoreAllMocks() })

  it('geçersiz mediaType ile ağ isteği yapmaz, [] döner', async () => {
    const result = await fetchTrPlatforms('../../hack', 550, undefined)
    expect(result).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('geçersiz id ile ağ isteği yapmaz, [] döner', async () => {
    const result = await fetchTrPlatforms('movie', '1/../2', undefined)
    expect(result).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('her ikisi de geçersizse ağ isteği yapmaz', async () => {
    const result = await fetchTrPlatforms('../person', '../../auth', undefined)
    expect(result).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

// ── T-TMDB-6: fetchTrPlatforms — VITE_TMDB_KEY yoksa [] ─────────────────────
describe('fetchTrPlatforms — API anahtarı yoksa [] (T-TMDB-6)', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    vi.stubEnv('VITE_TMDB_KEY', '')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('VITE_TMDB_KEY boşken ağ isteği yapmaz, [] döner', async () => {
    const result = await fetchTrPlatforms('movie', 550, undefined)
    expect(result).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
