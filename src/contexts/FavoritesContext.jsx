import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'

const FavoritesContext = createContext(null)

// Depolama anahtarı BİLEREK değişmedi: kullanıcıların mevcut kayıtları burada
// ve göç okuma anında yapılıyor. Anahtarı değiştirmek herkesin listesini
// görünmez kılardı.
const STORAGE_KEY = 'streamtr-favorites'

// ── İki eksen ────────────────────────────────────────────────────────────────
// Eskiden tek "favori" bayrağı vardı ve iki ayrı niyeti taşıyordu: "bunu
// sevdim" ile "bunu izlemek istiyorum". Artık ayrı:
//   like      → 0 yok · 1 Beğendim · 2 Bayıldım
//   watchlist → İzleyeceklerim (beğeniden BAĞIMSIZ; bir yapım hem bayıldığın
//               hem yeniden izlemek istediğin olabilir)
export const LIKE_NONE = 0
export const LIKE_YES  = 1
export const LIKE_LOVE = 2

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

// ── Snapshot (yeniden render + öneri için yeterli alanlar) ────────────────────
function toSnapshot(item) {
  return {
    key:                 favKey(item),
    title:               item.title,
    originalTitle:       item.originalTitle,
    year:                item.year,
    type:                item.type,
    genres:              item.genres || [],
    posterPath:          item.posterPath,
    backdropPath:        item.backdropPath ?? null,
    imdbScore:           item.imdbScore ?? null,
    rottenTomatoesScore: item.rottenTomatoesScore ?? null,
    letterboxdScore:     item.letterboxdScore ?? null,
    description:         item.description ?? '',
    tmdbId:              item._tmdbId    ?? item.tmdbId    ?? null,
    mediaType:           item._mediaType ?? item.mediaType ?? null,
    // ContentCard ile genişletilebilmesi için _tmdbId/_mediaType de saklanır
    _tmdbId:             item._tmdbId    ?? item.tmdbId    ?? null,
    _mediaType:          item._mediaType ?? item.mediaType ?? null,
    like:                LIKE_NONE,
    watchlist:           false,
  }
}

// ── Göç ──────────────────────────────────────────────────────────────────────
// Eski kayıtlarda like/watchlist alanı yok. Hepsi "Beğendim" (1. kademe) kabul
// edilir — kullanıcı bir şeyi favorilemişse en azından beğenmiştir; hangisinin
// "izleyeceğim" olduğunu tahmin etmek veri uydurmak olurdu.
//
// İdempotent: yeni şemadaki kayda dokunmaz, bu yüzden her okumada güvenle
// çalışır ve ayrı bir "göç yapıldı" bayrağı tutmak gerekmez.
export function migrateSaved(list) {
  return (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .map(f => (typeof f.like === 'number'
      ? f
      : { ...f, like: LIKE_YES, watchlist: false }))
}

// Kaydın var olma nedeni kalmadıysa (ne beğeni ne izleme listesi) silinir.
const bosMu = (s) => s.like === LIKE_NONE && !s.watchlist

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return migrateSaved(JSON.parse(raw || '[]'))
  } catch {
    return []
  }
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const [saved, setSaved] = useState(readLocal)
  const [syncing, setSyncing] = useState(false)

  // Güncelleyicide taze listeyi okumak için ref (deps churn'ü önler).
  const savedRef = useRef(saved)
  useEffect(() => { savedRef.current = saved }, [saved])

  // ── Oturum değiştikçe kaynak değiştir ───────────────────────────────────────
  // Supabase yapılandırılmamışsa bu efekt hiçbir şey yapmaz → eski davranış.
  useEffect(() => {
    if (!supabase) return
    if (!user) { setSaved(readLocal()); return }  // çıkış → yerel listeye dön

    let alive = true
    setSyncing(true)
    ;(async () => {
      try {
        const { data: rows, error } = await supabase
          .from('favorites').select('key,item').eq('user_id', user.id)
        if (error) throw error
        const dbKeys = new Set((rows || []).map(r => r.key))

        // Girişten önce yerelde biriken kayıtları DB'ye taşı (kayıpsız birleştirme)
        const local = readLocal()
        const toPush = local.filter(f => f.key && !dbKeys.has(f.key))
        if (toPush.length) {
          await supabase.from('favorites').upsert(
            toPush.map(f => ({ user_id: user.id, key: f.key, item: f })),
            { onConflict: 'user_id,key' }
          )
        }

        const { data: merged } = await supabase
          .from('favorites').select('item').eq('user_id', user.id)
          .order('created_at', { ascending: false })
        // DB'deki eski kayıtlar da aynı göçten geçer; şema jsonb olduğu için
        // veritabanı tarafında migration gerekmiyor.
        if (alive) setSaved(migrateSaved((merged || []).map(r => r.item)))
      } catch {
        if (alive) setSaved(readLocal())
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch {
      /* sessiz geç: quota/private mode */
    }
  }, [saved, user])

  // ── Tek yazma yolu ───────────────────────────────────────────────────────────
  // Beğeni ve izleme listesi aynı kaydın iki alanı olduğu için tek bir
  // güncelleyici var; ikisi ayrı yollardan yazsaydı aynı satır için yarışırlardı.
  const guncelle = useCallback((item, donustur) => {
    const k = favKey(item)
    if (!k) return

    const mevcut = savedRef.current.find(f => f.key === k)
    const taban  = mevcut || toSnapshot(item)
    const yeni   = donustur(taban)

    setSaved(prev => {
      const digerleri = prev.filter(f => f.key !== k)
      if (bosMu(yeni)) return digerleri
      // Yeni kayıt başa, mevcut kayıt yerinde kalır: kademe değiştirmek
      // listedeki sırayı bozmasın.
      return mevcut
        ? prev.map(f => (f.key === k ? yeni : f))
        : [yeni, ...digerleri]
    })

    if (supabase && user) {
      const op = bosMu(yeni)
        ? supabase.from('favorites').delete().eq('user_id', user.id).eq('key', k)
        : supabase.from('favorites').upsert(
            { user_id: user.id, key: k, item: yeni }, { onConflict: 'user_id,key' })
      Promise.resolve(op).catch(() => {})
    }
  }, [user])

  const kayit = useCallback(
    (item) => saved.find(f => f.key === favKey(item)),
    [saved]
  )

  const likeLevel     = useCallback((item) => kayit(item)?.like ?? LIKE_NONE, [kayit])
  const isWatchlisted = useCallback((item) => Boolean(kayit(item)?.watchlist), [kayit])

  // Doğrudan seçim: hangi kademe isteniyorsa o yazılır. Döngü kaldırıldı —
  // üç simge yan yana durduğu için aradaki durumlardan geçmeye gerek yok.
  // Beğendim ile Bayıldım aynı eksenin iki değeri, bu yüzden birbirini dışlar.
  const setLike = useCallback((item, seviye) => {
    guncelle(item, s => ({ ...s, like: seviye }))
  }, [guncelle])

  const toggleWatchlist = useCallback((item) => {
    guncelle(item, s => ({ ...s, watchlist: !s.watchlist }))
  }, [guncelle])

  const liked     = saved.filter(f => f.like === LIKE_YES)
  const loved     = saved.filter(f => f.like === LIKE_LOVE)
  const watchlist = saved.filter(f => f.watchlist)

  return (
    <FavoritesContext.Provider
      value={{
        saved, liked, loved, watchlist,
        likeLevel, isWatchlisted, setLike, toggleWatchlist,
        count: saved.length, syncing,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => useContext(FavoritesContext)
