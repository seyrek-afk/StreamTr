// ── Ülke merceğinin editoryal rafları ────────────────────────────────────────
//
// Raflar YALNIZCA bir ülke merceği açıkken görünür. Dünya merceğinde top_rated
// zaten tek eksende sıralı bir listedir; oraya raf koymak yapay durur. Ülke
// havuzu ise küçük ve heterojendir (TR: ~176 dizi / ~622 film) — küratörlüğe
// muhtaç olan odur.
//
// Bu modül SAF'tır: ağ çağrısı yapmaz, yalnız sorgu tarifi üretir. Böylece raf
// kriterleri ağ olmadan test edilebilir.
//
// gridAction — "Tümü →" bağlantısının ızgaraya uygulayacağı filtre. Rafı ızgarada
// birebir yeniden üretmeye çalışmaz; en yakın GERÇEK filtreyi uygular. Filtre
// aktifleşince raflar zaten gizlenir (bkz. App: rafların görünürlük kuralı).

import { VOTE_MIN } from './discover.js'
import { countryAdjective } from '../constants/countries.js'

// TMDB tarih parametreleri YYYY-MM-DD ister.
function iso(d) {
  return d.toISOString().slice(0, 10)
}

function daysBefore(now, n) {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  return iso(d)
}

// Yerli platformlardan yalnız TMDB'de GERÇEKTEN kataloğu olanlar.
// Gain'in TMDB kaydı yok; Exxen (1 dizi) ve tabii (3 dizi) pratikte boş —
// bunlar rafa alınırsa raf sürekli 4-öğe eşiğinin altında kalır ve hiç görünmez.
export const RAIL_PROVIDERS = '342|1826|1904' // puhutv · TOD TV · TV+

// Bir rafın gösterilmesi için gereken en az öğe sayısı.
// Yarım raf amatör durur; altında kalan raf hiç render edilmez.
export const RAIL_MIN_ITEMS = 4

export function railsFor(tab, country = 'TR', now = new Date()) {
  if (!country) return []
  const adj = countryAdjective(country)

  if (tab === 'diziler') {
    const rails = [
      {
        key: 'yuksek-puanli',
        title: `Yüksek Puanlı ${adj} Dizileri`,
        mediaType: 'tv',
        params: { 'vote_count.gte': VOTE_MIN, sort_by: 'vote_average.desc' },
        sortByWeighted: true,
        gridAction: { type: 'sort', value: 'imdb' },
      },
      {
        key: 'bu-ay',
        title: 'Bu Ay Çıkanlar',
        mediaType: 'tv',
        params: { 'first_air_date.gte': daysBefore(now, 60), sort_by: 'popularity.desc' },
        gridAction: { type: 'sort', value: 'year' },
      },
      {
        key: 'kult',
        title: 'Kült Klasikler',
        mediaType: 'tv',
        params: {
          'first_air_date.lte': '2014-12-31',
          'vote_count.gte': VOTE_MIN,
          sort_by: 'vote_average.desc',
        },
        sortByWeighted: true,
        gridAction: { type: 'yearsBefore', value: 2015 },
      },
    ]

    // Platform rafı yalnız Türkiye'de anlamlı: RAIL_PROVIDERS yerli sağlayıcılardır.
    // Başka ülkede bu raf yanlış veri gösterirdi.
    if (country === 'TR') {
      rails.push({
        key: 'platformda',
        title: 'Yerli Platformlarda',
        mediaType: 'tv',
        params: {
          watch_region: 'TR',
          with_watch_providers: RAIL_PROVIDERS,
          sort_by: 'popularity.desc',
        },
        gridAction: { type: 'trOnly' },
      })
    }
    return rails
  }

  if (tab === 'filmler') {
    return [
      {
        key: 'yuksek-puanli',
        title: `Yüksek Puanlı ${adj} Filmleri`,
        mediaType: 'movie',
        params: { 'vote_count.gte': VOTE_MIN, sort_by: 'vote_average.desc' },
        sortByWeighted: true,
        gridAction: { type: 'sort', value: 'imdb' },
      },
      {
        key: 'yeni-vizyon',
        title: 'Yeni Vizyona Girenler',
        mediaType: 'movie',
        params: { 'primary_release_date.gte': daysBefore(now, 90), sort_by: 'popularity.desc' },
        gridAction: { type: 'sort', value: 'year' },
      },
      {
        key: 'kult',
        title: 'Kült Klasikler',
        mediaType: 'movie',
        params: {
          'primary_release_date.lte': '2009-12-31',
          'vote_count.gte': VOTE_MIN,
          sort_by: 'vote_average.desc',
        },
        sortByWeighted: true,
        gridAction: { type: 'yearsBefore', value: 2010 },
      },
      {
        key: 'komedi',
        title: 'Efsane Komediler',
        mediaType: 'movie',
        params: { with_genres: 35, 'vote_count.gte': VOTE_MIN, sort_by: 'vote_average.desc' },
        sortByWeighted: true,
        gridAction: { type: 'genre', value: 'Komedi' },
      },
    ]
  }

  // Sosyal Trend: raf yok. Trend zaten tek eksenli bir sıralamadır; raf eklemek
  // bu modülün kendi gerekçesini çiğnerdi.
  return []
}
