import { fetchTrPlatforms } from './tmdb.js'

// Platform (yayın sağlayıcı) önbelleği — "mediaType:id" → string[].
//
// Modül düzeyinde ve PAYLAŞILIR: aynı yapım hem bir sekme ızgarasında hem
// favorilerde hem öneri listesinde görünebilir. Önbellek her tüketicide ayrı
// olsaydı aynı yapım için TMDB'ye birden fazla istek giderdi.
export const providerCache = new Map()

export const platformKey = (item) => `${item._mediaType}:${item._tmdbId}`

export const hasPlatformData = (item) =>
  Boolean(item?._tmdbId && item?._mediaType)

// Önbellekte karşılığı olan kartların platforms alanını doldurur; hiçbiri
// yoksa DİZİNİN KENDİSİNİ döndürür (gereksiz yeniden render olmasın).
export function fillFromCache(items) {
  if (!Array.isArray(items) || items.length === 0) return items
  let changed = false
  const next = items.map(item => {
    if (!hasPlatformData(item)) return item
    if (item.platforms?.length > 0) return item
    const cached = providerCache.get(platformKey(item))
    if (!cached) return item
    changed = true
    return { ...item, platforms: cached }
  })
  return changed ? next : items
}

// Önbellekte olmayanları sınırlı eşzamanlılıkla çeker; her kart geldikçe
// onLoaded(item, platforms) çağrılır (tüketicinin kendi durumunu güncellemesi
// için). Sıralı beklemek yerine akış hâlinde bildirmek, ilk rozetlerin
// listenin tamamı gelmeden görünmesini sağlar.
export async function loadPlatforms(items, signal, onLoaded, concurrency = 7) {
  const bekleyen = (items || []).filter(
    item => hasPlatformData(item) && !providerCache.has(platformKey(item))
  )
  if (bekleyen.length === 0) return false

  let idx = 0
  const worker = async () => {
    while (idx < bekleyen.length) {
      if (signal?.aborted) return
      const item = bekleyen[idx++]
      const key = platformKey(item)
      if (providerCache.has(key)) continue   // başka worker çekmiş
      const platforms = await fetchTrPlatforms(item._mediaType, item._tmdbId, signal)
      if (signal?.aborted) return
      providerCache.set(key, platforms)
      onLoaded?.(item, platforms)
    }
  }
  await Promise.allSettled(
    Array.from({ length: Math.min(concurrency, bekleyen.length) }, worker)
  )
  return true
}
