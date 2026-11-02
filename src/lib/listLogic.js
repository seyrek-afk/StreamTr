// ── Liste mantığı: animasyon tercihi ve sıralama ─────────────────────────────
//
// Saf yardımcılar (ağ yok, React yok). Izgara, raflar, vitrin ve öneriler aynı
// kuralı paylaşsın diye animasyon tespiti tek yerde yaşar; sıralama da App'ten
// buraya taşındı ki testler elle kopyayı değil gerçek kodu sınasın.

export const ANIMATION_GENRE_LABEL = 'Animasyon'
export const ANIMATION_GENRE_ID = 16
export const ANIMATION_PREF_KEY = 'streamtr-animasyon'

const ANIMATION_NORMALIZED = ANIMATION_GENRE_LABEL.toLocaleLowerCase('tr-TR')

export function isAnimation(item) {
  const genres = item?.genres
  if (!Array.isArray(genres) || genres.length === 0) return false
  return genres.some(g =>
    typeof g === 'string' && g.trim().toLocaleLowerCase('tr-TR') === ANIMATION_NORMALIZED)
}

export function withoutAnimation(items) {
  return (items || []).filter(item => !isAnimation(item))
}

export function readShowAnimation() {
  try {
    return localStorage.getItem(ANIMATION_PREF_KEY) === '1'
  } catch {
    return false
  }
}

export function saveShowAnimation(show) {
  try {
    localStorage.setItem(ANIMATION_PREF_KEY, show ? '1' : '0')
    return true
  } catch {
    return false
  }
}

// ── Sıralama ────────────────────────────────────────────────────────────────
export function effectiveSort(sortBy, tab) {
  return (sortBy === 'social' && tab !== 'trend') ? 'default' : sortBy
}

const byImdb = (a, b) => (b.imdbScore || 0) - (a.imdbScore || 0)
const scoreOf = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

// Puansız yapım her zaman sona: 0 sayılsa RT'de 20'lik bir yapımın altına
// düşer ama Letterboxd'da (0-5) puanlıların arasına karışırdı.
export function compareByScoreField(field) {
  return (a, b) => {
    const av = scoreOf(a[field])
    const bv = scoreOf(b[field])
    if (av === null && bv === null) return byImdb(a, b)
    if (av === null) return 1
    if (bv === null) return -1
    return (bv - av) || byImdb(a, b)
  }
}

const SCORE_FIELDS = { rt: 'rottenTomatoesScore', lb: 'letterboxdScore' }

export function makeComparator(sortBy, { tab, country } = {}) {
  if (sortBy === 'imdb') return byImdb
  if (sortBy === 'year') return (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0)
  if (sortBy === 'social') return (a, b) => (b.socialScore || 0) - (a.socialScore || 0)
  if (SCORE_FIELDS[sortBy]) return compareByScoreField(SCORE_FIELDS[sortBy])
  if (tab === 'trend') return (a, b) => (b.socialScore || 0) - (a.socialScore || 0)
  // Ülke merceğinde ham IMDB sıralaması güvenilmez: düşük oy sayısı yüzünden
  // 3 oyla 10/10 alan yapım tepeye çıkar. Bayesian ağırlıklı puan kullanılır.
  if (country) {
    return (a, b) =>
      (b._weightedScore || 0) - (a._weightedScore || 0) ||
      (b._voteCount     || 0) - (a._voteCount     || 0)
  }
  return byImdb
}

export function sortItems(items, { sortBy = 'default', tab, country } = {}) {
  return [...(items || [])].sort(makeComparator(effectiveSort(sortBy, tab), { tab, country }))
}
