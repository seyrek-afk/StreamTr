export const GENRES = [
  "Aksiyon", "Dram", "Komedi", "Bilim Kurgu", "Gerilim",
  "Suç", "Belgesel", "Animasyon", "Fantezi", "Korku",
  "Romantik", "Tarih",
]

export const PLATFORMS = [
  { id: "Netflix",       label: "Netflix",      color: "#E50914", badge: "N"  },
  { id: "Amazon Prime",  label: "Prime Video",  color: "#00A8E0", badge: "P"  },
  { id: "Disney+",       label: "Disney+",      color: "#1A4BD4", badge: "D+" },
  { id: "Apple TV+",     label: "Apple TV+",    color: "#555555", badge: "▶"  },
]

export const POSTER_GRADIENTS = [
  ["#1a1a2e","#E50914"], ["#0f3460","#533483"], ["#1b262c","#0f4c75"],
  ["#2d132c","#c72c41"], ["#12100e","#b8860b"], ["#0a1628","#1e4f8f"],
  ["#1a0a1e","#6a0dad"], ["#0d1b2a","#1b6b4b"], ["#2c1a0e","#b85c1a"],
]

export const TABS = [
  { id: "diziler", emoji: "📺", label: "En İyi Diziler"  },
  { id: "filmler", emoji: "🎬", label: "En İyi Filmler"  },
  { id: "trend",   emoji: "🔥", label: "Sosyal Trend"    },
]

