// ── Tür sözlüğü — kanonik anahtar → TMDB id (medya türüne göre) ──────────────
//
// ÖNEMLİ (sessiz hata): TMDB'de film ve dizi tür id'leri AYNI DEĞİLDİR.
//   Aksiyon      → film 28,  dizi 10759 (Action & Adventure)
//   Bilim Kurgu  → film 878, dizi 10765 (Sci-Fi & Fantasy)
//   Savaş        → film 10752, dizi 10768 (War & Politics)
// Önceden yalnız film id'leri üretiliyor ve dizi ucuna da aynen gönderiliyordu.
// TMDB geçersiz tür id'sinde hata vermez, sadece BOŞ sonuç döner — yani
// "aksiyon dizisi" araması sessizce sonuçsuz kalıyordu.
//
// Bu yüzden ayrıştırıcı (ve LLM ucu) artık id değil ANAHTAR üretir; id çevirimi
// tek yerde, sorgu kurulurken medya türüne göre yapılır.
//
// `tv: []` olan türlerin TMDB'de dizi karşılığı yoktur (korku, gerilim,
// romantik, tarih, müzik). O türde dizi araması ANLAMSIZDIR: filtreyi düşürüp
// alakasız dizi göstermek yerine o uç hiç sorgulanmaz (bkz. useAiSearch).

export const GENRES = {
  aksiyon:    { label: 'aksiyon',      movie: [28],    tv: [10759] },
  macera:     { label: 'macera',       movie: [12],    tv: [10759] },
  animasyon:  { label: 'animasyon',    movie: [16],    tv: [16]    },
  komedi:     { label: 'komedi',       movie: [35],    tv: [35]    },
  suc:        { label: 'suç',          movie: [80],    tv: [80]    },
  belgesel:   { label: 'belgesel',     movie: [99],    tv: [99]    },
  dram:       { label: 'dram',         movie: [18],    tv: [18]    },
  aile:       { label: 'aile',         movie: [10751], tv: [10751] },
  fantastik:  { label: 'fantastik',    movie: [14],    tv: [10765] },
  tarih:      { label: 'tarihi',       movie: [36],    tv: []      },
  korku:      { label: 'korku',        movie: [27],    tv: []      },
  muzik:      { label: 'müzik',        movie: [10402], tv: []      },
  gizem:      { label: 'gizem',        movie: [9648],  tv: [9648]  },
  romantik:   { label: 'romantik',     movie: [10749], tv: []      },
  bilimkurgu: { label: 'bilim kurgu',  movie: [878],   tv: [10765] },
  gerilim:    { label: 'gerilim',      movie: [53],    tv: []      },
  savas:      { label: 'savaş',        movie: [10752], tv: [10768] },
  western:    { label: 'western',      movie: [37],    tv: [37]    },
}

export const GENRE_KEYS = Object.keys(GENRES)

export function isGenreKey(key) {
  return Object.prototype.hasOwnProperty.call(GENRES, key)
}

// Anahtar listesini verilen medya türünün TMDB id'lerine çevirir.
export function genreIdsFor(keys, mediaType) {
  const field = mediaType === 'movie' ? 'movie' : 'tv'
  const ids = new Set()
  for (const k of keys || []) {
    if (!isGenreKey(k)) continue
    GENRES[k][field].forEach(id => ids.add(id))
  }
  return [...ids]
}

// Tür istendi ama bu medya türünde hiçbirinin karşılığı yoksa true.
// (ör. "korku dizisi" → TMDB'de korku dizi türü yok)
export function genresUnsupportedFor(keys, mediaType) {
  return (keys || []).length > 0 && genreIdsFor(keys, mediaType).length === 0
}

export function genreLabels(keys) {
  return (keys || []).filter(isGenreKey).map(k => GENRES[k].label)
}
