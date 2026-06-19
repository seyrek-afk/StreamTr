import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'

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

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState(readLocal)
  const [syncing, setSyncing] = useState(false)

  // toggle içinde güncel listeyi okumak için ref (deps churn'ü önler).
  const favoritesRef = useRef(favorites)
  useEffect(() => { favoritesRef.current = favorites }, [favorites])

  // ── Oturum değiştikçe kaynak değiştir ───────────────────────────────────────
  // Supabase yapılandırılmamışsa bu efekt hiçbir şey yapmaz → eski davranış (localStorage).
  useEffect(() => {
    if (!supabase) return
    if (!user) { setFavorites(readLocal()); return }  // çıkış → yerel listeye dön

    let alive = true
    setSyncing(true)
    ;(async () => {
      try {
        // Mevcut DB anahtarlarını çek
        const { data: rows, error } = await supabase
          .from('favorites').select('key,item').eq('user_id', user.id)
        if (error) throw error
        const dbKeys = new Set((rows || []).map(r => r.key))

        // Girişten önce yerelde biriken favorileri DB'ye taşı (kayıpsız birleştirme)
        const local = readLocal()
        const toPush = local.filter(f => f.key && !dbKeys.has(f.key))
        if (toPush.length) {
          await supabase.from('favorites').upsert(
            toPush.map(f => ({ user_id: user.id, key: f.key, item: f })),
            { onConflict: 'user_id,key' }
          )
        }

        // Birleşik listeyi (DB = tek doğru kaynak) yeniden yükle
        const { data: merged } = await supabase
          .from('favorites').select('item').eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (alive) setFavorites((merged || []).map(r => r.item).filter(Boolean))
      } catch {
        // DB erişilemezse yerel listeyle devam et
        if (alive) setFavorites(readLocal())
      } finally {
        if (alive) setSyncing(false)
      }
    })()

    return () => { alive = false }
  }, [user?.id])

  // ── Yerel kalıcılık ──────────────────────────────────────────────────────────
  // Giriş yapıldığında DB tek doğru kaynaktır; localStorage'ı ezme.
  useEffect(() => {
    if (supabase && user) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    } catch {
      /* sessiz geç: quota/private mode */
    }
  }, [favorites, user])

  const isFavorite = useCallback(
    (item) => {
      const k = favKey(item)
      return favorites.some(f => f.key === k)
    },
    [favorites]
  )

  const toggleFavorite = useCallback((item) => {
    const snap = toSnapshot(item)
    const k = snap.key
    if (!k) return
    const exists = favoritesRef.current.some(f => f.key === k)

    // İyimser yerel güncelleme (her durumda anında tepki)
    setFavorites(prev =>
      exists ? prev.filter(f => f.key !== k) : [snap, ...prev]
    )

    // Giriş yapıldıysa DB'ye de yaz (hata olursa sessizce yut)
    if (supabase && user) {
      const op = exists
        ? supabase.from('favorites').delete().eq('user_id', user.id).eq('key', k)
        : supabase.from('favorites').upsert(
            { user_id: user.id, key: k, item: snap }, { onConflict: 'user_id,key' })
      Promise.resolve(op).catch(() => {})
    }
  }, [user])

  return (
    <FavoritesContext.Provider
      value={{ favorites, isFavorite, toggleFavorite, count: favorites.length, syncing }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => useContext(FavoritesContext)
