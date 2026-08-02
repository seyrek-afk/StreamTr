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

// Raf ve başlık metinlerinde kullanılan sıfat biçimi.
// "Kore Dizileri" / "Türk Filmleri" gibi. Karşılığı olmayan ülkede ada düşer
// ("Norveç yapımı") — uydurma sıfat türetmek yerine dürüst ve okunur.
const ADJECTIVE = {
  TR: 'Türk', KR: 'Kore', US: 'Amerikan', GB: 'İngiliz', JP: 'Japon',
  IN: 'Hint', FR: 'Fransız', DE: 'Alman', ES: 'İspanyol', IT: 'İtalyan',
  RU: 'Rus', CN: 'Çin', IR: 'İran', BR: 'Brezilya', MX: 'Meksika',
}

export function countryAdjective(code) {
  return ADJECTIVE[code] || `${countryLabel(code)} yapımı`
}
