// Güvenlik değişmezleri — animasyon tercihi / sıralama / raf sorgusu.
// localStorage ve kayıtlı favori verisi güvenilmezdir; bu testler o verinin
// yalnız boole tercihe ve allowlist'li sorgu parametrelerine indirgendiğini kilitler.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isAnimation, readShowAnimation, saveShowAnimation, ANIMATION_PREF_KEY, makeComparator,
} from '../lib/listLogic.js'
import { railQueryParams } from '../lib/rails.js'
import { discoverUrl } from '../lib/discover.js'
import { bannedGenres, discoveryGenres } from '../lib/recommend.js'

describe('animasyon tercihi — kurcalanmış localStorage', () => {
  beforeEach(() => localStorage.clear())

  it("yalnız tam '1' gösterir; başka her değer varsayılan (gizli) olur", () => {
    for (const v of ['true', ' 1', '1 ', '01', 'yes', '__proto__', '{"show":true}', '<img src=x onerror=alert(1)>', '1'.repeat(10_000)]) {
      localStorage.setItem(ANIMATION_PREF_KEY, v)
      expect(readShowAnimation()).toBe(false)
    }
    localStorage.setItem(ANIMATION_PREF_KEY, '1')
    expect(readShowAnimation()).toBe(true)
  })

  it("yazılan değer her zaman '1' ya da '0' (girdi depoya taşınmaz)", () => {
    saveShowAnimation('<script>')
    expect(localStorage.getItem(ANIMATION_PREF_KEY)).toBe('1')
    saveShowAnimation({ toString: () => 'x' })
    expect(localStorage.getItem(ANIMATION_PREF_KEY)).toBe('1')
    saveShowAnimation('')
    expect(localStorage.getItem(ANIMATION_PREF_KEY)).toBe('0')
  })
})

describe('raf sorgusu — parametre enjeksiyonu', () => {
  it('without_genres birleştirmesi ek sorgu parametresi ya da yol üretemez', () => {
    const params = railQueryParams(
      { without_genres: '99&api_key=evil#frag,../x', sort_by: 'popularity.desc' },
      { hideAnimation: true },
    )
    const url = new URL(discoverUrl('tv', { country: 'TR', page: 1, apiKey: 'K', ...params }))
    expect(url.origin + url.pathname).toBe('https://api.themoviedb.org/3/discover/tv')
    expect(url.searchParams.getAll('api_key')).toEqual(['K'])
    expect(url.hash).toBe('')
    expect(url.searchParams.get('without_genres').split(',')).toContain('16')
  })

  it('__proto__ anahtarlı parametre nesnesi prototipi kirletmez', () => {
    railQueryParams(JSON.parse('{"__proto__":{"kirli":1},"without_genres":"99"}'), { hideAnimation: true })
    expect({}.kirli).toBeUndefined()
  })
})

describe('isAnimation — güvenilmez tür değerleri', () => {
  it('string olmayan girdiyi zorlamaz (toString/getter ile kandırılamaz), fırlatmaz', () => {
    const sahte = { toString: () => 'Animasyon' }
    expect(isAnimation({ genres: [sahte] })).toBe(false)
    expect(isAnimation({ genres: 'Animasyon' })).toBe(false)
    expect(isAnimation({ genres: { length: 1, 0: 'Animasyon' } })).toBe(false)
    expect(isAnimation(Object.create(null))).toBe(false)
    const getterli = {}
    Object.defineProperty(getterli, 'genres', { get: () => ['Animasyon'] })
    expect(isAnimation(getterli)).toBe(true)
  })
})

describe('sıralama — prototip anahtarlı sortBy', () => {
  it('constructor/__proto__/toString IMDB sırasına düşer, fırlatmaz', () => {
    const list = [{ imdbScore: 6, rottenTomatoesScore: 99 }, { imdbScore: 9, rottenTomatoesScore: 10 }]
    for (const s of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect([...list].sort(makeComparator(s, {})).map(i => i.imdbScore)).toEqual([9, 6])
    }
  })
})

describe('öneri — gizleme tercihi profilden üstündür', () => {
  it('profil tamamen animasyon olsa da gizliyken keşif animasyonla sorgulanmaz', () => {
    const profile = { animasyon: 0.9, suc: 0.1 }
    expect(discoveryGenres(profile, { hideAnimation: true })).not.toContain('animasyon')
    expect([...bannedGenres(profile, { hideAnimation: true })]).toContain('animasyon')
    expect([...bannedGenres(profile)]).not.toContain('animasyon')
  })
})
