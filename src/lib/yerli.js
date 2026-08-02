// ── Yerli (Türk yapımı) içerik: keşif parametreleri ve sıralama ──────────────
//
// Neden ayrı bir veri yolu gerekiyor?
// TMDB'nin top_rated uçları Bayesian eşiklidir (tv ~200, movie ~300 oy alt sınırı).
// Türk yapımı diziler TMDB'de tipik olarak 50–130 oy alır; bu yüzden küresel
// listelere YAPISAL olarak giremezler — bu bir sıralama tercihi değil, eşik etkisi.
// Yerli içerik ancak /discover + with_origin_country=TR ile ve düşürülmüş oy
// eşiğiyle görünür hale gelir.
//
// Eksen bilinçli olarak "köken"dir, "platform" değil: TMDB'de Gain'in sağlayıcı
// kaydı yoktur, Exxen 1 dizi / tabii 3 dizi ile pratikte boştur. Platform ekseni
// kurulsaydı raflar boş çıkardı. Köken ekseni ise Gain yapımlarını da, Netflix'in
// Türk orijinallerini de, puhutv'yu da tek sorguda kapsar.

const TMDB_BASE = 'https://api.themoviedb.org/3'

// Havuza girmek için gereken en az oy sayısı.
// 20'de havuz: ~176 dizi / ~622 film (2026-08 ölçümü). Daha düşük eşik tek haneli
// oyla 10/10 alan yapımları içeri alır; Bayesian ağırlık onları zaten bastırır
// ama havuzu gereksiz şişirir ve sayfalama maliyetini artırır.
export const TR_VOTE_MIN = 20

// Bayesian ağırlıklı puan (IMDB "weighted rating" ile aynı biçim):
//   WR = (v/(v+m))·R + (m/(v+m))·C
//
// m — güven eşiği: oy sayısı buna ulaşana kadar puan havuz ortalamasına çekilir.
// C — havuz ortalaması. 2026-08 ölçümü (discover TR, oy≥20, 100'er örnek):
//     dizi 7.61 · film 6.25. İkisi belirgin biçimde farklı olduğundan TEK sabit
//     kullanılmaz; film havuzuna dizi ortalaması uygulanırsa filmler haksız
//     biçimde yukarı çekilir.
export const BAYES_M = 25
export const BAYES_C = { tv: 7.6, movie: 6.25 }

// Ham ortalama düşük oy sayısında güvenilmezdir: 3 oyla 10/10 alan bir yapım
// listenin başına geçer. Bu fonksiyon onu havuz ortalamasına doğru çeker.
export function yerliScore(voteAvg, voteCount, mediaType = 'tv', m = BAYES_M) {
  const v = Number(voteCount)
  const r = Number(voteAvg)
  if (!Number.isFinite(v) || !Number.isFinite(r) || v <= 0 || r <= 0) return 0
  const c = BAYES_C[mediaType] ?? BAYES_C.tv
  return (v / (v + m)) * r + (m / (v + m)) * c
}

// Kartları Yerli Skor'a göre azalan sırala (girdi dizisini bozmaz).
// Eşitlikte oy sayısı yüksek olan öne gelir — daha çok veriye dayanan sıra.
export function sortByYerliScore(cards) {
  return [...(cards || [])].sort(
    (a, b) => (b._yerliScore || 0) - (a._yerliScore || 0) ||
              (b._voteCount  || 0) - (a._voteCount  || 0)
  )
}

// TMDB /discover URL'si kurar. with_origin_country=TR her zaman uygulanır.
// extra: ek TMDB parametreleri (ör. { 'vote_count.gte': 20, sort_by: '...' }).
export function discoverUrl(mediaType, { page = 1, apiKey, ...extra } = {}) {
  const qs = new URLSearchParams({
    with_origin_country: 'TR',
    language: 'tr-TR',
    page: String(page),
  })
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  if (apiKey) qs.set('api_key', apiKey)
  return `${TMDB_BASE}/discover/${mediaType}?${qs.toString()}`
}

// Yerli liste sekmesinin (diziler/filmler) ana sorgu parametreleri.
// Sıralama sunucuda vote_average.desc'tir; nihai sıra istemcide Yerli Skor ile
// yeniden kurulur (TMDB Bayesian ağırlık uygulamadan ham ortalamaya göre sıralar).
export function yerliListParams() {
  return {
    'vote_count.gte': TR_VOTE_MIN,
    sort_by: 'vote_average.desc',
  }
}
