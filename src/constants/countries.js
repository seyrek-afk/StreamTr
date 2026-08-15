// ── Ülke listesi (TMDB with_origin_country) ──────────────────────────────────
//
// "Yerli" merceği aslında ülke=TR demektir; bu liste onu genelleştirir.
// Türkiye ayrıca mercekte sabit kısayol olarak durur — uygulamanın kimliği bu.
//
// Bayrak emoji KULLANILMAZ: Windows'ta bayraklar oluşturulamaz ve "TR" gibi iki
// harflik kutulara düşer. Düz metin ad her platformda aynı görünür.
//
// Liste kürelidir, TMDB'nin tüm ülkeleri değil — dizi/film üretimi anlamlı olan
// ve Türkiye'den izleyicinin arayacağı ülkeler. Alfabetik (Türkçe) sıralıdır.

export const COUNTRIES = [
  { code: 'DE', label: 'Almanya' },
  { code: 'US', label: 'ABD' },
  { code: 'AR', label: 'Arjantin' },
  { code: 'AU', label: 'Avustralya' },
  { code: 'BE', label: 'Belçika' },
  { code: 'BR', label: 'Brezilya' },
  { code: 'CZ', label: 'Çekya' },
  { code: 'CN', label: 'Çin' },
  { code: 'DK', label: 'Danimarka' },
  { code: 'ID', label: 'Endonezya' },
  { code: 'FR', label: 'Fransa' },
  { code: 'KR', label: 'Güney Kore' },
  { code: 'IN', label: 'Hindistan' },
  { code: 'NL', label: 'Hollanda' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'GB', label: 'İngiltere' },
  { code: 'IR', label: 'İran' },
  { code: 'IE', label: 'İrlanda' },
  { code: 'ES', label: 'İspanya' },
  { code: 'SE', label: 'İsveç' },
  { code: 'IT', label: 'İtalya' },
  { code: 'CA', label: 'Kanada' },
  { code: 'MX', label: 'Meksika' },
  { code: 'EG', label: 'Mısır' },
  { code: 'NO', label: 'Norveç' },
  { code: 'PL', label: 'Polonya' },
  { code: 'RU', label: 'Rusya' },
  { code: 'TW', label: 'Tayvan' },
  { code: 'TH', label: 'Tayland' },
  { code: 'TR', label: 'Türkiye' },
  { code: 'JP', label: 'Japonya' },
]

const BY_CODE = Object.fromEntries(COUNTRIES.map(c => [c.code, c]))

export function countryLabel(code) {
  return BY_CODE[code]?.label || code
}

export function isKnownCountry(code) {
  return Boolean(BY_CODE[code])
}

// Sıfat karşılıkları. Doğrudan dışarı verilmez: çıplak sıfat iki farklı
// dilbilgisi yapısına zorlanınca birini bozuyordu (bkz. countryContentTitle).
const ADJECTIVE = {
  TR: 'Türk', KR: 'Kore', US: 'Amerikan', GB: 'İngiliz', JP: 'Japon',
  IN: 'Hint', FR: 'Fransız', DE: 'Alman', ES: 'İspanyol', IT: 'İtalyan',
  RU: 'Rus', CN: 'Çin', IR: 'İran', BR: 'Brezilya', MX: 'Meksika',
}

const trUpperFirst = (s) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1)

// Ülke + içerik türü için TAM ad öbeği.
//
// Türkçede burada iki ayrı yapı var ve hangisinin kurulacağı sıfat karşılığının
// olup olmamasına bağlı:
//   sıfat varsa → isim tamlaması : "Türk dizileri",  "Kore filmleri"
//   sıfat yoksa → sıfat öbeği    : "Norveç yapımı diziler"
//
// Tek bir biçimi ikisine birden uygulamak daima birini bozar: "Türk diziler"
// (eksik tamlama) ya da "Norveç yapımı dizileri" (fazla tamlama). Bu yüzden
// seçim çağıranda değil, burada tek yerde yapılır — daha önce sıfat dizgesi
// dışarı verildiği için ızgara başlığı ilkini, raf başlıkları ikincisini
// üretiyordu.
//
// titleCase: raf başlıkları Başlık Düzeni kullanır, ızgara başlığı cümle
// düzeni. Ad öbeğinin kendisi ikisinde de aynı, yalnız yazımı değişir.
export function countryContentTitle(code, kind, { titleCase = false } = {}) {
  const noun = kind === 'film' ? 'film' : 'dizi'
  const adj = ADJECTIVE[code]
  const words = adj
    ? [adj, `${noun}leri`]
    : [countryLabel(code), 'yapımı', `${noun}ler`]
  return (titleCase ? words.map(trUpperFirst) : words).join(' ')
}
