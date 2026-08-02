// ── Ülke bazlı keşif: TMDB discover parametreleri ve ağırlıklı sıralama ──────
//
// Neden ayrı bir veri yolu gerekiyor?
// TMDB'nin top_rated uçları Bayesian eşiklidir (tv ~200, movie ~300 oy). Küresel
// olmayan yapımlar TMDB'de çok daha az oy alır (TR dizileri tipik olarak 50–130),
// bu yüzden o listelere YAPISAL olarak giremezler — sıralama tercihi değil, eşik
// etkisi. Ülke kataloğu ancak /discover + with_origin_country ile ve düşürülmüş
// oy eşiğiyle görünür hale gelir.
//
// Eksen "köken"dir, "platform" değil: TMDB'de Gain'in sağlayıcı kaydı yok,
// Exxen 1 dizi / tabii 3 dizi ile pratikte boş. Köken ekseni ise hem Gain
// yapımlarını hem Netflix'in yerel orijinallerini tek sorguda kapsar.

const TMDB_BASE = 'https://api.themoviedb.org/3'

// Havuza girmek için gereken en az oy sayısı.
// 20'de TR havuzu ~176 dizi / ~622 film. Daha düşüğü tek haneli oyla 10/10 alan
// yapımları içeri alır; ağırlıklı puan onları zaten bastırır ama havuzu şişirir.
export const VOTE_MIN = 20

// Bayesian ağırlıklı puan (IMDB "weighted rating" ile aynı biçim):
//   WR = (v/(v+m))·R + (m/(v+m))·C
//
// m — güven eşiği: oy sayısı buna ulaşana kadar puan havuz ortalamasına çekilir.
// C — havuz ortalaması. Ölçüm (2026-08, discover TR, oy≥20, 100'er örnek):
//     dizi 7.61 · film 6.25. İkisi belirgin farklı olduğundan TEK sabit
//     kullanılmaz. Bunlar YEDEK değerlerdir; ülke havuzları birbirinden farklı
//     olduğu için çağıran taraf yüklenen kümenin gerçek ortalamasını geçebilir
//     (bkz. poolMean) — böylece Kore havuzuna TR ortalaması dayatılmaz.
export const BAYES_M = 25
export const BAYES_C = { tv: 7.6, movie: 6.25 }

// Yüklenen kümenin ortalama puanı. Yeterli örnek yoksa null döner ki çağıran
// taraf yedek sabite düşsün — 3 öğeden hesaplanan "havuz ortalaması" gürültüdür.
export function poolMean(items, minSample = 20) {
  const vals = (items || [])
    .map(i => Number(i.vote_average ?? i.imdbScore))
    .filter(v => Number.isFinite(v) && v > 0)
  if (vals.length < minSample) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// Ham ortalama düşük oy sayısında güvenilmezdir: 3 oyla 10/10 alan bir yapım
// listenin başına geçer. Bu fonksiyon onu havuz ortalamasına doğru çeker.
export function weightedScore(voteAvg, voteCount, mediaType = 'tv', c = null, m = BAYES_M) {
  const v = Number(voteCount)
  const r = Number(voteAvg)
  if (!Number.isFinite(v) || !Number.isFinite(r) || v <= 0 || r <= 0) return 0
  const mean = Number.isFinite(c) && c > 0 ? c : (BAYES_C[mediaType] ?? BAYES_C.tv)
  return (v / (v + m)) * r + (m / (v + m)) * mean
}

// Kartları ağırlıklı puana göre azalan sırala (girdi dizisini bozmaz).
// Eşitlikte oy sayısı yüksek olan öne gelir — daha çok veriye dayanan sıra.
export function sortByWeightedScore(cards) {
  return [...(cards || [])].sort(
    (a, b) => (b._weightedScore || 0) - (a._weightedScore || 0) ||
              (b._voteCount     || 0) - (a._voteCount     || 0)
  )
}

// TMDB /discover URL'si kurar.
// country verilirse with_origin_country uygulanır; verilmezse küresel keşif olur.
export function discoverUrl(mediaType, { country, page = 1, apiKey, ...extra } = {}) {
  const qs = new URLSearchParams({ language: 'tr-TR', page: String(page) })
  if (country) qs.set('with_origin_country', country)
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  if (apiKey) qs.set('api_key', apiKey)
  return `${TMDB_BASE}/discover/${mediaType}?${qs.toString()}`
}

// Ülke liste sekmesinin (diziler/filmler) ana sorgu parametreleri.
// Sıralama sunucuda vote_average.desc'tir; nihai sıra istemcide ağırlıklı puanla
// yeniden kurulur (TMDB ham ortalamaya göre sıralar, Bayesian ağırlık uygulamaz).
export function listParams() {
  return {
    'vote_count.gte': VOTE_MIN,
    sort_by: 'vote_average.desc',
  }
}
