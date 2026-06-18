import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const FavoritesContext = createContext(null)

const STORAGE_KEY = 'streamtr-favorites'

// ── Kararlı kimlik anahtarı ──────────────────────────────────────────────────
// TMDB öğeleri _tmdbId/_mediaType (kart) veya tmdbId/mediaType (mini/arama) taşır.
// Mock öğelerde hiçbiri yoktur → başlık+yıl ile anahtarlanır.
export function favKey(item) {
  if (!item) return ''
  const tmdbId    = item._tmdbId    ?? item.tmdbId
  const mediaType = item._mediaType ?? item.mediaType
  if (tmdbId) return `tmdb:${mediaType || 'x'}:${tmdbId}`
  return `title:${item.title || ''}:${item.year || ''}`
}

// ── Favori snapshot'ı (yeniden render + öneri için yeterli alanlar) ───────────
function toSnapshot(item) {
  return {
    key:                 favKey(item),
    title:               item.title,
    originalTitle:       item.originalTitle,
    year:                item.year,
    type:                item.type,
    genres:              item.genres || [],
    posterPath:          item.posterPath,
    imdbScore:           item.imdbScore ?? null,
    rottenTomatoesScore: item.rottenTomatoesScore ?? null,
    letterboxdScore:     item.letterboxdScore ?? null,
    tmdbId:              item._tmdbId    ?? item.tmdbId    ?? null,
    mediaType:           item._mediaType ?? item.mediaType ?? null,
    // ContentCard ile genişletilebilmesi için _tmdbId/_mediaType de saklanır
    _tmdbId:             item._tmdbId    ?? item.tmdbId    ?? null,
    _mediaType:          item._mediaType ?? item.mediaType ?? null,
  }
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    } catch {
      /* sessiz geç: quota/private mode */
    }
  }, [favorites])

  const isFavorite = useCallback(
    (item) => {
      const k = favKey(item)
      return favorites.some(f => f.key === k)
    },
    [favorites]
  )

  const toggleFavorite = useCallback((item) => {
    const k = favKey(item)
    if (!k) return
    setFavorites(prev =>
      prev.some(f => f.key === k)
        ? prev.filter(f => f.key !== k)
        : [toSnapshot(item), ...prev]
    )
  }, [])

  return (
    <FavoritesContext.Provider
      value={{ favorites, isFavorite, toggleFavorite, count: favorites.length }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => useContext(FavoritesContext)
