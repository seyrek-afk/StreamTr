// TMDB istek parametrelerini doğrulama yardımcıları.
//
// Güven sınırı: favori `item` snapshot'ları Supabase'de jsonb olarak saklanır.
// RLS yalnızca SAHİPLİĞİ (user_id) doğrular, jsonb'nin ŞEKLİNİ/içeriğini DEĞİL —
// kimliği doğrulanmış bir kullanıcı doğrudan Supabase REST ile kendi `item`
// alanına keyfi JSON yazabilir. Bu veri sonra TMDB istek URL'lerine
// `/${mediaType}/${tmdbId}/...` biçiminde gömülür. tmdbId/mediaType
// doğrulanmazsa path-injection (URL yolu manipülasyonu) mümkün olur.
// Bu yüzden her ikisini de sink'e gitmeden katı biçimde doğrularız.

// TMDB medya türü yalnızca bu iki değerden biri olabilir.
export function isValidMediaType(mediaType) {
  return mediaType === 'movie' || mediaType === 'tv'
}

// TMDB id'leri pozitif tam sayıdır. String "123" da kabul edilir (sayıya çevrilir),
// ama "../x", "1/2", "1?foo" gibi her şey reddedilir.
export function isValidTmdbId(id) {
  if (typeof id === 'number') return Number.isInteger(id) && id > 0
  if (typeof id === 'string') return /^[0-9]+$/.test(id) && Number(id) > 0
  return false
}

// Hem id hem mediaType geçerliyse true. URL kurmadan önce çağrılır.
export function isValidTmdbRef(id, mediaType) {
  return isValidTmdbId(id) && isValidMediaType(mediaType)
}

// ── TR Yayın Platformu Eşlemesi ───────────────────────────────────────────────
// TMDB provider_id → StreamTR platform id (PLATFORMS sabitindeki id ile birebir).
// "Mubi" yazımı tutarlı tutulur: PLAT_MAP anahtarı "Mubi" olduğundan "MUBI"
// kullanılmaz — tekilleştirme ve rozet eşleşmesi bozulmasın.
export const PROVIDER_MAP = {
  8:    'Netflix',
  119:  'Amazon Prime',
  337:  'Disney+',
  350:  'Apple TV+',
  1899: 'HBO Max',
  384:  'HBO Max',
  11:   'Mubi',
  1759: 'Mubi',
  2:    'Apple TV+',
  341:  'BluTV',
  479:  'PUHUTV',
  531:  'Paramount+',
  533:  'Gain',
  584:  'TOD',
}

// TMDB watch/providers yanıtından TR platformlarını string[] olarak döndürür.
// wpJson: fetch(`/watch/providers`).json() sonucu
// Önce flatrate, sonra free; PROVIDER_MAP'te eşleşmeyenler provider_name'e düşer.
// Tekilleştirir (Set ile), ekleme sırasını korur. TR verisi yoksa [].
export function mapTrProviders(wpJson) {
  try {
    const tr = wpJson?.results?.TR
    if (!tr) return []
    const all = [...(tr.flatrate || []), ...(tr.free || [])]
    if (all.length === 0) return []
    const seen = new Set()
    const list = []
    for (const p of all) {
      const key = PROVIDER_MAP[p.provider_id] || p.provider_name
      if (key && !seen.has(key)) {
        seen.add(key)
        list.push(key)
      }
    }
    return list
  } catch {
    return []
  }
}

// TMDB watch/providers ucunu çağırıp TR platformlarını döndürür.
// Güvenlik: isValidTmdbRef kontrolü — geçersizse ağ isteği yapmadan [].
// VITE_TMDB_KEY yoksa []. AbortError dahil her hatada [].
export async function fetchTrPlatforms(mediaType, id, signal) {
  if (!isValidTmdbRef(id, mediaType)) return []
  const KEY = import.meta.env.VITE_TMDB_KEY
  if (!KEY) return []
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${id}/watch/providers?api_key=${KEY}`,
      { signal }
    )
    if (!res.ok) return []
    const json = await res.json()
    return mapTrProviders(json)
  } catch {
    return []
  }
}
