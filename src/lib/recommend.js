// ── Öneri motoru: puanlama, kalibrasyon ve çeşitlilik ─────────────────────────
//
// Önceki motor TMDB'nin her tohum için döndürdüğü "recommendations" listelerini
// SIKLIKLA topluyordu. Gerçek bir favori listesinde (2026-10) bu üç ayrı hataya
// yol açtı:
//
//   1. SERİ BASKINLIĞI — 4 Yüzüklerin Efendisi + 3 Hobbit + çift kayıtlar,
//      Bayıldım ağırlığıyla ~18 oy veriyordu; Breaking Bad + Ozark ancak ~4.
//      Sonuç: listenin çoğu ikinci sınıf fantastik/animasyon yapımlar.
//      → Tohumlar önerilerinin örtüşmesine göre KÜMELENİR; bir küme kaç
//        üyesi olursa olsun logaritmik ağırlık taşır (bkz. clusterSeeds).
//   2. KALİTE TABANI YOK — 6.0–6.6 puanlı, birkaç yüz oylu devam filmleri
//      (Ejder Yürek 3–4, Kılıcın Gücü) sırf sık geçtikleri için üste çıkıyordu.
//      → Oy sayısı bilinen yapımlar için taban + Bayesian kalite puanı.
//   3. ZEVK PROFİLİ YOK SAYILIYOR — favorilerde tek bir animasyon yokken
//      animasyon öneriliyordu (TMDB'nin komşuluğu türden habersizdir).
//      → Favorilerden tür profili çıkar; profilde yeri olmayan "kitle" türleri
//        (animasyon, çocuk, pembe dizi…) elenir, aile yumuşakça bastırılır.
//
// Bu dosya saf fonksiyonlardan oluşur (ağ yok); getirme useRecommendations'ta.

import { GENRES } from './genres.js'

export const MAX_RESULTS = 20

// ── Tür etiketleri → kanonik anahtar ───────────────────────────────────────────
// Kayıtlar Türkçe ETİKET taşır (TMDB eşlemesinden ya da mock veriden). TMDB'nin
// dizi birleşik türleri ("Aksiyon & Macera") iki anahtara açılır; profil film
// ve diziyi aynı dilde saymalı.
const LABEL_KEYS = {
  'aksiyon': ['aksiyon'], 'macera': ['macera'], 'animasyon': ['animasyon'],
  'komedi': ['komedi'], 'suç': ['suc'], 'belgesel': ['belgesel'], 'dram': ['dram'],
  'aile': ['aile'], 'fantezi': ['fantastik'], 'fantastik': ['fantastik'],
  'tarih': ['tarih'], 'korku': ['korku'], 'müzik': ['muzik'], 'gizem': ['gizem'],
  'romantik': ['romantik'], 'bilim kurgu': ['bilimkurgu'], 'gerilim': ['gerilim'],
  'savaş': ['savas'], 'western': ['western'],
  'aksiyon & macera': ['aksiyon', 'macera'],
  'bilim kurgu & fantezi': ['bilimkurgu', 'fantastik'],
  'savaş & politika': ['savas'],
  // TMDB'de var, GENRES sözlüğünde yok: yalnız eleme için tanınırlar.
  'çocuk': ['cocuk'], 'pembe dizi': ['pembedizi'], 'talk show': ['talkshow'],
  'gerçeklik': ['gerceklik'], 'haber': ['haber'],
}

export function genreKeysOf(labels) {
  const out = new Set()
  for (const l of labels || []) {
    for (const k of LABEL_KEYS[String(l).toLocaleLowerCase('tr-TR').trim()] || []) out.add(k)
  }
  return [...out]
}