// ── Tema Sistemi ──────────────────────────────────────────────────────────────
export const THEMES = [
  {
    id: 'cinema',
    label: 'Sinema Karanlığı',
    emoji: '🎬',
    desc: 'Derin koyu, altın tonlu film atmosferi',
    preview: ['#070710', '#F5C518', '#FF4B2B'],
    css: {
      '--bg':              '#070710',
      '--bg-card':         '#111120',
      '--bg-card-trend':   'rgba(22,8,8,0.97)',
      '--bg-header':       'rgba(7,7,16,0.97)',
      '--accent':          '#F5C518',
      '--accent2':         '#FF4B2B',
      '--accent-rgb':      '245,197,24',
      '--border':          'rgba(255,255,255,0.065)',
      '--border-trend':    'rgba(245,100,0,0.18)',
      '--text':            '#ffffff',
      '--text-muted':      'rgba(255,255,255,0.62)',
      '--text-faint':      'rgba(255,255,255,0.28)',
      '--tab-active':      '#F5C518',
      '--hover-border':    'rgba(245,197,24,0.35)',
      '--trend-bar':       'linear-gradient(90deg,#F5C518,#E50914)',
      '--logo-grad':       'linear-gradient(120deg,#F5C518 0%,#FF4B2B 100%)',
      '--card-backdrop':   'none',
    }
  },
  {
    id: 'netflix',
    label: 'Netflix',
    emoji: '▶',
    desc: 'Kırmızı-siyah, streaming klasiği',
    preview: ['#141414', '#E50914', '#ff6b6b'],
    css: {
      '--bg':              '#141414',
      '--bg-card':         '#1e1e1e',
      '--bg-card-trend':   'rgba(28,4,4,0.97)',
      '--bg-header':       'rgba(20,20,20,0.97)',
      '--accent':          '#E50914',
      '--accent2':         '#ff6b6b',
      '--accent-rgb':      '229,9,20',
      '--border':          'rgba(255,255,255,0.08)',
      '--border-trend':    'rgba(229,9,20,0.25)',
      '--text':            '#ffffff',
      '--text-muted':      'rgba(255,255,255,0.68)',
      '--text-faint':      'rgba(255,255,255,0.32)',
      '--tab-active':      '#E50914',
      '--hover-border':    'rgba(229,9,20,0.45)',
      '--trend-bar':       'linear-gradient(90deg,#E50914,#ff6b6b)',
      '--logo-grad':       'linear-gradient(120deg,#E50914 0%,#ff9900 100%)',
      '--card-backdrop':   'none',
    }
  },
  {
    id: 'glass',
    label: 'Cam Efekti',
    emoji: '💎',
    desc: 'Glassmorphism, mor & mavi tonal',
    preview: ['#0a0a1a', '#c678dd', '#e056fd'],
    css: {
      '--bg':              '#0a0a1a',
      '--bg-card':         'rgba(255,255,255,0.06)',
      '--bg-card-trend':   'rgba(155,89,182,0.1)',
      '--bg-header':       'rgba(10,10,26,0.75)',
      '--accent':          '#c678dd',
      '--accent2':         '#e056fd',
      '--accent-rgb':      '198,120,221',
      '--border':          'rgba(255,255,255,0.12)',
      '--border-trend':    'rgba(198,120,221,0.3)',
      '--text':            '#ffffff',
      '--text-muted':      'rgba(255,255,255,0.72)',
      '--text-faint':      'rgba(255,255,255,0.38)',
      '--tab-active':      '#c678dd',
      '--hover-border':    'rgba(198,120,221,0.5)',
      '--trend-bar':       'linear-gradient(90deg,#9b59b6,#e056fd)',
      '--logo-grad':       'linear-gradient(120deg,#9b59b6 0%,#e056fd 100%)',
      '--card-backdrop':   'blur(12px)',
    }
  },
  {
    id: 'ocean',
    label: 'Gece Okyanusu',
    emoji: '🌊',
    desc: 'Derin mavi, siyan enerji',
    preview: ['#04091a', '#00A8E0', '#0effc2'],
    css: {
      '--bg':              '#04091a',
      '--bg-card':         '#081428',
      '--bg-card-trend':   'rgba(0,15,35,0.97)',
      '--bg-header':       'rgba(4,9,26,0.97)',
      '--accent':          '#00A8E0',
      '--accent2':         '#0effc2',
      '--accent-rgb':      '0,168,224',
      '--border':          'rgba(0,168,224,0.12)',
      '--border-trend':    'rgba(0,168,224,0.22)',
      '--text':            '#e8f8ff',
      '--text-muted':      'rgba(232,248,255,0.65)',
      '--text-faint':      'rgba(232,248,255,0.3)',
      '--tab-active':      '#00A8E0',
      '--hover-border':    'rgba(0,168,224,0.45)',
      '--trend-bar':       'linear-gradient(90deg,#00A8E0,#0effc2)',
      '--logo-grad':       'linear-gradient(120deg,#00A8E0 0%,#0effc2 100%)',
      '--card-backdrop':   'none',
    }
  },
  {
    id: 'neon',
    label: 'Neon Siber',
    emoji: '⚡',
    desc: 'Karanlık zemin, neon yeşil & siyan',
    preview: ['#050508', '#00ff9d', '#00c8ff'],
    css: {
      '--bg':              '#050508',
      '--bg-card':         '#0a0f0a',
      '--bg-card-trend':   'rgba(0,18,6,0.97)',
      '--bg-header':       'rgba(5,5,8,0.97)',
      '--accent':          '#00ff9d',
      '--accent2':         '#00c8ff',
      '--accent-rgb':      '0,255,157',
      '--border':          'rgba(0,255,157,0.09)',
      '--border-trend':    'rgba(0,255,157,0.22)',
      '--text':            '#e8ffe8',
      '--text-muted':      'rgba(232,255,232,0.65)',
      '--text-faint':      'rgba(232,255,232,0.28)',
      '--tab-active':      '#00ff9d',
      '--hover-border':    'rgba(0,255,157,0.45)',
      '--trend-bar':       'linear-gradient(90deg,#00ff9d,#00c8ff)',
      '--logo-grad':       'linear-gradient(120deg,#00ff9d 0%,#00c8ff 100%)',
      '--card-backdrop':   'none',
    }
  },
]

export const DEFAULT_THEME_ID = 'cinema'

// ── API Prompts (işlev tabanlı — dışlama desteği ile) ─────────────────────────
const CAST_REVIEWS_SCHEMA = `"cast":[{"name":"string","character":"string","profilePath":"/path.jpg or null"}],"reviews":[{"source":"IMDB or Rotten Tomatoes","author":"string","quote":"Öne çıkan kısa yorum max 130 karakter"}]`

