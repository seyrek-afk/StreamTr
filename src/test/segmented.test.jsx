import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Segmented from '../components/Segmented.jsx'
import { fillFromCache, providerCache, platformKey } from '../lib/platforms.js'

const OPTS = [
  { value: 'all',  label: 'Tümü' },
  { value: 'dizi', label: 'Dizi' },
  { value: 'film', label: 'Film' },
]

describe('Segmented', () => {
  it('tüm seçenekleri aynı anda gösterir — menü açmak gerekmez', () => {
    render(<Segmented label="İçerik türü" value="all" options={OPTS} onChange={() => {}} />)
    OPTS.forEach(o => expect(screen.getByRole('button', { name: o.label })).toBeTruthy())
  })

  it('seçili olanı aria-pressed ile bildirir', () => {
    render(<Segmented label="İçerik türü" value="dizi" options={OPTS} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Dizi' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Film' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('tıklanan seçeneğin değerini iletir', () => {
    const onChange = vi.fn()
    render(<Segmented label="İçerik türü" value="all" options={OPTS} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Film' }))
    expect(onChange).toHaveBeenCalledWith('film')
  })

  it('grubun erişilebilir adı vardır — bağlamsız duyulan düğmeler ne olduğu belli olsun', () => {
    render(<Segmented label="İçerik türü" value="all" options={OPTS} onChange={() => {}} />)
    expect(screen.getByRole('group', { name: 'İçerik türü' })).toBeTruthy()
  })
})

describe('fillFromCache', () => {
  const kart = (id, platforms = []) => ({ _tmdbId: id, _mediaType: 'tv', platforms })

  beforeEach(() => providerCache.clear())

  it('önbellekteki platformları doldurur', () => {
    const k = kart(1)
    providerCache.set(platformKey(k), ['Netflix'])
    expect(fillFromCache([k])[0].platforms).toEqual(['Netflix'])
  })

  // Yeni dizi döndürmek her render'da referans değiştirip gereksiz yeniden
  // çizime yol açar; değişiklik yoksa GİRDİNİN KENDİSİ dönmeli.
  it('değişiklik yoksa aynı dizi referansını döndürür', () => {
    const liste = [kart(1)]
    expect(fillFromCache(liste)).toBe(liste)
  })

  it('zaten platformu olan kartı ezmez', () => {
    const k = kart(1, ['Prime'])
    providerCache.set(platformKey(k), ['Netflix'])
    expect(fillFromCache([k])[0].platforms).toEqual(['Prime'])
  })

  it('tmdb kimliği olmayan kayıtta çökmez', () => {
    const liste = [{ platforms: [] }]
    expect(fillFromCache(liste)).toBe(liste)
  })

  it('boş ve dizi olmayan girdide girdiyi aynen döndürür', () => {
    expect(fillFromCache([])).toEqual([])
    expect(fillFromCache(undefined)).toBeUndefined()
  })
})