// Kitle türleri: profilde payı EŞİK altındaysa aday elenir. Bunlar "zevk"
// değil "hedef kitle" türleridir; bir dram sevenin dramla komşu diye çocuk
// animasyonu görmesi alakasızdır.
const AUDIENCE_GENRES = ['animasyon', 'cocuk', 'pembedizi', 'talkshow', 'gerceklik', 'haber']
// Aile: Narnia gibi geniş kitleli macera filmlerini de kapsar, elemek fazla
// sert olur — profilde yoksa yalnız puanı kırpılır.
const SOFT_GENRES = ['aile']
export const AUDIENCE_MIN_SHARE = 0.08
const SOFT_PENALTY = 0.6

// ── Zevk profili ───────────────────────────────────────────────────────────────
// Her tür için ağırlıklı pay (toplamı 1). Bir yapımın birden çok türü varsa
// ağırlığı türlerine bölünür: dört türlü bir film tek türlü bir dizinin dört
// katı oy kullanmasın.
export function genreProfile(seeds) {
  const raw = {}
  let total = 0
  for (const s of seeds) {
    const keys = genreKeysOf(s.genres)
    if (!keys.length) continue
    const w = (s._w || 1) / keys.length
    for (const k of keys) { raw[k] = (raw[k] || 0) + w; total += w }
  }
  const profile = {}
  for (const k of Object.keys(raw)) profile[k] = raw[k] / total
  return profile
}

export function excludedGenres(profile) {
  return new Set(AUDIENCE_GENRES.filter(g => (profile[g] || 0) < AUDIENCE_MIN_SHARE))
}

// Dram neredeyse her yapımda geçer: profilde hep tepededir ama zevk hakkında
// az şey söyler. Tek başına "dram" olan bir aday tam uyum almamalı (yoksa suç
// ve bilim kurgu seven birine Grey's Anatomy önerilir), keşif de dramla
// sorgulanmamalı.
const BROAD_GENRES = new Set(['dram'])

