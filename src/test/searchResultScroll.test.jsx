import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import React from 'react'
import { SearchResult } from '../components/SearchBar.jsx'
import { FavoritesProvider } from '../contexts/FavoritesContext.jsx'

const arama = (ek = {}) => ({
  query: 'dark', selectedItem: null, detailLoading: false, detailError: null,
  retryDetail: () => {}, noApiKey: false, ...ek,
})
const yapim = (title) => ({ title, year: '2017', type: 'dizi', genres: ['Dram'], imdbScore: 8.7, platforms: [] })

const kare = () => act(async () => { await new Promise(r => setTimeout(r, 40)) })

const gercekRect = Element.prototype.getBoundingClientRect
beforeEach(() => {
  localStorage.clear()
  window.scrollTo = vi.fn()
  Object.defineProperty(window, 'scrollY', { value: 3000, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true })
  Element.prototype.getBoundingClientRect = function () {
    const top = this.classList?.contains('search-result-anchor') ? -2500 : 0
    return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0 }
  }
})
afterEach(() => { Element.prototype.getBoundingClientRect = gercekRect })

const sar = (props) => render(<FavoritesProvider><SearchResult {...props} /></FavoritesProvider>)

describe('SearchResult — seçimde kaydırma (FR-13, FR-16, FR-18)', () => {
  it('seçim (yükleniyor) ve sonuç gelişinde kaydırır', async () => {
    const { rerender } = sar({ search: arama() })
    await kare()
    expect(window.scrollTo).not.toHaveBeenCalled()
    rerender(<FavoritesProvider><SearchResult search={arama({ detailLoading: true })} /></FavoritesProvider>)
    await kare()
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
    rerender(<FavoritesProvider><SearchResult search={arama({ selectedItem: yapim('Dark') })} /></FavoritesProvider>)
    await kare()
    expect(window.scrollTo).toHaveBeenCalledTimes(2)
  })

  it('holdScroll (telefon arama katmanı açık) sürerken kaydırmaz, kalkınca bir kez kaydırır', async () => {
    const { rerender } = sar({ search: arama(), holdScroll: true })
    rerender(<FavoritesProvider><SearchResult search={arama({ detailLoading: true })} holdScroll /></FavoritesProvider>)
    await kare()
    expect(window.scrollTo).not.toHaveBeenCalled()
    rerender(<FavoritesProvider><SearchResult search={arama({ detailLoading: true })} holdScroll={false} /></FavoritesProvider>)
    await kare()
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
  })

  it('katman yeni seçim olmadan açılıp kapanırsa eski sonuca yeniden kaydırmaz', async () => {
    const sonuc = arama({ selectedItem: yapim('Dark') })
    const { rerender } = sar({ search: arama() })
    rerender(<FavoritesProvider><SearchResult search={sonuc} /></FavoritesProvider>)
    await kare()
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
    rerender(<FavoritesProvider><SearchResult search={sonuc} holdScroll /></FavoritesProvider>)
    rerender(<FavoritesProvider><SearchResult search={sonuc} holdScroll={false} /></FavoritesProvider>)
    await kare()
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
  })

  it('mevcut sonuçla mount olmak (sekme değişimi) kaydırma tetiklemez', async () => {
    sar({ search: arama({ selectedItem: yapim('Dark') }) })
    await kare()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('hata da görünür bir çıktı: detailError gelince kaydırır', async () => {
    const { rerender } = sar({ search: arama() })
    rerender(<FavoritesProvider><SearchResult search={arama({ detailError: 'yüklenemedi' })} /></FavoritesProvider>)
    await kare()
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
  })
})
