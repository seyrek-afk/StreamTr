// Spot ışığının konusu: EKRANDA GÖRÜNEN listenin başındaki yapım.
//
// Bu fonksiyon bilerek sıralama YAPMAZ. Sıralama ölçütü sekmeye göre değişir —
// trend sosyal etkiye, ülke merceği ağırlıklı puana, Dünya merceği ham IMDB
// puanına bakar. Ölçüt burada bir kez daha yazılsaydı, ızgaranınkiyle er geç
// ayrışır ve "1. sıradaki yapım" sayfanın iki yerinde iki farklı şey olurdu.
//
// Bu yüzden çağıran, ızgaranın kullandığı SIRALI listeyi verir; burada yalnız
// başı alınır. Uyuşmazlık böylece mümkün olmaktan çıkar.
export function pickHeroItem(orderedItems) {
  if (!Array.isArray(orderedItems) || orderedItems.length === 0) return null
  return orderedItems[0] || null
}
