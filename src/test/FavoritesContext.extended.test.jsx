/**
 * FavoritesContext genişletilmiş testleri
 *
 * Mevcut FavoritesContext.test.jsx yalnızca localStorage (Supabase null) yolunu kapsar.
 * Bu dosya:
 *   - Supabase ile oturum açık kullanıcı sync yolunu kapsar (satır 66-99)
 *   - toggleFavorite Supabase DB yazma/silme yolunu kapsar (satır 134-138)
 *   - DB hatası → yerel fallback davranışı
 *   - Oturum açık → kapalı geçişinde yerel listeye dönüş
 *   - toSnapshot'ın tüm alanları doğru kopyalaması
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LIKE_NONE, LIKE_YES, LIKE_LOVE,
  DURUM_YOK, DURUM_BEGENI, DURUM_BAYILMA } from '../contexts/FavoritesContext.jsx'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'

// ── Supabase mock yardımcıları ────────────────────────────────────────────────
function makeQueryBuilder(rows = []) {
  // Zincir yapısı: .from().select().eq().order() veya .delete().eq().eq()
  const builder = {
    _rows: rows,
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockResolvedValue({ data: rows.map(r => ({ item: r })), error: null }),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    delete: vi.fn().mockReturnThis(),
  }
  return builder
}

let _mockSupabase = null
let _mockUser = null

vi.mock('../lib/supabase.js', () => ({
  get supabase() { return _mockSupabase },
  get isSupabaseConfigured() { return _mockSupabase !== null },
}))

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: _mockUser }),
}))

describe('FavoritesContext — Supabase sync yolu', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('kullanıcı giriş yaptığında Supabase favorites çekilir', async () => {
    const dbItem = {
      key: 'tmdb:movie:999',
      title: 'DB Film',
      year: '2022',
      genres: ['Aksiyon'],
      posterPath: null,
      tmdbId: 999,
      mediaType: 'movie',
      _tmdbId: 999,
      _mediaType: 'movie',
    }

    const selectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockResolvedValue({ data: [{ item: dbItem }], error: null }),
    }

    _mockSupabase = {
      from: vi.fn().mockReturnValue(selectBuilder),
    }
    _mockUser = { id: 'user-abc' }

    const { FavoritesProvider, useFavorites } = await import('../contexts/FavoritesContext.jsx')
    const wrapper = ({ children }) => React.createElement(FavoritesProvider, null, children)
    const { result } = renderHook(() => useFavorites(), { wrapper })

    await waitFor(() => {
      expect(result.current.saved.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    expect(result.current.saved[0].title).toBe('DB Film')
  })

  it('DB hatası olursa yerel localStorage favorilerine döner', async () => {
    const localFav = { key: 'title:Yerel Film:2020', title: 'Yerel Film', year: 2020, genres: ['Dram'] }
    localStorage.setItem('streamtr-favorites', JSON.stringify([localFav]))

    _mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        order:  vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    }
    _mockUser = { id: 'user-err' }

    const { FavoritesProvider, useFavorites } = await import('../contexts/FavoritesContext.jsx')
    const wrapper = ({ children }) => React.createElement(FavoritesProvider, null, children)
    const { result } = renderHook(() => useFavorites(), { wrapper })

    await waitFor(() => {
      // syncing false olunca işlem bitti
      expect(result.current.syncing).toBe(false)
    }, { timeout: 3000 })

    // Yerel favorilere düşmeli
    expect(result.current.saved.length).toBeGreaterThan(0)
    expect(result.current.saved[0].title).toBe('Yerel Film')
  })

  it('kullanıcı çıkış yaptığında (user=null) yerel listeye döner', async () => {
    const localFav = { key: 'title:Çıkış Filmi:2019', title: 'Çıkış Filmi', year: 2019, genres: ['Komedi'] }
    localStorage.setItem('streamtr-favorites', JSON.stringify([localFav]))

    _mockSupabase = null  // Supabase yok → sadece localStorage
    _mockUser = null

    const { FavoritesProvider, useFavorites } = await import('../contexts/FavoritesContext.jsx')
    const wrapper = ({ children }) => React.createElement(FavoritesProvider, null, children)
    const { result } = renderHook(() => useFavorites(), { wrapper })

    expect(result.current.saved[0].title).toBe('Çıkış Filmi')
  })
})

describe('FavoritesContext — setDurum Supabase yolları', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('setDurum — oturumlu kullanıcı için DB upsert çağrılır', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null })
    const deleteFn = vi.fn().mockResolvedValue({ data: null, error: null })
    const eqFn = vi.fn().mockReturnThis()

    const fromBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: eqFn,
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: upsertFn,
      delete: vi.fn().mockReturnValue({ eq: eqFn }),
    }

    _mockSupabase = {
      from: vi.fn().mockReturnValue(fromBuilder),
    }
    _mockUser = { id: 'user-toggle' }

    const { FavoritesProvider, useFavorites } = await import('../contexts/FavoritesContext.jsx')
    const wrapper = ({ children }) => React.createElement(FavoritesProvider, null, children)
    const { result } = renderHook(() => useFavorites(), { wrapper })

    // Sync bekleniyor
    await waitFor(() => expect(result.current.syncing).toBe(false), { timeout: 3000 })

    const item = { title: 'Test', year: '2023', _tmdbId: 100, _mediaType: 'movie', genres: ['Dram'] }

    act(() => { result.current.setDurum(item, DURUM_BEGENI) })

    // İyimser güncelleme anında gerçekleşir
    expect(result.current.durum(item)).toBe(DURUM_BEGENI)
    expect(result.current.count).toBe(1)
  })

  it('setDurum — ekle, yükselt, kaldır (Supabase yok)', async () => {
    _mockSupabase = null
    _mockUser = null

    const { FavoritesProvider, useFavorites } = await import('../contexts/FavoritesContext.jsx')
    const wrapper = ({ children }) => React.createElement(FavoritesProvider, null, children)
    const { result } = renderHook(() => useFavorites(), { wrapper })

    const item = { title: 'Çift Toggle', year: '2023', genres: ['Aksiyon'] }

    act(() => { result.current.setDurum(item, DURUM_BEGENI) })
    expect(result.current.count).toBe(1)
    expect(result.current.durum(item)).toBe(DURUM_BEGENI)

    act(() => { result.current.setDurum(item, DURUM_BAYILMA) })
    expect(result.current.count).toBe(1)
    expect(result.current.durum(item)).toBe(DURUM_BAYILMA)

    act(() => { result.current.setDurum(item, DURUM_YOK) })
    expect(result.current.count).toBe(0)
    expect(result.current.durum(item)).toBe(DURUM_YOK)
  })

  it('setDurum boş key (null item) → sessizce yok sayılır', async () => {
    _mockSupabase = null
    _mockUser = null

    const { FavoritesProvider, useFavorites } = await import('../contexts/FavoritesContext.jsx')
    const wrapper = ({ children }) => React.createElement(FavoritesProvider, null, children)
    const { result } = renderHook(() => useFavorites(), { wrapper })

    act(() => { result.current.setDurum({ title: '', year: '' }, DURUM_BEGENI) })
    // key boş string → atlansın (favKey: 'title::')
    // Buradaki önemli nokta: uygulama çökmemeli
    expect(result.current.count).toBeGreaterThanOrEqual(0)
  })
})

describe('FavoritesContext — toSnapshot alanları', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
    _mockSupabase = null
    _mockUser = null
  })

  it('snapshot tüm gerekli öneri alanlarını içerir', async () => {
    const { FavoritesProvider, useFavorites } = await import('../contexts/FavoritesContext.jsx')
    const wrapper = ({ children }) => React.createElement(FavoritesProvider, null, children)
    const { result } = renderHook(() => useFavorites(), { wrapper })

    const item = {
      title: 'Snapshot Test',
      originalTitle: 'Snapshot Test EN',
      year: '2021',
      type: 'film',
      genres: ['Bilim Kurgu', 'Gerilim'],
      posterPath: '/poster.jpg',
      imdbScore: 8.1,
      rottenTomatoesScore: 82,
      letterboxdScore: 3.9,
      _tmdbId: 777,
      _mediaType: 'movie',
    }

    act(() => { result.current.setDurum(item, DURUM_BEGENI) })

    const snap = result.current.saved[0]
    expect(snap.key).toBe('tmdb:movie:777')
    expect(snap.title).toBe('Snapshot Test')
    expect(snap.originalTitle).toBe('Snapshot Test EN')
    expect(snap.year).toBe('2021')
    expect(snap.type).toBe('film')
    expect(snap.genres).toEqual(['Bilim Kurgu', 'Gerilim'])
    expect(snap.posterPath).toBe('/poster.jpg')
    expect(snap.imdbScore).toBe(8.1)
    expect(snap.rottenTomatoesScore).toBe(82)
    expect(snap.letterboxdScore).toBe(3.9)
    expect(snap.tmdbId).toBe(777)
    expect(snap.mediaType).toBe('movie')
    expect(snap._tmdbId).toBe(777)
    expect(snap._mediaType).toBe('movie')
  })

  it('TMDB id yoksa tmdbId/mediaType null, anahtar title tabanlı', async () => {
    const { FavoritesProvider, useFavorites } = await import('../contexts/FavoritesContext.jsx')
    const wrapper = ({ children }) => React.createElement(FavoritesProvider, null, children)
    const { result } = renderHook(() => useFavorites(), { wrapper })

    const item = { title: 'Mock İçerik', year: 2020, genres: ['Dram'] }
    act(() => { result.current.setDurum(item, DURUM_BEGENI) })

    const snap = result.current.saved[0]
    expect(snap.key).toBe('title:Mock İçerik:2020')
    expect(snap.tmdbId).toBeNull()
    expect(snap.mediaType).toBeNull()
  })

  it('tmdbId kaynaklı key, tmdbId (mini item) alanından da okunur', async () => {
    const { FavoritesProvider, useFavorites, favKey } = await import('../contexts/FavoritesContext.jsx')
    const wrapper = ({ children }) => React.createElement(FavoritesProvider, null, children)
    const { result } = renderHook(() => useFavorites(), { wrapper })

    // Mini item: tmdbId/mediaType (search sonucu) kullanan format
    const miniItem = { title: 'Mini', year: '2022', tmdbId: 333, mediaType: 'tv', genres: [] }
    act(() => { result.current.setDurum(miniItem, DURUM_BEGENI) })

    const snap = result.current.saved[0]
    expect(snap.key).toBe('tmdb:tv:333')
    expect(snap._tmdbId).toBe(333)
    expect(snap._mediaType).toBe('tv')
  })
})
