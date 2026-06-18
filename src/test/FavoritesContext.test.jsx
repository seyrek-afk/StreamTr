import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { FavoritesProvider, useFavorites, favKey } from '../contexts/FavoritesContext.jsx'

const wrapper = ({ children }) => React.createElement(FavoritesProvider, null, children)

const tmdbItem = { title: 'Inception', year: '2010', _tmdbId: 27205, _mediaType: 'movie', genres: ['Bilim Kurgu'] }
const mockItem = { title: 'Breaking Bad', year: 2008, genres: ['Suç', 'Dram'] }

describe('favKey', () => {
  it('uses tmdb id + media type when available', () => {
    expect(favKey(tmdbItem)).toBe('tmdb:movie:27205')
    expect(favKey({ tmdbId: 5, mediaType: 'tv' })).toBe('tmdb:tv:5')
  })

  it('falls back to title + year for mock items', () => {
    expect(favKey(mockItem)).toBe('title:Breaking Bad:2008')
  })
})

describe('FavoritesContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty when localStorage is empty', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    expect(result.current.favorites).toEqual([])
    expect(result.current.count).toBe(0)
  })

  it('toggleFavorite adds then removes an item', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })

    act(() => { result.current.toggleFavorite(tmdbItem) })
    expect(result.current.isFavorite(tmdbItem)).toBe(true)
    expect(result.current.count).toBe(1)

    act(() => { result.current.toggleFavorite(tmdbItem) })
    expect(result.current.isFavorite(tmdbItem)).toBe(false)
    expect(result.current.count).toBe(0)
  })

  it('stores a snapshot with the fields needed for recommendations', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.toggleFavorite(mockItem) })

    const snap = result.current.favorites[0]
    expect(snap.key).toBe('title:Breaking Bad:2008')
    expect(snap.title).toBe('Breaking Bad')
    expect(snap.genres).toEqual(['Suç', 'Dram'])
  })

  it('persists favorites to localStorage', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.toggleFavorite(tmdbItem) })

    const stored = JSON.parse(localStorage.getItem('streamtr-favorites'))
    expect(stored).toHaveLength(1)
    expect(stored[0].key).toBe('tmdb:movie:27205')
  })

  it('restores favorites from localStorage on mount', () => {
    localStorage.setItem('streamtr-favorites', JSON.stringify([{ key: 'tmdb:movie:27205', title: 'Inception' }]))
    const { result } = renderHook(() => useFavorites(), { wrapper })
    expect(result.current.count).toBe(1)
    expect(result.current.isFavorite(tmdbItem)).toBe(true)
  })

  it('tolerates corrupt localStorage data', () => {
    localStorage.setItem('streamtr-favorites', 'not-json{')
    const { result } = renderHook(() => useFavorites(), { wrapper })
    expect(result.current.favorites).toEqual([])
  })
})
