import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import {
  FavoritesProvider, useFavorites, favKey, migrateSaved,
  LIKE_NONE, LIKE_YES, LIKE_LOVE,
} from '../contexts/FavoritesContext.jsx'

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

describe('migrateSaved — eski favoriler', () => {
  // Kullanıcıların mevcut kayıtlarında like/watchlist alanı YOK. Hepsi
  // "Beğendim" (1. kademe) kabul edilir; hangisinin "izleyeceğim" olduğunu
  // tahmin etmek veri uydurmak olurdu.
  it('alanı olmayan kaydı 1. kademe beğeniye taşır', () => {
    const [m] = migrateSaved([{ key: 'k', title: 'X' }])
    expect(m.like).toBe(LIKE_YES)
    expect(m.watchlist).toBe(false)
    expect(m.title).toBe('X')
  })

  // Her okumada çalıştığı için idempotent olmak ZORUNDA: aksi halde
  // "Bayıldım" bir sonraki açılışta "Beğendim"e düşerdi.
  it('yeni şemadaki kayda dokunmaz (idempotent)', () => {
    const kayit = { key: 'k', like: LIKE_LOVE, watchlist: true }
    expect(migrateSaved([kayit])[0]).toBe(kayit)
  })

  it('bozuk girdide çökmez', () => {
    expect(migrateSaved(null)).toEqual([])
    expect(migrateSaved([null, undefined])).toEqual([])
  })
})

describe('FavoritesContext', () => {
  beforeEach(() => { localStorage.clear() })

  it('starts empty when localStorage is empty', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    expect(result.current.saved).toEqual([])
    expect(result.current.count).toBe(0)
  })

  // Doğrudan seçim: aradaki durumlardan geçmeye gerek yok.
  it('setLike istenen kademeyi doğrudan yazar', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })

    expect(result.current.likeLevel(tmdbItem)).toBe(LIKE_NONE)
    // Boştan doğrudan 2. kademeye — 1'den geçmeden
    act(() => { result.current.setLike(tmdbItem, LIKE_LOVE) })
    expect(result.current.likeLevel(tmdbItem)).toBe(LIKE_LOVE)
    expect(result.current.loved).toHaveLength(1)
    expect(result.current.liked).toHaveLength(0)
  })

  // İki kademe aynı eksenin değerleri; biri diğerini bırakmalı, yoksa yapım
  // iki rafta birden görünürdü.
  it('Beğendim ile Bayıldım birbirini dışlar', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.setLike(tmdbItem, LIKE_YES) })
    expect(result.current.liked).toHaveLength(1)
    act(() => { result.current.setLike(tmdbItem, LIKE_LOVE) })
    expect(result.current.liked).toHaveLength(0)
    expect(result.current.loved).toHaveLength(1)
  })

  it('setLike ile sıfırlanınca kayıt silinir', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.setLike(tmdbItem, LIKE_YES) })
    act(() => { result.current.setLike(tmdbItem, LIKE_NONE) })
    expect(result.current.count).toBe(0)
  })

  // İki eksen bağımsız: bir yapım hem bayıldığın hem yeniden izleyeceğin olabilir.
  it('beğeni ile izleme listesi birbirini etkilemez', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })

    act(() => { result.current.toggleWatchlist(tmdbItem) })
    expect(result.current.isWatchlisted(tmdbItem)).toBe(true)
    expect(result.current.likeLevel(tmdbItem)).toBe(LIKE_NONE)

    act(() => { result.current.setLike(tmdbItem, LIKE_YES) })
    expect(result.current.isWatchlisted(tmdbItem)).toBe(true)
    expect(result.current.likeLevel(tmdbItem)).toBe(LIKE_YES)
  })

  // Kaydın var olma nedeni kalmadıysa satır silinir; yoksa listede
  // görünmeyen ölü kayıtlar birikir.
  it('beğeni sıfırlanınca izleme listesindeki kayıt SİLİNMEZ', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.toggleWatchlist(tmdbItem) })
    act(() => { result.current.setLike(tmdbItem, LIKE_YES) })
    act(() => { result.current.setLike(tmdbItem, LIKE_LOVE) })
    act(() => { result.current.setLike(tmdbItem, LIKE_NONE) })
    expect(result.current.count).toBe(1)
    expect(result.current.watchlist).toHaveLength(1)
  })

  it('her iki eksen de boşalınca kayıt tamamen silinir', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.toggleWatchlist(tmdbItem) })
    act(() => { result.current.toggleWatchlist(tmdbItem) })
    expect(result.current.count).toBe(0)
  })

  it('stores a snapshot with the fields needed for recommendations', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.setLike(mockItem, LIKE_YES) })

    const snap = result.current.saved[0]
    expect(snap.key).toBe('title:Breaking Bad:2008')
    expect(snap.title).toBe('Breaking Bad')
    expect(snap.genres).toEqual(['Suç', 'Dram'])
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.setLike(tmdbItem, LIKE_YES) })

    const stored = JSON.parse(localStorage.getItem('streamtr-favorites'))
    expect(stored).toHaveLength(1)
    expect(stored[0].key).toBe('tmdb:movie:27205')
    expect(stored[0].like).toBe(LIKE_YES)
  })

  it('eski şemadaki localStorage kaydını beğeni olarak geri yükler', () => {
    localStorage.setItem('streamtr-favorites', JSON.stringify([{ key: 'tmdb:movie:27205', title: 'Inception' }]))
    const { result } = renderHook(() => useFavorites(), { wrapper })
    expect(result.current.count).toBe(1)
    expect(result.current.likeLevel(tmdbItem)).toBe(LIKE_YES)
    expect(result.current.liked).toHaveLength(1)
  })

  it('tolerates corrupt localStorage data', () => {
    localStorage.setItem('streamtr-favorites', 'not-json{')
    const { result } = renderHook(() => useFavorites(), { wrapper })
    expect(result.current.saved).toEqual([])
  })
})
