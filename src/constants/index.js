export const GENRES = [
  "Aksiyon", "Dram", "Komedi", "Bilim Kurgu", "Gerilim",
  "Suç", "Belgesel", "Animasyon", "Fantezi", "Korku",
  "Romantik", "Tarih",
]

const NETFLIX = { id: "Netflix", label: "Netflix", color: "#E50914", badge: "N" }

// Dünya merceğinde gösterilen platform çipleri.
export const PLATFORMS = [
  NETFLIX,
  { id: "Amazon Prime",  label: "Prime Video",  color: "#00A8E0", badge: "P"   },
  { id: "Disney+",       label: "Disney+",      color: "#1A4BD4", badge: "D+"  },
  { id: "Apple TV+",     label: "Apple TV+",    color: "#555555", badge: "▶"   },
  { id: "HBO Max",       label: "Max",          color: "#5822B4", badge: "MAX" },
  { id: "Mubi",          label: "Mubi",         color: "#2E2D2C", badge: "M"   },
]

// Yerli merceğinde gösterilen platform çipleri.
// Netflix bilinçli olarak burada da yer alır: Türk yapımı orijinallerin büyük
// bölümü Netflix'tedir, yerli mercekten dışlamak yanıltıcı olurdu.
// Sayı bilinçli olarak 6'da tutulur — başlıktaki çip satırı iki mercekte de
// aynı yüksekliği ve hizayı korusun.
export const TR_PLATFORMS = [
  NETFLIX,
  { id: "puhutv",        label: "puhutv",       color: "#00B3A4", badge: "PUHU" },
  { id: "TOD",           label: "TOD",          color: "#7B2FF7", badge: "TOD"  },
  { id: "TV+",           label: "TV+",          color: "#1B3B8C", badge: "TV+"  },
  { id: "Exxen",         label: "Exxen",        color: "#00A65A", badge: "EXX"  },
  { id: "tabii",         label: "tabii",        color: "#1E6FD9", badge: "TABİİ" },
]

// Rozet/etiket çözümlemesi için birleşik liste (ContentCard, DetailOverlay).
// Yalnız çip satırında gösterilmeyen ama rozette çıkabilecek sağlayıcılar da dahil.
export const ALL_PLATFORMS = [
  ...PLATFORMS,
  ...TR_PLATFORMS.filter(p => p.id !== NETFLIX.id),
  { id: "Paramount+",    label: "Paramount+",   color: "#0064FF", badge: "P+"  },
  { id: "Tivibu",        label: "Tivibu",       color: "#E8590C", badge: "TVB" },
  { id: "BluTV",         label: "BluTV",        color: "#0090FF", badge: "BLU" },
]

export const POSTER_GRADIENTS = [
  ["#1a1a2e","#E50914"], ["#0f3460","#533483"], ["#1b262c","#0f4c75"],
  ["#2d132c","#c72c41"], ["#12100e","#b8860b"], ["#0a1628","#1e4f8f"],
  ["#1a0a1e","#6a0dad"], ["#0d1b2a","#1b6b4b"], ["#2c1a0e","#b85c1a"],
]

// Sekmeler. `icon` bir lucide ikon anahtarıdır (App.jsx eşler) — arayüzde emoji
// KULLANILMAZ: her işletim sisteminde farklı çizilir, ikon setiyle aynı çizgi
// kalınlığını tutturamaz ve currentColor'ı almaz.
// Etiketler kısa isimlerdir; "en iyi" iddiası ızgaranın kendi başlığında durur.
export const TABS = [
  { id: "diziler",  icon: "tv",    label: "Diziler"    },
  { id: "filmler",  icon: "film",  label: "Filmler"    },
  { id: "trend",    icon: "flame", label: "Trend"      },
  { id: "sanaozel", icon: "star",  label: "Bana Özel"  },
]

