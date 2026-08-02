// ── "AI ile Ara": serbest metni TMDB keşif sorgusuna çeviren ayrıştırıcı ─────
//
// MİMARİ NOT — neden LLM değil?
// StreamTR statik bir sitedir (sunucu yok). Anthropic anahtarını tarayıcı
// paketine gömmek onu herkese açık hale getirirdi. Bu yüzden ilk sürüm
// LLM'siz, deterministik bir ayrıştırıcıdır: ücretsiz, anında ve çevrimdışı
// çalışır, sonuçları öngörülebilir.
//
// LLM'E GEÇİŞ NOKTASI: dışa açılan tek sözleşme `resolveQuery(text)` →
// `{ params, mediaTypes, explain[] }`. Sunucu tarafı bir LLM eklendiğinde
// yalnız bu fonksiyonun gövdesi değişir; çağıran taraf (useAiSearch, panel)
// hiç değişmez. Sözleşmeyi bozmadan büyütün.
//
// Ayrıştırıcı SAF'tır — anahtar kelime araması dışında ağ çağrısı yapmaz.

import { VOTE_MIN } from './discover.js'
import { COUNTRIES } from '../constants/countries.js'

// Türkçe-duyarsız normalize (searchMatch ile aynı mantık, bağımsızlık için ayrı).
function norm(s) {
  return (s || '')
    .replace(/[İI]/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// ── Sözlükler ────────────────────────────────────────────────────────────────

// Tür anahtar kelimeleri → TMDB genre id. Bir tür birden çok kelimeyle anılır.
const GENRE_WORDS = [
  [[28],        ['aksiyon', 'dovus', 'kavga', 'patlama']],
  [[12],        ['macera', 'serüven', 'seruven']],
  [[16],        ['animasyon', 'anime', 'cizgi']],
  [[35],        ['komedi', 'komik', 'guldur', 'eglenceli', 'mizah']],
  [[80],        ['suc', 'mafya', 'gangster', 'polisiye', 'soygun']],
  [[99],        ['belgesel']],
  [[18],        ['dram', 'dramatik', 'duygusal', 'hüzün', 'huzun']],
  [[10751],     ['aile', 'ailecek', 'cocuklarla', 'çocuklarla']],
  [[14],        ['fantastik', 'fantezi', 'buyu', 'ejderha']],
  [[36],        ['tarihi', 'tarih', 'donem', 'dönem']],
  [[27],        ['korku', 'korkunc', 'urkutucu', 'dehset', 'zombi']],
  [[10402],     ['muzik', 'muzikal']],
  [[9648],      ['gizem', 'gizemli', 'sir']],
  [[10749],     ['romantik', 'romantizm', 'ask', 'sevgili']],
  [[878],       ['bilim kurgu', 'bilimkurgu', 'uzay', 'robot', 'distopya']],
  [[53],        ['gerilim', 'gergin', 'psikolojik']],
  [[10752],     ['savas', 'harp']],
  [[37],        ['western', 'kovboy']],
]

// Ülke anahtar kelimeleri → ISO kodu. Sıfat ve ad biçimleri birlikte.
const COUNTRY_WORDS = {
  KR: ['kore', 'guney kore', 'k-drama', 'kdrama'],
  IN: ['hint', 'hindistan', 'bollywood'],
  JP: ['japon', 'japonya'],
  TR: ['turk', 'turkiye', 'yerli'],
  US: ['amerikan', 'abd', 'hollywood'],
  GB: ['ingiliz', 'ingiltere', 'britanya'],
  FR: ['fransiz', 'fransa'],
  IT: ['italyan', 'italya'],
  ES: ['ispanyol', 'ispanya'],
  DE: ['alman', 'almanya'],
  IR: ['iran'],
  CN: ['cin'],
  RU: ['rus', 'rusya'],
  BR: ['brezilya'],
  MX: ['meksika'],
  SE: ['isvec'],
  DK: ['danimarka'],
  TH: ['tayland'],
  HK: ['hong kong'],
  TW: ['tayvan'],
}

// Anlamsal temalar → TMDB anahtar kelimesinin İNGİLİZCE karşılığı.
//
// ID'ler bilinçli olarak SABİT KODLANMAZ. Denemede tahmini id'lerin yanlış
// olduğu görüldü: 10761 "religion" değil "superhuman", 9673 "philosophy" değil
// "love" çıktı — yani "din" araması sessizce süper kahraman filmleri getirirdi.
// Yanlış id hata vermez, yalnızca yanlış sonuç verir; bu yüzden id'ler çalışma
// anında /search/keyword ile çözülür (bkz. useAiSearch, sonuçlar önbelleklenir).
const THEME_WORDS = {
  din:        'religion',
  dini:       'religion',
  inanc:      'faith',
  tanri:      'god',
  felsefe:    'philosophy',
  intikam:    'revenge',
  hayatta:    'survival',
  arkadaslik: 'friendship',
  yalnizlik:  'loneliness',
  yolculuk:   'road trip',
  mahkeme:    'courtroom',
  hapis:      'prison',
  spor:       'sports',
  zaman:      'time travel',
  salgin:     'pandemic',
  casus:      'espionage',
}

// ── Yardımcılar ──────────────────────────────────────────────────────────────

function hasWord(text, word) {
  // Kelime sınırı yerine gevşek içerme: Türkçe ekler ("aksiyonlu", "korkunç bir")
  // kelime sınırını bozar, bu yüzden içerme daha isabetli sonuç verir.
  return text.includes(norm(word))
}

function matchGenres(text) {
  const ids = new Set()
  const hits = []
  for (const [genreIds, words] of GENRE_WORDS) {
    for (const w of words) {
      if (hasWord(text, w)) {
        genreIds.forEach(id => ids.add(id))
        hits.push(w)
        break
      }
    }
  }
  return { ids: [...ids], hits }
}

function matchCountry(text) {
  for (const [code, words] of Object.entries(COUNTRY_WORDS)) {
    for (const w of words) {
      if (hasWord(text, w)) return { code, word: w }
    }
  }
  return null
}

// Yakalanan temaların İngilizce arama terimlerini döndürür; id çözümü
// çağıran tarafta (ağ erişimi olan katmanda) yapılır.
function matchThemes(text) {
  const terms = new Set()
  const hits = []
  for (const [word, term] of Object.entries(THEME_WORDS)) {
    if (hasWord(text, word)) {
      terms.add(term)
      hits.push(word)
    }
  }
  return { terms: [...terms], hits }
}

// "90'lar", "1990'lar", "2000'ler", "eski", "kült", "yeni", "son yıllarda"
function matchEra(text) {
  // Kullanıcılar on yılı çoğunlukla iki haneli yazar ("90'lar"), dört haneli
  // biçimi ("1990'lar") beklemek bu ifadeyi tamamen kaçırıyordu.
  const decade = text.match(/(?:^|[^0-9])(19|20)?(\d0)\s*['’]?\s*l[ae]r/)
  if (decade) {
    const century = decade[1]
    const dd = Number(decade[2])
    // Yüzyıl yazılmamışsa: 30 ve üstü 1900'ler, altı 2000'ler (90→1990, 20→2020).
    const start = century ? Number(`${century}${decade[2]}`) : (dd >= 30 ? 1900 + dd : 2000 + dd)
    return { from: `${start}-01-01`, to: `${start + 9}-12-31`, label: `${start}'ler` }
  }
  if (/\beski\b|kult|klasik|nostalj/.test(text)) {
    return { to: '2010-12-31', label: 'eski / kült' }
  }
  if (/\byeni\b|guncel|son yil|son zaman|bu yil/.test(text)) {
    const y = new Date().getFullYear()
    return { from: `${y - 2}-01-01`, label: 'son yıllar' }
  }
  return null
}

function matchQuality(text) {
  // Kelime sırası İKİ yönde de aranır: kullanıcılar "yüksek puanlı" kadar sık
  // "puanı yüksek" de yazıyor. Tek yönü tanımak, kalite filtresini sessizce
  // uygulanmamış bırakıyordu (üretimde yakalandı).
  const yuksek = [
    /yuksek puan/, /iyi puan/, /puan[a-z]* yuksek/, /puan[a-z]* iyi/,
    /rating[a-z]* yuksek/, /yuksek rating/, /imdb[a-z]* yuksek/,
    /en iyi/, /kaliteli/, /basyapit/, /efsane/, /cok begenilen/,
  ]
  if (yuksek.some(re => re.test(text))) {
    return { min: 7.5, votes: 200, label: 'yüksek puanlı' }
  }
  if (/idare eder|fena olmayan|ortalama/.test(text)) {
    return { min: 6, votes: VOTE_MIN, label: 'ortalama üstü' }
  }
  return null
}

function matchMediaTypes(text) {
  const wantsTv    = /\bdizi|sezon|bolum|series\b/.test(text)
  const wantsMovie = /\bfilm|sinema|movie\b/.test(text)
  if (wantsTv && !wantsMovie) return ['tv']
  if (wantsMovie && !wantsTv) return ['movie']
  return ['movie', 'tv']
}

function matchRuntime(text) {
  if (/kisa film|kisa bir film|cok uzun olmasin|kisa olsun/.test(text)) {
    return { lte: 100, label: 'kısa (≤100dk)' }
  }
  if (/uzun film|destansi|epik/.test(text)) {
    return { gte: 140, label: 'uzun (≥140dk)' }
  }
  return null
}

// ── Ana sözleşme ─────────────────────────────────────────────────────────────
//
// Girdi: serbest metin. Çıktı: TMDB discover parametreleri + hangi ipuçlarının
// yakalandığını anlatan `explain` listesi. `explain` kullanıcıya gösterilir —
// sistemin neyi anladığını görmek, yanlış anladığında düzeltmeyi mümkün kılar.
export function parseQuery(text) {
  const t = norm(text || '')
  if (!t.trim()) return { params: {}, mediaTypes: ['movie', 'tv'], explain: [], empty: true }

  const explain = []
  const params = { sort_by: 'popularity.desc' }

  const genres = matchGenres(t)
  if (genres.ids.length) {
    params.with_genres = genres.ids.join(',')
    explain.push({ label: 'Tür', value: genres.hits.join(', ') })
  }

  const country = matchCountry(t)
  if (country) {
    params.with_origin_country = country.code
    const c = COUNTRIES.find(x => x.code === country.code)
    explain.push({ label: 'Ülke', value: c ? c.label : country.code })
  }

  const themes = matchThemes(t)
  let keywordTerms = []
  if (themes.terms.length) {
    keywordTerms = themes.terms
    explain.push({ label: 'Tema', value: themes.hits.join(', ') })
  }

  const era = matchEra(t)
  if (era) {
    if (era.from) params['_date.gte'] = era.from
    if (era.to)   params['_date.lte'] = era.to
    explain.push({ label: 'Dönem', value: era.label })
  }

  const quality = matchQuality(t)
  if (quality) {
    params['vote_average.gte'] = quality.min
    params['vote_count.gte']   = quality.votes
    // Puan istendiğinde popülerlik değil puan sıralaması daha doğru sonuç verir.
    params.sort_by = 'vote_average.desc'
    explain.push({ label: 'Kalite', value: quality.label })
  } else {
    // Puan filtresi yoksa bile çöp sonuçları elemek için asgari oy eşiği kalsın.
    params['vote_count.gte'] = VOTE_MIN
  }

  const runtime = matchRuntime(t)
  if (runtime) {
    if (runtime.lte) params['with_runtime.lte'] = runtime.lte
    if (runtime.gte) params['with_runtime.gte'] = runtime.gte
    explain.push({ label: 'Süre', value: runtime.label })
  }

  const mediaTypes = matchMediaTypes(t)
  explain.push({
    label: 'İçerik',
    value: mediaTypes.length === 2 ? 'film + dizi' : mediaTypes[0] === 'tv' ? 'dizi' : 'film',
  })

  // keywordTerms İNGİLİZCE terimlerdir; TMDB id'lerine çağıran katmanda çevrilir.
  return {
    params,
    mediaTypes,
    keywordTerms,
    explain,
    // "İçerik" satırı her zaman eklenir; tek başına kalmışsa hiçbir ipucu
    // yakalanmamış demektir → kullanıcıya sorguyu netleştirmesi söylenir.
    empty: explain.length <= 1,
  }
}

// Asıl dışa açılan sözleşme. Bugün senkron ayrıştırıcıyı sarar; yarın sunucu
// tarafı bir LLM çağrısı olabilir — imza aynı kaldığı sürece çağıran değişmez.
export async function resolveQuery(text) {
  return parseQuery(text)
}

// Panelde gösterilen örnek istemler. Kullanıcıya bu alana ne yazabileceğini
// göstermek, boş bir metin kutusundan çok daha iyi bir başlangıç noktasıdır.
export const EXAMPLE_PROMPTS = [
  'Evde arkadaşlarla izlemelik, puanı yüksek eski bir kült aksiyon filmi',
  'Hint sinemasından insan ve dine dair anlatımı olan filmler',
  'Ailecek izlenebilecek animasyon, çok uzun olmasın',
  '90\'lar Kore gerilim dizileri',
  'Uzay ve robot temalı yüksek puanlı bilim kurgu',
  'İntikam konulu Japon suç filmleri',
]
