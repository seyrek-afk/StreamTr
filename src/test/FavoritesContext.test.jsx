import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import {
  FavoritesProvider, useFavorites, favKey, migrateSaved,
  LIKE_NONE, LIKE_YES, LIKE_LOVE,
  DURUM_YOK, DURUM_BEGENI, DURUM_BAYILMA, DURUM_IZLEME,
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
    const kayit = { key: 'k', like: LIKE_LOVE, watchlist: false }
    expect(migrateSaved([kayit])[0]).toBe(kayit)
  })

  // Kayıtlar iki eksen BAĞIMSIZKEN oluşmuş olabilir; üçlü dışlayıcılığa
  // geçince ikisi birden dolu kayıtlar aynı yapımı iki rafta birden
  // gösterirdi. Okuma anında normalize edilir: puan kazanır.
  it('iki ekseni birden dolu eski kaydı normalize eder (puan kazanır)', () => {
    const [m] = migrateSaved([{ key: 'k', like: LIKE_LOVE, watchlist: true }])
    expect(m.like).toBe(LIKE_LOVE)
    expect(m.watchlist).toBe(false)
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

  // Üç durum birbirini dışlar: son seçim kazanır.
  it('setDurum istenen durumu doğrudan yazar', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })

    expect(result.current.durum(tmdbItem)).toBe(DURUM_YOK)
    act(() => { result.current.setDurum(tmdbItem, DURUM_BAYILMA) })
    expect(result.current.durum(tmdbItem)).toBe(DURUM_BAYILMA)
    expect(result.current.loved).toHaveLength(1)
    expect(result.current.liked).toHaveLength(0)
  })

  it('Beğendim, Bayıldım ve İzleyeceğim birbirini dışlar', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })

    act(() => { result.current.setDurum(tmdbItem, DURUM_BEGENI) })
    expect(result.current.liked).toHaveLength(1)

    act(() => { result.current.setDurum(tmdbItem, DURUM_IZLEME) })
    expect(result.current.liked).toHaveLength(0)
    expect(result.current.watchlist).toHaveLength(1)

    act(() => { result.current.setDurum(tmdbItem, DURUM_BAYILMA) })
    expect(result.current.watchlist).toHaveLength(0)
    expect(result.current.loved).toHaveLength(1)
    // Her durumda tek kayıt kalır; yapım iki rafta birden görünmez.
    expect(result.current.count).toBe(1)
  })

  // Puan vermek "izledim" demektir: kayıt izleme kuyruğundan DÜŞMELİ, yoksa
  // İzleyeceklerim çoktan izlenmiş yapımlarla dolar.
  it('puan vermek kaydı izleme listesinden düşürür', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.setDurum(tmdbItem, DURUM_IZLEME) })
    act(() => { result.current.setDurum(tmdbItem, DURUM_BEGENI) })
    expect(result.current.watchlist).toHaveLength(0)
    expect(result.current.liked).toHaveLength(1)
  })

  it('durum sıfırlanınca kayıt tamamen silinir', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.setDurum(tmdbItem, DURUM_BEGENI) })
    act(() => { result.current.setDurum(tmdbItem, DURUM_YOK) })
    expect(result.current.count).toBe(0)
  })

  it('stores a snapshot with the fields needed for recommendations', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.setDurum(mockItem, DURUM_BEGENI) })

    const snap = result.current.saved[0]
    expect(snap.key).toBe('title:Breaking Bad:2008')
    expect(snap.title).toBe('Breaking Bad')
    expect(snap.genres).toEqual(['Suç', 'Dram'])
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper })
    act(() => { result.current.setDurum(tmdbItem, DURUM_BEGENI) })

    const stored = JSON.parse(localStorage.getItem('streamtr-favorites'))
    expect(stored).toHaveLength(1)
    expect(stored[0].key).toBe('tmdb:movie:27205')
    expect(stored[0].like).toBe(LIKE_YES)
  })

  it('eski şemadaki localStorage kaydını beğeni olarak geri yükler', () => {
    localStorage.setItem('streamtr-favorites', JSON.stringify([{ key: 'tmdb:movie:27205', title: 'Inception' }]))
    const { result } = renderHook(() => useFavorites(), { wrapper })
    expect(result.current.count).toBe(1)
    expect(result.current.durum(tmdbItem)).toBe(DURUM_BEGENI)
    expect(result.current.liked).toHaveLength(1)
  })

  it('tolerates corrupt localStorage data', () => {
    localStorage.setItem('streamtr-favorites', 'not-json{')
    const { result } = renderHook(() => useFavorites(), { wrapper })
    expect(result.current.saved).toEqual([])
  })
})
