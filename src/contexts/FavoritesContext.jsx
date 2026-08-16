import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'

const FavoritesContext = createContext(null)

// Depolama anahtarı BİLEREK değişmedi: kullanıcıların mevcut kayıtları burada
// ve göç okuma anında yapılıyor. Anahtarı değiştirmek herkesin listesini
// görünmez kılardı.
const STORAGE_KEY = 'streamtr-favorites'

// ── Tek durum ────────────────────────────────────────────────────────────────
// Bir yapımın kullanıcıya göre TEK bir durumu vardır ve üçü birbirini dışlar:
//   Beğendim · Bayıldım · İzleyeceğim
//
// Neden dışlayıcı: puan vermek "izledim" demektir, dolayısıyla kayıt izleme
// kuyruğundan düşmelidir. Aksi halde İzleyeceklerim zamanla çoktan izlenmiş
// yapımlarla dolar ve işe yaramaz hale gelir — kimse elle temizlemez.
// (Letterboxd/IMDb/Trakt de puanlamayı izleme listesinden otomatik düşürür.)
//
// Bedeli bilinerek kabul edildi: "izledim, bayıldım, tekrar izleyeceğim"
// durumu ifade edilemez. StreamTR bir film günlüğü değil keşif uygulaması,
// kuyruk/geçmiş ayrımının karşılığı burada zayıf.
//
// DEPOLAMA iki alanda kalır (like + watchlist): şema değişmesin, göç
// gerekmesin. Değişmez kural: ikisi AYNI ANDA dolu olamaz — okuma anında
// normalize edilir, yazma tek kapıdan geçer.
export const LIKE_NONE = 0
export const LIKE_YES  = 1
export const LIKE_LOVE = 2

// Tek durum kodları (okuma/yazma arayüzü)
export const DURUM_YOK    = 0
export const DURUM_BEGENI = 1
export const DURUM_BAYILMA = 2
export const DURUM_IZLEME = 3

export const durumOf = (kayit) => {
  if (!kayit) return DURUM_YOK
  // Puan varsa o kazanır: puanlamak izlemeyi ima eder, tersi ima etmez.
  if (kayit.like === LIKE_YES)  return DURUM_BEGENI
  if (kayit.like === LIKE_LOVE) return DURUM_BAYILMA
  return kayit.watchlist ? DURUM_IZLEME : DURUM_YOK
}

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
    .map(f => {
      const t = typeof f.like === 'number' ? f : { ...f, like: LIKE_YES, watchlist: false }
      // Dışlayıcılık okuma anında da uygulanır: iki eksen bağımsızken kaydedilmiş
      // kayıtlarda ikisi birden dolu olabilir. Puan kazanır, izleme işareti düşer
      // — yoksa aynı yapım hem Bayıldıklarım hem İzleyeceklerim rafında görünürdü.
      return (t.like > LIKE_NONE && t.watchlist) ? { ...t, watchlist: false } : t
    })
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
    // Dönüştürücü yalnız durum alanlarını döndürür; snapshot'ın geri kalanı korunur.
    const yeni   = { ...taban, ...donustur(taban) }

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

  const durum = useCallback((item) => durumOf(kayit(item)), [kayit])

  // TEK yazma kapısı. Dışlayıcılık burada, çağıranda değil: üç düğmenin her
  // biri "diğerlerini de sıfırla" demeyi unutabilirdi, kural tek yerde durur.
  const setDurum = useCallback((item, hedef) => {
    guncelle(item, () => ({
      like:      hedef === DURUM_BEGENI ? LIKE_YES
               : hedef === DURUM_BAYILMA ? LIKE_LOVE
               : LIKE_NONE,
      watchlist: hedef === DURUM_IZLEME,
    }))
  }, [guncelle])

  const liked     = saved.filter(f => f.like === LIKE_YES)
  const loved     = saved.filter(f => f.like === LIKE_LOVE)
  const watchlist = saved.filter(f => f.watchlist)

  return (
    <FavoritesContext.Provider
      value={{
        saved, liked, loved, watchlist,
        durum, setDurum,
        count: saved.length, syncing,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => useContext(FavoritesContext)
