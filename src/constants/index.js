export const GENRES = [
  "Aksiyon", "Dram", "Komedi", "Bilim Kurgu", "Gerilim",
  "Suç", "Belgesel", "Animasyon", "Fantezi", "Korku",
  "Romantik", "Tarih",
]

export const PLATFORMS = [
  { id: "Netflix",       label: "Netflix",      color: "#E50914", badge: "N"   },
  { id: "Amazon Prime",  label: "Prime Video",  color: "#00A8E0", badge: "P"   },
  { id: "Disney+",       label: "Disney+",      color: "#1A4BD4", badge: "D+"  },
  { id: "Apple TV+",     label: "Apple TV+",    color: "#555555", badge: "▶"   },
  { id: "HBO Max",       label: "Max",          color: "#5822B4", badge: "MAX" },
  { id: "Mubi",          label: "Mubi",         color: "#2E2D2C", badge: "M"   },
]

export const POSTER_GRADIENTS = [
  ["#1a1a2e","#E50914"], ["#0f3460","#533483"], ["#1b262c","#0f4c75"],
  ["#2d132c","#c72c41"], ["#12100e","#b8860b"], ["#0a1628","#1e4f8f"],
  ["#1a0a1e","#6a0dad"], ["#0d1b2a","#1b6b4b"], ["#2c1a0e","#b85c1a"],
]

export const TABS = [
  { id: "diziler",  emoji: "📺", label: "En İyi Diziler"  },
  { id: "filmler",  emoji: "🎬", label: "En İyi Filmler"  },
  { id: "trend",    emoji: "🔥", label: "Sosyal Trend"    },
  { id: "sanaozel", emoji: "⭐", label: "Sana Özel"        },
]

