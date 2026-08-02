// ── Arama eşleştirme yardımcıları ────────────────────────────────────────────
//
// TMDB aramasının ölçülen üç zayıflığı (2026-08 testleri) burada telafi edilir:
//
// 1) TANIMA SORUNU: language=tr-TR ile "Inception" araması "Başlangıç" döndürür.
//    Sonuç doğrudur ama listede yalnız yerelleştirilmiş ad yazarsa kullanıcı
//    aradığı filmi tanıyamaz. Bu yüzden orijinal ad da taşınır ve gösterilir.
// 2) YAZIM HATASI TOLERANSI YOK: "Inceptionn" ve "Breking Bad" sıfır sonuç verir.
//    TMDB'de fuzzy eşleşme yoktur. Sondaki fazlalık/hatalı harfler ön-ek kırpma
//    ile kurtarılabilir ("Inceptio" → Başlangıç). Kelime İÇİNDEKİ eksik harf
//    (Breking) bu yöntemle kurtarılamaz — bilinen sınır.
// 3) DİL BAŞINA FARKLI KÜME: "Umut" tr-TR'de Yeni Umut/Son Umut, en-US'ta Hope
//    getirir. Tek dille arama gerçekten kayıp verir → iki dil birleştirilir.
//
// TMDB'nin kendi sıralaması popülerliğe dayalıdır ve tam eşleşmeyi gömebilir
// ("interstelar" → önce "Interstellar Wars"). Bu yüzden istemcide yeniden sıralanır.

// Türkçe-duyarsız normalize: aksan, büyük/küçük ve noktalama farkını siler.
// 'ı' NFD ile ayrışmadığından ayrıca eşlenir; 'ş/ğ/ç/ö/ü' NFD ile çözülür.
export function normalizeTitle(s) {
  return (s || '')
    .replace(/[İI]/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Kesme i\u015fareti BO\u015eLU\u011eA de\u011fil, hi\u00e7li\u011fe e\u015flenir: T\u00fcrk\u00e7e ba\u015fl\u0131klarda s\u0131k
    // ge\u00e7er ("Bir Zamanlar Anadolu'da") ve kullan\u0131c\u0131 onsuz yazar. Bo\u015flu\u011fa
    // \u00e7evrilirse "anadolu da" ile "anadoluda" e\u015fle\u015fmez.
    .replace(/['\u2019`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Bir sonucun sorguya ne kadar uyduğu. Yüksek = daha alakalı.
// Hem yerelleştirilmiş hem orijinal ad denenir; kullanıcı ikisinden birini yazmış olabilir.
export function relevanceScore(item, query) {
  const q = normalizeTitle(query)
  if (!q) return 0

  const cands = [normalizeTitle(item.title), normalizeTitle(item.originalTitle)].filter(Boolean)
  let best = 0

  for (const c of cands) {
    if (!c) continue
    if (c === q)                       best = Math.max(best, 100)
    else if (c.startsWith(q))          best = Math.max(best, 80)
    else if (c.includes(q))            best = Math.max(best, 60)
    else {
      // Kelime bazlı örtüşme — "yuzuklerin efendisi kule" gibi eksik/karışık sıralı
      // sorgular tamamen elenmesin.
      const qw = q.split(' ').filter(Boolean)
      const cw = new Set(c.split(' ').filter(Boolean))
      if (qw.length > 0) {
        const hit = qw.filter(w => cw.has(w)).length
        if (hit > 0) best = Math.max(best, Math.round((hit / qw.length) * 45))
      }
    }
  }
  return best
}

// İki dilden gelen ham TMDB sonuçlarını tekilleştirip kart-önizleme biçimine çevirir.
// Aynı yapım iki dilde de dönerse tr-TR kaydı gösterim adı olarak tercih edilir
// (uygulamanın dili Türkçe), orijinal ad her hâlükârda korunur.
export function mergeSearchResults(trResults = [], enResults = []) {
  const byKey = new Map()

  const add = (r, preferred) => {
    if (r.media_type !== 'movie' && r.media_type !== 'tv') return
    const key = `${r.media_type}:${r.id}`
    const isMovie = r.media_type === 'movie'
    const mapped = {
      id: r.id,
      mediaType: r.media_type,
      title: isMovie ? r.title : r.name,
      originalTitle: isMovie ? r.original_title : r.original_name,
      year: ((isMovie ? r.release_date : r.first_air_date) || '').slice(0, 4),
      posterPath: r.poster_path,
      popularity: r.popularity || 0,
    }
    const prev = byKey.get(key)
    if (!prev) byKey.set(key, mapped)
    else if (preferred) byKey.set(key, { ...prev, title: mapped.title })
  }

  enResults.forEach(r => add(r, false))
  trResults.forEach(r => add(r, true))
  return [...byKey.values()]
}

// Alaka → popülerlik sırasıyla diz. TMDB'nin salt popülerlik sıralaması tam
// eşleşmeyi gömdüğü için gereklidir.
export function rankSearchResults(items, query) {
  return [...(items || [])]
    .map(it => ({ it, rel: relevanceScore(it, query) }))
    .sort((a, b) => b.rel - a.rel || (b.it.popularity || 0) - (a.it.popularity || 0))
    .map(x => x.it)
}

// Sıfır sonuç durumunda denenecek kısaltılmış sorgular.
// Sondaki hatalı/fazla harfleri kurtarır ("Inceptionn" → "Inceptio" → Başlangıç).
// En fazla 2 deneme; 4 harften kısaya inilmez (çok genel sonuç üretir).
export function typoVariants(query) {
  const q = (query || '').trim()
  if (q.length < 6) return []
  const out = []
  for (const ratio of [0.85, 0.7]) {
    const len = Math.max(4, Math.floor(q.length * ratio))
    const cut = q.slice(0, len).trim()
    if (cut.length >= 4 && cut !== q && !out.includes(cut)) out.push(cut)
  }
  return out
}

// Gösterimde orijinal adı ayrıca göstermeli miyiz?
// Yalnız anlamlı biçimde farklıysa — "Parasite"/"Parazit" evet, aksan farkı hayır.
export function shouldShowOriginal(title, originalTitle) {
  if (!originalTitle || !title) return false
  return normalizeTitle(title) !== normalizeTitle(originalTitle)
}
