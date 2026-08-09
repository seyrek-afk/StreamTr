// ── TMDB ham sonuç → StreamTR kart şeması ────────────────────────────────────
// Bu eşleyiciler useStreamData (ızgara) ve useYerliRails (raflar) tarafından
// ORTAK kullanılır. Kart şeması tek yerde tanımlı olmalı: ContentCard'ın açtığı
// tüm zengin bölümler (oyuncular, yorumlar, platformlar) aynı alanlara dayanır,
// iki ayrı kopya zamanla birbirinden kayar.

import { weightedScore } from './discover.js'

// ── Tür ID → Türkçe ──────────────────────────────────────────────────────────
export const GENRE_MAP = {
  28: 'Aksiyon',  12: 'Macera',    16: 'Animasyon', 35: 'Komedi',      80: 'Suç',
  99: 'Belgesel', 18: 'Dram',      10751: 'Aile',   14: 'Fantezi',     36: 'Tarih',
  27: 'Korku',    10402: 'Müzik',  9648: 'Gizem',   10749: 'Romantik', 878: 'Bilim Kurgu',
  53: 'Gerilim',  10752: 'Savaş',  37: 'Western',
  10759: 'Aksiyon & Macera', 10762: 'Çocuk',   10763: 'Haber',
  10764: 'Gerçeklik',        10765: 'Bilim Kurgu & Fantezi',
  10766: 'Pembe Dizi',       10767: 'Talk Show', 10768: 'Savaş & Politika',
}

// ── Sayı formatla ────────────────────────────────────────────────────────────
// Platform rozetinin mürekkebi — markanın renginin parlaklığına göre siyah ya
// da beyaz. Hepsine beyaz vermek Prime'ın siyanında (#00A8E0) 2.7:1'e düşüyordu;
// logotip olsa da okunmuyordu. WCAG'ın göreli parlaklık formülü, eşik 0.42
// (bu eşikte her iki yön de ≥4.5:1 kalıyor).
export function badgeInk(hex) {
  const h = String(hex || '').replace('#', '')
  if (h.length !== 6) return '#ffffff'
  const lin = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
  return L > 0.18 ? '#101014' : '#ffffff'
}