// ── Tema Sistemi ──────────────────────────────────────────────────────────────
// Her tema AYNI sözleşmeyi doldurur; bileşenlerde sabit renk yoktur.
//
// Sözleşmedeki üç kural:
//   1. --bg-elevated ve --bg-header OPAK olmak zorundadır (menü ve yapışkan
//      başlık arkalarındaki içeriği örtmeli).
//   2. --accent dolgu/kenarlık rengidir; METİN olarak --accent-ink kullanılır.
//      İkisi çoğu temada aynıdır ama Netflix kırmızısı koyu zeminde 3:1'in
//      altında kaldığı için orada ayrışır (WCAG AA).
//   3. --text/-muted/-faint üç kademeli mürekkep rampasıdır ve üçü de
//      en açık yüzey (--bg-elevated) üzerinde ≥4.5:1 olmak zorundadır.
export const THEMES = [
  {
    id: 'cinema',
    label: 'Sinema Karanlığı',
    desc: 'Derin koyu, altın tonlu film atmosferi',
    preview: ['#0e0e1c', '#F5C518', '#E04528'],
    css: {
      '--bg':              '#0e0e1c',
      '--bg-card':         '#161624',
      '--bg-elevated':     '#1b1b30',
      '--bg-card-trend':   'rgba(20,10,10,0.97)',
      '--bg-header':       '#0c0c18',
      '--surface':         'rgba(255,255,255,0.055)',
      '--surface-hover':   'rgba(255,255,255,0.10)',
      '--accent':          '#F5C518',
      '--accent-ink':      '#F5C518',
      '--accent-contrast': '#14140f',
      '--accent-rgb':      '245,197,24',
      '--border':          'rgba(255,255,255,0.08)',
      '--border-strong':   'rgba(255,255,255,0.16)',
      '--border-trend':    'rgba(245,100,0,0.15)',
      '--text':            '#ffffff',
      '--text-muted':      'rgba(255,255,255,0.74)',
      '--text-faint':      'rgba(255,255,255,0.58)',
      '--tab-active':      '#F5C518',
      '--hover-border':    'rgba(245,197,24,0.42)',
      // Marka bloğu: başlık bandındaki kütle. Zemin ASLA vurgu rengi olmaz —
      // vurgu yalnız "TR" hecesinde ve kenarda kalır (tek altın odak kuralı).
      '--brand-bg':        '#312E81',
      '--brand-ink':       '#F5F4FA',
      '--trend-bar':       'linear-gradient(90deg,#F5C518,#E50914)',
      '--card-backdrop':   'none',
    }
  },
  {
    id: 'netflix',
    label: 'Netflix',
    desc: 'Kırmızı-siyah, streaming klasiği',
    preview: ['#181818', '#E50914', '#e85f5f'],
    css: {
      '--bg':              '#181818',
      '--bg-card':         '#222222',
      '--bg-elevated':     '#2b2b2b',
      '--bg-card-trend':   'rgba(22,6,6,0.97)',
      '--bg-header':       '#141414',
      '--surface':         'rgba(255,255,255,0.06)',
      '--surface-hover':   'rgba(255,255,255,0.12)',
      '--accent':          '#E50914',
      // Netflix kırmızısı metin olarak koyu zeminde 2.95:1 — AA'yı geçmiyor.
      // Metin için açılmış varyant kullanılır; dolgu rengi markanın kendisidir.
      '--accent-ink':      '#FF7A80',
      '--accent-contrast': '#ffffff',
      '--accent-rgb':      '229,9,20',
      '--border':          'rgba(255,255,255,0.09)',
      '--border-strong':   'rgba(255,255,255,0.18)',
      '--border-trend':    'rgba(229,9,20,0.20)',
      '--text':            '#ffffff',
      '--text-muted':      'rgba(255,255,255,0.74)',
      '--text-faint':      'rgba(255,255,255,0.58)',
      '--tab-active':      '#E50914',
      '--hover-border':    'rgba(229,9,20,0.55)',
      '--brand-bg':        '#40080C',
      '--brand-ink':       '#FFFFFF',
      '--trend-bar':       'linear-gradient(90deg,#E50914,#e85f5f)',
      '--card-backdrop':   'none',
    }
  },
  {
    id: 'glass',
    label: 'Cam Efekti',
    desc: 'Yarı saydam kartlar, mor tonal',
    preview: ['#0e0e22', '#b068cc', '#c04ee0'],
    css: {
      '--bg':              '#0e0e22',
      // Kartlar bilinçli olarak yarı saydam (temanın kimliği), menüler ve
      // başlık DEĞİL: arkalarındaki ızgarayı örtmezlerse okunmazlar.
      '--bg-card':         'rgba(255,255,255,0.055)',
      '--bg-elevated':     '#1d1d3f',
      '--bg-card-trend':   'rgba(130,80,160,0.10)',
      '--bg-header':       '#0b0b1c',
      '--surface':         'rgba(255,255,255,0.07)',
      '--surface-hover':   'rgba(255,255,255,0.13)',
      '--accent':          '#b068cc',
      '--accent-ink':      '#CC93E0',
      '--accent-contrast': '#14101a',
      '--accent-rgb':      '176,104,204',
      '--border':          'rgba(255,255,255,0.10)',
      '--border-strong':   'rgba(255,255,255,0.19)',
      '--border-trend':    'rgba(176,104,204,0.28)',
      '--text':            '#ffffff',
      '--text-muted':      'rgba(255,255,255,0.74)',
      '--text-faint':      'rgba(255,255,255,0.58)',
      '--tab-active':      '#b068cc',
      '--hover-border':    'rgba(176,104,204,0.55)',
      // Cam temasında bile marka bloğu OPAK: bandın kimliği bulanıklaşmamalı.
      '--brand-bg':        '#2E1A45',
      '--brand-ink':       '#FFFFFF',
      '--trend-bar':       'linear-gradient(90deg,#8a4faa,#c04ee0)',
      '--card-backdrop':   'blur(12px)',
    }
  },
  {
    id: 'ocean',
    label: 'Gece Okyanusu',
    desc: 'Derin mavi, siyan enerji',
    preview: ['#060c22', '#009fd4', '#00c89e'],
    css: {
      '--bg':              '#060c22',
      '--bg-card':         '#0a1830',
      '--bg-elevated':     '#0f2141',
      '--bg-card-trend':   'rgba(0,14,32,0.97)',
      '--bg-header':       '#050a1c',
      '--surface':         'rgba(220,240,250,0.06)',
      '--surface-hover':   'rgba(220,240,250,0.12)',
      '--accent':          '#009fd4',
      '--accent-ink':      '#3FBCEA',
      '--accent-contrast': '#04121c',
      '--accent-rgb':      '0,159,212',
      '--border':          'rgba(0,159,212,0.14)',
      '--border-strong':   'rgba(0,159,212,0.34)',
      '--border-trend':    'rgba(0,159,212,0.20)',
      '--text':            '#ddf0fa',
      '--text-muted':      'rgba(220,240,250,0.74)',
      '--text-faint':      'rgba(220,240,250,0.58)',
      '--tab-active':      '#009fd4',
      '--hover-border':    'rgba(0,159,212,0.55)',
      '--brand-bg':        '#0A2A52',
      '--brand-ink':       '#DDF0FA',
      '--trend-bar':       'linear-gradient(90deg,#009fd4,#00c89e)',
      '--card-backdrop':   'none',
    }
  },
  {
    id: 'neon',
    label: 'Neon Siber',
    desc: 'Karanlık zemin, neon yeşil & siyan',
    preview: ['#0a0a16', '#00dc8a', '#00aee0'],
    css: {
      '--bg':              '#0a0a16',
      '--bg-card':         '#0c0f0c',
      '--bg-elevated':     '#141a16',
      '--bg-card-trend':   'rgba(0,16,6,0.97)',
      '--bg-header':       '#08080f',
      '--surface':         'rgba(224,250,224,0.055)',
      '--surface-hover':   'rgba(224,250,224,0.11)',
      '--accent':          '#00dc8a',
      '--accent-ink':      '#00dc8a',
      '--accent-contrast': '#04140c',
      '--accent-rgb':      '0,220,138',
      '--border':          'rgba(0,220,138,0.12)',
      '--border-strong':   'rgba(0,220,138,0.30)',
      '--border-trend':    'rgba(0,220,138,0.20)',
      '--text':            '#e0fae0',
      '--text-muted':      'rgba(224,250,224,0.74)',
      '--text-faint':      'rgba(224,250,224,0.58)',
      '--tab-active':      '#00dc8a',
      '--hover-border':    'rgba(0,220,138,0.55)',
      '--brand-bg':        '#0B2A1E',
      '--brand-ink':       '#E0FAE0',
      '--trend-bar':       'linear-gradient(90deg,#00dc8a,#00aee0)',
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