// ── Tema Sistemi ──────────────────────────────────────────────────────────────
export const THEMES = [
  {
    id: 'cinema',
    label: 'Sinema Karanlığı',
    emoji: '🎬',
    desc: 'Derin koyu, altın tonlu film atmosferi',
    preview: ['#0e0e1c', '#F5C518', '#E04528'],
    css: {
      '--bg':              '#0e0e1c',
      '--bg-card':         '#161624',
      '--bg-card-trend':   'rgba(20,10,10,0.97)',
      '--bg-header':       'rgba(14,14,28,0.97)',
      '--accent':          '#F5C518',
      '--accent2':         '#E04528',
      '--accent-rgb':      '245,197,24',
      '--border':          'rgba(255,255,255,0.08)',
      '--border-trend':    'rgba(245,100,0,0.15)',
      '--text':            '#ffffff',
      '--text-muted':      'rgba(255,255,255,0.65)',
      '--text-faint':      'rgba(255,255,255,0.32)',
      '--tab-active':      '#F5C518',
      '--hover-border':    'rgba(245,197,24,0.30)',
      '--trend-bar':       'linear-gradient(90deg,#F5C518,#E50914)',
      '--logo-grad':       'linear-gradient(120deg,#F5C518 0%,#E04528 100%)',
      '--card-backdrop':   'none',
    }
  },
  {
    id: 'netflix',
    label: 'Netflix',
    emoji: '▶',
    desc: 'Kırmızı-siyah, streaming klasiği',
    preview: ['#181818', '#E50914', '#e85f5f'],
    css: {
      '--bg':              '#181818',
      '--bg-card':         '#222222',
      '--bg-card-trend':   'rgba(22,6,6,0.97)',
      '--bg-header':       'rgba(24,24,24,0.97)',
      '--accent':          '#E50914',
      '--accent2':         '#e85f5f',
      '--accent-rgb':      '229,9,20',
      '--border':          'rgba(255,255,255,0.09)',
      '--border-trend':    'rgba(229,9,20,0.20)',
      '--text':            '#ffffff',
      '--text-muted':      'rgba(255,255,255,0.70)',
      '--text-faint':      'rgba(255,255,255,0.35)',
      '--tab-active':      '#E50914',
      '--hover-border':    'rgba(229,9,20,0.38)',
      '--trend-bar':       'linear-gradient(90deg,#E50914,#e85f5f)',
      '--logo-grad':       'linear-gradient(120deg,#E50914 0%,#ff9900 100%)',
      '--card-backdrop':   'none',
    }
  },
  {
    id: 'glass',
    label: 'Cam Efekti',
    emoji: '💎',
    desc: 'Glassmorphism, mor & mavi tonal',
    preview: ['#0e0e22', '#b068cc', '#c04ee0'],
    css: {
      '--bg':              '#0e0e22',
      '--bg-card':         'rgba(255,255,255,0.055)',
      '--bg-card-trend':   'rgba(130,80,160,0.10)',
      '--bg-header':       'rgba(14,14,34,0.80)',
      '--accent':          '#b068cc',
      '--accent2':         '#c04ee0',
      '--accent-rgb':      '176,104,204',
      '--border':          'rgba(255,255,255,0.10)',
      '--border-trend':    'rgba(176,104,204,0.28)',
      '--text':            '#ffffff',
      '--text-muted':      'rgba(255,255,255,0.70)',
      '--text-faint':      'rgba(255,255,255,0.36)',
      '--tab-active':      '#b068cc',
      '--hover-border':    'rgba(176,104,204,0.42)',
      '--trend-bar':       'linear-gradient(90deg,#8a4faa,#c04ee0)',
      '--logo-grad':       'linear-gradient(120deg,#8a4faa 0%,#c04ee0 100%)',
      '--card-backdrop':   'blur(12px)',
    }
  },
  {
    id: 'ocean',
    label: 'Gece Okyanusu',
    emoji: '🌊',
    desc: 'Derin mavi, siyan enerji',
    preview: ['#060c22', '#009fd4', '#00c89e'],
    css: {
      '--bg':              '#060c22',
      '--bg-card':         '#0a1830',
      '--bg-card-trend':   'rgba(0,14,32,0.97)',
      '--bg-header':       'rgba(6,12,34,0.97)',
      '--accent':          '#009fd4',
      '--accent2':         '#00c89e',
      '--accent-rgb':      '0,159,212',
      '--border':          'rgba(0,159,212,0.12)',
      '--border-trend':    'rgba(0,159,212,0.20)',
      '--text':            '#ddf0fa',
      '--text-muted':      'rgba(220,240,250,0.65)',
      '--text-faint':      'rgba(220,240,250,0.32)',
      '--tab-active':      '#009fd4',
      '--hover-border':    'rgba(0,159,212,0.40)',
      '--trend-bar':       'linear-gradient(90deg,#009fd4,#00c89e)',
      '--logo-grad':       'linear-gradient(120deg,#009fd4 0%,#00c89e 100%)',
      '--card-backdrop':   'none',
    }
  },
  {
    id: 'neon',
    label: 'Neon Siber',
    emoji: '⚡',
    desc: 'Karanlık zemin, neon yeşil & siyan',
    preview: ['#0a0a16', '#00dc8a', '#00aee0'],
    css: {
      '--bg':              '#0a0a16',
      '--bg-card':         '#0c0f0c',
      '--bg-card-trend':   'rgba(0,16,6,0.97)',
      '--bg-header':       'rgba(10,10,22,0.97)',
      '--accent':          '#00dc8a',
      '--accent2':         '#00aee0',
      '--accent-rgb':      '0,220,138',
      '--border':          'rgba(0,220,138,0.10)',
      '--border-trend':    'rgba(0,220,138,0.20)',
      '--text':            '#e0fae0',
      '--text-muted':      'rgba(224,250,224,0.65)',
      '--text-faint':      'rgba(224,250,224,0.32)',
      '--tab-active':      '#00dc8a',
      '--hover-border':    'rgba(0,220,138,0.40)',
      '--trend-bar':       'linear-gradient(90deg,#00dc8a,#00aee0)',
      '--logo-grad':       'linear-gradient(120deg,#00dc8a 0%,#00aee0 100%)',
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