export function fmtCount(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

// ── Skor tahmin yardımcıları ─────────────────────────────────────────────────
export function estimateRT(avg) {
  if (!avg) return null
  return Math.min(99, Math.max(20, Math.round(avg * 9.8 + 1)))
}
export function estimateLB(avg) {
  if (!avg) return null
  return Number((avg * 0.47 + 0.08).toFixed(2))
}

// ── Neden trend? → otomatik oluştur ──────────────────────────────────────────
export function buildTrendReason(item, rank, isMovie, now = Date.now()) {
  const dateStr = isMovie ? item.release_date : item.first_air_date
  const parts   = []

  if (dateStr) {
    const days = (now - new Date(dateStr)) / 86_400_000
    if (days < 7)        parts.push('Bu hafta yayınlandı')
    else if (days < 30)  parts.push('Bu ay çıktı')
    else if (days < 90)  parts.push('Son 3 ayın gözde yapımı')
  }

  if      (rank <= 3)  parts.push('TMDB haftalık trendin zirvesi')
  else if (rank <= 10) parts.push('Bu haftanın top 10 yapımı')
  else if (rank <= 25) parts.push('Bu hafta yoğun ilgi gören yapım')

  if (item.vote_count  > 5_000) parts.push(`${fmtCount(item.vote_count)} oy topladı`)
  if (item.popularity  > 1_000) parts.push('Sosyal medyada viral')
  else if (item.popularity > 300) parts.push('Geniş kitlelere ulaştı')

  return parts.slice(0, 3).join(' · ') || `TMDB bu hafta #${rank} trend`
}

// ── TMDB trend öğesi → kart ──────────────────────────────────────────────────
export function tmdbToTrendCard(item, rank) {
  const isMovie = item.media_type === 'movie'

  const rankScore      = Math.max(0, Math.round(100 - (rank - 1) * 1.2))
  const voteScore      = Math.round((item.vote_average || 0) * 10)
  const voteCountScore = Math.min(100, Math.round(Math.log10(Math.max(1, item.vote_count || 1)) * 28))
  const popScore       = Math.min(100, Math.round(Math.log10(Math.max(1, item.popularity || 1)) * 35))

  const socialScore = Math.round(
    rankScore      * 0.40 +
    voteScore      * 0.30 +
    popScore       * 0.20 +
    voteCountScore * 0.10
  )

  const dateStr   = isMovie ? item.release_date : item.first_air_date
  const daysOld   = dateStr ? (Date.now() - new Date(dateStr)) / 86_400_000 : 9999
  const isNew     = daysOld < 60   // son 2 ay

  return {
    title:         isMovie ? item.title : item.name,
    originalTitle: isMovie ? item.original_title : item.original_name,
    type:          isMovie ? 'film' : 'dizi',
    year:          dateStr?.slice(0, 4),
    imdbScore:     item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
    rottenTomatoesScore: estimateRT(item.vote_average),
    letterboxdScore: estimateLB(item.vote_average),
    genres:        (item.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean),
    platforms:     [],
    posterPath:    item.poster_path,
    description:   item.overview || '',
    cast:          [],
    reviews:       [],
    duration:      null,

    // trend-specific
    socialScore,
    trendRank:     rank,
    trendReason:   buildTrendReason(item, rank, isMovie),
    isNewRelease:  isNew,
    releaseDate:   dateStr,
    _tmdbId:       item.id,
    _mediaType:    item.media_type,
    _voteCount:     item.vote_count || 0,
    _weightedScore: weightedScore(item.vote_average, item.vote_count, item.media_type),

    // Kriterlerin `icon` alanı kaldırıldı: emoji ikonlar arayüzden çıkarıldı
    // (her OS'ta farklı çizilirler). Kriter satırı artık etiket + değer + skor
    // ile okunuyor; ikon zaten bilgi taşımıyordu.
    popularityCriteria: [
      {
        label: 'Haftalık Sıra',
        value: `#${rank}`,
        source: 'TMDB Haftalık Trend',
        score: rankScore,
      },
      {
        label: 'Ortalama Puan',
        value: `${(item.vote_average || 0).toFixed(1)} / 10`,
        source: 'TMDB Kullanıcı Oyları',
        score: voteScore,
      },
      {
        label: 'Toplam Oy',
        value: fmtCount(item.vote_count),
        source: 'TMDB',
        score: voteCountScore,
      },
      {
        label: 'Popülerlik Endeksi',
        value: item.popularity ? item.popularity.toFixed(0) : '—',
        source: 'TMDB Algoritması',
        score: popScore,
      },
    ],
  }
}

// ── TMDB liste/discover öğesi → kart ─────────────────────────────────────────
// country: ülke kodu (ör. 'TR', 'KR') — verilirse kartta köken etiketi gösterilir.
// poolC:   havuz ortalaması; ağırlıklı puanı besler. Ülke havuzları birbirinden
//          farklı olduğu için (TR dizi 7.61 / film 6.25) çağıran taraf yüklenen
//          kümenin gerçek ortalamasını geçer, yoksa yedek sabit kullanılır.
export function tmdbToListCard(item, mediaType, country = null, poolC = null) {
  const isMovie = mediaType === 'movie'
  const voteAvg = item.vote_average || 0
  const dateStr = isMovie ? item.release_date : item.first_air_date
  return {
    title:         isMovie ? item.title : item.name,
    originalTitle: isMovie ? item.original_title : item.original_name,
    type:          isMovie ? 'film' : 'dizi',
    year:          dateStr?.slice(0, 4),
    imdbScore:     voteAvg ? Number(voteAvg.toFixed(1)) : null,
    rottenTomatoesScore: estimateRT(voteAvg),
    letterboxdScore: estimateLB(voteAvg),
    genres:        (item.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean),
    platforms:     [],
    posterPath:    item.poster_path,
    description:   item.overview || '',
    cast:          [],
    reviews:       [],
    duration:      null,
    _tmdbId:        item.id,
    _mediaType:     mediaType,
    _voteCount:     item.vote_count || 0,
    _weightedScore: weightedScore(voteAvg, item.vote_count, mediaType, poolC),
    originCountry:  country || null,
  }
}
