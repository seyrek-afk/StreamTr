// Spot ışığının konusunu seçer: trend listesinin tepesindeki yapım.
//
// Sıralama ölçütü BİLEREK socialScore'dur, TMDB'nin ham sırası (trendRank)
// değil. Trend sekmesindeki ızgara da varsayılan olarak socialScore'a göre
// sıralanır; hero başka bir ölçüt kullansaydı "1. sıradaki yapım" sayfanın iki
// yerinde iki farklı şey olurdu.
//
// Girdi dizisi KOPYALANIR: kaynak, ekranda başka bir sıralamayla kullanılıyor
// olabilir ve sort() yerinde çalışır.
export function pickHeroItem(items) {
  if (!Array.isArray(items) || items.length === 0) return null
  return [...items].sort((a, b) => (b.socialScore || 0) - (a.socialScore || 0))[0] || null
}