export const API_PROMPTS = {
  diziler: (excludeTitles = []) => {
    const ex = excludeTitles.length
      ? ` Bu başlıkları ÇIKART: ${excludeTitles.join(', ')}.`
      : ''
    return `Web'de ara: 2025'te Türkiye streaming platformlarında mevcut en yüksek IMDB puanlı 20 dizi. Platformlar: Netflix TR, Amazon Prime TR, Disney+ TR, Apple TV+ TR.${ex}
SADECE geçerli bir JSON dizisi döndür (markdown yok, backtick yok). [ ile başla ] ile bitir.
Her nesne tam şu anahtarlara sahip olmalı:
{"title":"string","originalTitle":"string","genres":["Dram"],"imdbScore":9.5,"rottenTomatoesScore":95,"platforms":["Netflix"],"year":2023,"description":"2-3 cümle Türkçe","posterPath":"/tmdb-path.jpg or null",${CAST_REVIEWS_SCHEMA}}`
  },

  filmler: (excludeTitles = []) => {
    const ex = excludeTitles.length
      ? ` Bu başlıkları ÇIKART: ${excludeTitles.join(', ')}.`
      : ''
    return `Web'de ara: 2025'te Türkiye streaming platformlarında mevcut en yüksek IMDB puanlı 20 film. Platformlar: Netflix TR, Amazon Prime TR, Disney+ TR, Apple TV+ TR.${ex}
SADECE geçerli bir JSON dizisi döndür (markdown yok, backtick yok). [ ile başla ] ile bitir.
Her nesne tam şu anahtarlara sahip olmalı:
{"title":"string","originalTitle":"string","genres":["Dram"],"imdbScore":9.0,"rottenTomatoesScore":98,"platforms":["Netflix"],"year":2010,"duration":142,"description":"2-3 cümle Türkçe","posterPath":"/tmdb-path.jpg or null",${CAST_REVIEWS_SCHEMA}}`
  },

  trend: (excludeTitles = []) => {
    const ex = excludeTitles.length
      ? ` Bu başlıkları ÇIKART: ${excludeTitles.join(', ')}.`
      : ''
    return `Twitter/X Türkiye, Instagram TR, TikTok TR'de 2024-2025'te Netflix TR, Amazon Prime TR, Disney+ TR, Apple TV+ TR'de en çok konuşulan trend dizi ve filmler.${ex}
SADECE geçerli bir JSON dizisi döndür (markdown yok). [ ile başla ] ile bitir.
Her nesne: {"title":"string","originalTitle":"string","type":"dizi or film","genres":["Aksiyon"],"imdbScore":8.2,"platforms":["Netflix"],"year":2024,"trendReason":"Neden gündemde 1-2 cümle Türkçe","description":"2 cümle Türkçe","socialScore":88,"posterPath":"/tmdb-path.jpg or null",${CAST_REVIEWS_SCHEMA}}`
  },
}

// ── Arama Promptları ──────────────────────────────────────────────────────────
export const SEARCH_SUGGEST_PROMPT = (query) =>
  `"${query}" ile başlayan veya içeren film ve dizi isimlerini bul. SADECE 8 başlıktan oluşan JSON dizisi döndür. Örnek: ["Başlık 1","Başlık 2"]. Markdown yok.`

export const SEARCH_DETAIL_PROMPT = (title) =>
  `"${title}" filmi veya dizisi hakkında güncel detaylı bilgi getir (IMDB, Rotten Tomatoes, oyuncular, yorumlar).
SADECE tek bir JSON nesnesi döndür (dizi değil):
{"title":"","originalTitle":"","type":"film or dizi","genres":[],"imdbScore":0,"rottenTomatoesScore":0,"platforms":[],"year":0,"description":"Türkçe 2-3 cümle","posterPath":"/tmdb-path.jpg or null","duration":0,${CAST_REVIEWS_SCHEMA}}`