// En güçlü AYIRT EDİCİ türler (keşif sorgusu ve gerekçe metni için).
export function topGenres(profile, n = 2) {
  return Object.entries(profile)
    .filter(([k]) => GENRES[k] && !BROAD_GENRES.has(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
}

// 0–1: adayın türleri kullanıcının profiline ne kadar uyuyor.
export function genreAffinity(genreLabels, profile) {
  const all = genreKeysOf(genreLabels)
  const keys = all.filter(k => !BROAD_GENRES.has(k))
  const shares = Object.entries(profile).filter(([k]) => !BROAD_GENRES.has(k)).map(([, v]) => v)
  if (!keys.length || !shares.length) return 0.5 // bilgi yok ya da yalnız dram: nötr
  const max = Math.max(...shares)
  const mean = keys.reduce((s, k) => s + (profile[k] || 0), 0) / keys.length
  let aff = Math.min(1, mean / max)
  if (SOFT_GENRES.some(g => all.includes(g) && (profile[g] || 0) < AUDIENCE_MIN_SHARE)) {
    aff *= SOFT_PENALTY
  }
  return aff
}

// ── Kalite ─────────────────────────────────────────────────────────────────────
// TMDB recommendations ucu oy sayısı da döner. Bilinmiyorsa (eski önbellek,
// test verisi) taban uygulanmaz — eksik veri yüzünden öneri kaybolmasın.
export const MIN_VOTE_AVG = 6.5
export const MIN_VOTES = { movie: 150, tv: 50 }
const BAYES_M = 300
const BAYES_C = 6.5

export function passesQualityFloor(card) {
  const n = card._voteCount
  if (typeof n !== 'number') return true
  return n >= (MIN_VOTES[card._mediaType] ?? 100) && (card._voteAvg || 0) >= MIN_VOTE_AVG
}

// 0–1. Az oylu yüksek puan ortalamaya çekilir (IMDB ağırlıklı puanı biçimi).
export function qualityScore(card) {
  const r = card._voteAvg || 0
  if (!r) return 0
  const v = typeof card._voteCount === 'number' ? card._voteCount : BAYES_M
  const wr = (v * r + BAYES_M * BAYES_C) / (v + BAYES_M)
  return Math.max(0, Math.min(1, (wr - 6) / 2.5))
}

// ── Tohum kümeleme ─────────────────────────────────────────────────────────────
// Aynı serinin filmleri (ya da çok yakın akrabalar) TMDB'de neredeyse aynı
// öneri listesini döndürür. Örtüşmesi eşiği aşan tohumlar tek kümede toplanır;
// küme ağırlığı = en güçlü üyesi × (1 + ½·log2(üye sayısı)). Dokuz üyeli bir
// Orta Dünya kümesi 18 değil ~5 oy kullanır, ama tek bir filmden yine güçlüdür:
// çok sevilen bir dünya hâlâ sinyaldir, yalnız tekel değildir.
export const OVERLAP_THRESHOLD = 0.25

function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

// seeds: [{ id, w, title, recKeys: [anahtar, …] (TMDB sırasıyla) }]
export function clusterSeeds(seeds) {
  const parent = seeds.map((_, i) => i)
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const sets = seeds.map(s => new Set(s.recKeys))
  for (let i = 0; i < seeds.length; i++) {
    for (let j = i + 1; j < seeds.length; j++) {
      if (jaccard(sets[i], sets[j]) >= OVERLAP_THRESHOLD) parent[find(i)] = find(j)
    }
  }
  const groups = new Map()
  seeds.forEach((s, i) => {
    const r = find(i)
    if (!groups.has(r)) groups.set(r, [])
    groups.get(r).push(s)
  })
  return [...groups.values()].map((members, idx) => ({
    id: idx,
    members,
    weight: Math.max(...members.map(m => m.w)) * (1 + 0.5 * Math.log2(members.length)),
  }))
}

// Profil de aynı kümelemeden geçer: dokuz Orta Dünya filmi profili de
// "fantastik"e kilitlemesin. Kümenin ağırlığı üyelerine bölünür.
export function seedProfile(seeds) {
  return genreProfile(
    clusterSeeds(seeds).flatMap(c =>
      c.members.map(m => ({ genres: m.genres, _w: c.weight / c.members.length }))
    )
  )
}

// Listedeki sıra önemlidir: TMDB ilk sıraya en yakın yapımı koyar.
const rankDecay = r => 1 / (1 + r / 5)

// ── Birleştirme ────────────────────────────────────────────────────────────────
const W_COLLAB = 0.5
const W_GENRE  = 0.25
const W_QUAL   = 0.25

// Aynı kümeden ya da aynı türden en fazla bu kadar öneri: liste tek bir
// damardan beslenmesin. Yeterli aday yoksa sınır gevşer (bkz. diversify).
// Tür sınırı bir yapımın TÜM türlerine işler (yalnız ilkine değil — "Suç/Dram"
// ile "Dram/Suç" aynı damardır). Dram sayılmaz: neredeyse her şeyde var,
// sayılsa sınır anlamsızca erken dolardı.
export const MAX_PER_CLUSTER = 5
export const MAX_PER_GENRE   = 7
const UNCAPPED_GENRES = new Set(['dram'])

export function normTitle(s) {
  return String(s || '').toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, '')
}

// Başlık + yıl: yalnız başlık yetmez — izleme listesindeki "Carrie (2026)"
// 1976 yapımı Carrie'yi elememeli.
export function titleKeys(item) {
  const y = String(item?.year || '').slice(0, 4)
  return [item?.title, item?.originalTitle]
    .map(normTitle).filter(Boolean).map(t => `${t}|${y}`)
}

function joinTitles(titles) {
  return titles.length > 1 ? `${titles[0]}, ${titles[1]}` : titles[0]
}

// seeds     : clusterSeeds'e girecek, öneri listeleri getirilmiş tohumlar
// cardsByKey: anahtar → kart (tmdbToRecCard çıktısı)
// discovered: türe göre keşiften gelen kartlar (işbirlikçi sinyali yok)
// opts      : { profile, excludeKeys:Set, excludeTitles:Set }
export function rankRecommendations({ seeds, cardsByKey, discovered = [], profile, excludeKeys, excludeTitles }) {
  const banned = excludedGenres(profile)
  const isExcluded = card => {
    if (excludeKeys.has(card.key)) return true
    if (titleKeys(card).some(k => excludeTitles.has(k))) return true
    if (genreKeysOf(card.genres).some(g => banned.has(g))) return true
    return !passesQualityFloor(card)
  }

  // 1) İşbirlikçi puan: her küme bir aday için EN İYİ üyesinin sırasıyla katkı
  //    verir (üyeler toplanmaz — toplanırsa kümelemenin anlamı kalmaz).
  const clusters = clusterSeeds(seeds)
  const acc = new Map() // anahtar → { collab, best: {clusterId, contrib, title} , byCluster }
  for (const c of clusters) {
    const bestRank = new Map() // anahtar → { r, title }
    for (const m of c.members) {
      m.recKeys.forEach((k, r) => {
        const prev = bestRank.get(k)
        if (!prev || r < prev.r) bestRank.set(k, { r, title: m.title })
      })
    }
    for (const [k, { r, title }] of bestRank) {
      const contrib = c.weight * rankDecay(r)
      const e = acc.get(k) || { collab: 0, sources: [] }
      e.collab += contrib
      e.sources.push({ clusterId: c.id, contrib, title })
      acc.set(k, e)
    }
  }
  const maxCollab = Math.max(1e-9, ...[...acc.values()].map(e => e.collab))

  const scored = []
  for (const [k, e] of acc) {
    const card = cardsByKey.get(k)
    if (!card || isExcluded(card)) continue
    const sources = e.sources.sort((a, b) => b.contrib - a.contrib)
    const titles = [...new Set(sources.map(s => s.title).filter(Boolean))]
    scored.push({
      card: { ...card, _reason: titles.length ? `Beğendiğin: ${joinTitles(titles)}` : undefined },
      cluster: sources[0].clusterId,
      score: W_COLLAB * (e.collab / maxCollab) +
             W_GENRE * genreAffinity(card.genres, profile) +
             W_QUAL * qualityScore(card),
    })
  }

  // 2) Keşif adayları: komşulukta görünmeyen ama profile ve kaliteye uyan
  //    yapımlar. İşbirlikçi payı sıfır olduğu için ancak boşlukları doldururlar.
  const seen = new Set(scored.map(s => s.card.key))
  const genreReason = topGenres(profile).map(g => GENRES[g].label)
  for (const card of discovered) {
    if (seen.has(card.key) || isExcluded(card)) continue
    seen.add(card.key)
    scored.push({
      card: { ...card, _reason: genreReason.length ? `Sevdiğin türlerden: ${genreReason.join(', ')}` : undefined },
      cluster: 'kesif',
      score: W_GENRE * genreAffinity(card.genres, profile) + W_QUAL * qualityScore(card),
    })
  }

  scored.sort((a, b) => b.score - a.score || (b.card._voteAvg || 0) - (a.card._voteAvg || 0))
  return diversify(scored).map(s => s.card)
}

// Açgözlü seçim + sınırlar. İlk geçişte sınırı aşanlar bekletilir; liste
// dolmazsa sırayla eklenir — çeşitlilik bir tercih, eksik liste bir hata.
export function diversify(scored, max = MAX_RESULTS) {
  const picked = []
  const waiting = []
  const perCluster = new Map()
  const perGenre = new Map()
  for (const s of scored) {
    if (picked.length >= max) break
    const gs = genreKeysOf(s.card.genres).filter(g => !UNCAPPED_GENRES.has(g))
    const nc = perCluster.get(s.cluster) || 0
    if (nc >= MAX_PER_CLUSTER || gs.some(g => (perGenre.get(g) || 0) >= MAX_PER_GENRE)) {
      waiting.push(s)
      continue
    }
    picked.push(s)
    perCluster.set(s.cluster, nc + 1)
    gs.forEach(g => perGenre.set(g, (perGenre.get(g) || 0) + 1))
  }
  for (const s of waiting) {
    if (picked.length >= max) break
    picked.push(s)
  }
  return picked
}
