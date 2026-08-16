import { useState, useEffect } from 'react'
import {
  RefreshCw, ChevronDown, ChevronLeft, Loader, Sparkles, AlertTriangle,
  Tv, Film, Flame, Star, SearchX, Heart,
} from 'lucide-react'
import { PLATFORMS, TR_PLATFORMS, TABS } from './constants/index.js'
import { COUNTRIES, countryLabel, countryContentTitle } from './constants/countries.js'
import { useStreamData, dataKey } from './hooks/useStreamData.js'
import { useSearch }     from './hooks/useSearch.js'
import { useRecommendations } from './hooks/useRecommendations.js'
import { useCountryRails } from './hooks/useCountryRails.js'
import { usePlatforms } from './hooks/usePlatforms.js'
import { useAiSearch } from './hooks/useAiSearch.js'
import { useFavorites } from './contexts/FavoritesContext.jsx'
import ContentCard  from './components/ContentCard.jsx'
import FilterBar    from './components/FilterBar.jsx'
import Dropdown     from './components/Dropdown.jsx'
import RailRow      from './components/RailRow.jsx'
import Segmented    from './components/Segmented.jsx'
import HeroSlider   from './components/HeroSlider.jsx'
import SkeletonGrid from './components/SkeletonGrid.jsx'
import { SearchField, SearchResult } from './components/SearchBar.jsx'
import AiSearchPanel from './components/AiSearchPanel.jsx'
import AccountButton from './components/auth/AccountButton.jsx'

// Sekme ikonları lucide'dan gelir; TABS verisi yalnız anahtarı taşır (emoji yok).
const TAB_ICON = { tv: Tv, film: Film, flame: Flame, star: Star }

// Yıl gruplaması — en yeni yıla (anchor) göre dinamik aralıklar, en eskiler sabit on yıllıklar.
// anchor=2026 → 2026 · 2024–2025 · 2020–2023 · 2010–2019 · 2000–2009 · 2000 öncesi.
// Yalnızca veride karşılığı olan gruplar üretilir (boş grup gösterilmez).
function buildYearBuckets(years) {
  const nums = (years || []).map(Number).filter((n) => Number.isFinite(n))
  if (nums.length === 0) return []
  const a = Math.max(...nums)
  const raw = [
    [a, a],
    [Math.max(2020, a - 2), a - 1],
    [2020, a - 3],
    [2010, 2019],
    [2000, 2009],
    [-Infinity, 1999],
  ]
  return raw
    .filter(([min, max]) => min <= max && nums.some((n) => n >= min && n <= max))
    .map(([min, max]) => ({
      key: min === -Infinity ? `lt-${max}` : `${min}-${max}`,
      label: min === -Infinity ? '2000 öncesi' : min === max ? `${min}` : `${min}–${max}`,
      min,
      max,
    }))
}

// Mercekte kısayol olarak sabitlenen ülke. Uygulamanın kimliği bu.
const HOME_COUNTRY = 'TR'

export default function App() {
  const [tab,             setTab]            = useState('diziler')
  // null = Dünya merceği. 'TR' = Yerli. Diğer kodlar = ülke merceği.
  const [country,         setCountry]        = useState(null)
  const [selectedGenres,  setSelectedGenres] = useState([])
  const [platform,        setPlatform]       = useState('Tümü')
  const [sortBy,          setSortBy]         = useState('default')
  const [trOnly,          setTrOnly]         = useState(false)
  const [selectedYears,   setSelectedYears]  = useState([])
  const [mediaType,       setMediaType]      = useState('all')
  const [aiOpen,          setAiOpen]         = useState(false)

  const {
    data, loading, loadingMore, error,
    visible, hasMore, enriching,
    fetchTab, showMore, retry,
  } = useStreamData()

  const search = useSearch()
  const ai     = useAiSearch()

  const { saved, liked, loved, watchlist } = useFavorites()
  const isSanaOzel = tab === 'sanaozel'

  // Öneri motoruna yalnız BEĞENİ kayıtları tohum olarak girer; Bayıldıklarım
  // iki kat ağırlıkla. İzleyeceklerim girdi DEĞİL — henüz izlenmedi, beğeni
  // sinyali sayılamaz — ama zaten listede olduğu için sonuçtan çıkarılır.
  const oneriTohumu = [
    ...loved.map(f => ({ ...f, _w: 2 })),
    ...liked.map(f => ({ ...f, _w: 1 })),
  ]
  const kayitliAnahtarlar = saved.map(f => f.key)
  const { recommendations, loading: recLoading, error: recError } =
    useRecommendations(oneriTohumu, kayitliAnahtarlar)

  // "Tümünü gör" ile açılan liste (null = raf görünümü)
  const [acikListe, setAcikListe] = useState(null)
  useEffect(() => { if (!isSanaOzel) setAcikListe(null) }, [isSanaOzel])

  // Veri (ülke, sekme) ikilisiyle anahtarlanır; her mercek kendi önbelleğini korur.
  const dk = dataKey(country, tab)

  useEffect(() => { if (tab !== 'sanaozel') fetchTab(dk) }, [dk])

  // Sekme değişiminde sosyal sıralama sadece trend'de geçerlidir
  useEffect(() => {
    if (tab !== 'trend' && sortBy === 'social') setSortBy('default')
  }, [tab, sortBy])

  // Mercek çipleri farklı olduğundan (Disney+ yerli mercekte yok), mercek
  // değişince seçili platform sıfırlanır — aksi halde ızgara sessizce boş kalırdı.
  useEffect(() => { setPlatform('Tümü') }, [country])

  const clearFilters = () => {
    setSelectedGenres([])
    setPlatform('Tümü')
    setTrOnly(false)
    setSortBy('default')
    setSelectedYears([])
    setMediaType('all')
  }
  const hasActiveFilter =
    selectedGenres.length > 0 || platform !== 'Tümü' || trOnly ||
    sortBy !== 'default' || selectedYears.length > 0 || mediaType !== 'all'

  const effectiveSortBy = (sortBy === 'social' && tab !== 'trend') ? 'default' : sortBy

  const availableYears = [...new Set((data[dk] || []).map(i => i.year).filter(Boolean))]
  const yearBuckets = buildYearBuckets(availableYears)
  const activeYearKeys = selectedYears.filter(k => yearBuckets.some(b => b.key === k))

  const mediaOk = (item) => mediaType === 'all' || !item.type || item.type === mediaType

  // Kayıtlar localStorage/Supabase'den, öneriler ayrı bir uçtan gelir; ikisi de
  // useStreamData'nın zenginleştirme yolundan geçmediği için platform rozetleri
  // eksik kalıyordu. Aynı önbelleği paylaşan ayrı bir katman bunu kapatır.
  const lovedZengin     = usePlatforms(loved)
  const likedZengin     = usePlatforms(liked)
  const watchlistZengin = usePlatforms(watchlist)
  const onerilerZengin  = usePlatforms(recommendations)

  // ── Sana Özel filtreleri ───────────────────────────────────────────────────
  // Platform çipleri genel bir listeden değil KULLANICININ KENDİ kayıtlarından
  // türer: 20 platformluk menü açtırıp 6'sında sonuç bulmak yerine, yalnız
  // gerçekten sahip olduğu platformlar sayısıyla gösterilir. Boş sonuç üretmesi
  // bu yüzden imkânsız.
  const platformSayaci = (() => {
    const m = new Map()
    ;[...lovedZengin, ...likedZengin, ...watchlistZengin].forEach(it => {
      new Set(it.platforms || []).forEach(p => m.set(p, (m.get(p) || 0) + 1))
    })
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  })()
  const [secilenPlatformlar, setSecilenPlatformlar] = useState([])
  // Kayıtlardan düşen bir platform seçili kalırsa liste sessizce boşalır.
  useEffect(() => {
    const gecerli = new Set(platformSayaci.map(([p]) => p))
    setSecilenPlatformlar(prev => {
      const next = prev.filter(p => gecerli.has(p))
      return next.length === prev.length ? prev : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformSayaci.map(([p]) => p).join('|')])

  const soFiltrele = (list) => list.filter(it =>
    mediaOk(it) &&
    (!trOnly || (it.platforms || []).length > 0) &&
    (secilenPlatformlar.length === 0 ||
      (it.platforms || []).some(p => secilenPlatformlar.includes(p)))
  )

  const soListeler = {
    oneriler:  { baslik: 'Bana özel öneriler', items: soFiltrele(onerilerZengin) },
    loved:     { baslik: 'Bayıldıklarım',      items: soFiltrele(lovedZengin) },
    liked:     { baslik: 'Beğendiklerim',      items: soFiltrele(likedZengin) },
    watchlist: { baslik: 'İzleyeceklerim',     items: soFiltrele(watchlistZengin) },
  }

  const filtered = [...(data[dk] || [])].filter(item => {
    const mOk = tab !== 'trend' || mediaOk(item)
    const gOk = selectedGenres.length === 0 ||
      selectedGenres.some(g => (item.genres || []).includes(g))
    const pOk = platform === 'Tümü' ||
      (item.platforms || []).some(p =>
        platform === 'Amazon Prime'
          ? p.toLowerCase().includes('amazon') || p.toLowerCase().includes('prime')
          : p === platform
      )
    const tOk = !trOnly || (item.platforms?.length > 0)
    const iy = item.year ? Number(item.year) : NaN
    const yOk = activeYearKeys.length === 0 ||
      (Number.isFinite(iy) && yearBuckets.some(b =>
        activeYearKeys.includes(b.key) && iy >= b.min && iy <= b.max))
    return mOk && gOk && pOk && tOk && yOk
  }).sort((a, b) => {
    if (effectiveSortBy === 'imdb') return (b.imdbScore || 0) - (a.imdbScore || 0)
    if (effectiveSortBy === 'year') return (Number(b.year) || 0) - (Number(a.year) || 0)
    if (effectiveSortBy === 'social') return (b.socialScore || 0) - (a.socialScore || 0)
    if (tab === 'trend') return (b.socialScore || 0) - (a.socialScore || 0)
    // Ülke merceğinde ham IMDB sıralaması güvenilmez: düşük oy sayısı yüzünden
    // 3 oyla 10/10 alan yapım tepeye çıkar. Bayesian ağırlıklı puan kullanılır.
    if (country) {
      return (b._weightedScore || 0) - (a._weightedScore || 0) ||
             (b._voteCount     || 0) - (a._voteCount     || 0)
    }
    return (b.imdbScore || 0) - (a.imdbScore || 0)
  })

  const SORT_OPTIONS = [
    {
      value: 'default',
      label: tab === 'trend'
        ? 'Varsayılan (Sosyal)'
        : country ? 'Varsayılan (Ağırlıklı Puan)' : 'Varsayılan (IMDB)',
    },
    { value: 'imdb',    label: 'IMDB Puanı' },
    { value: 'year',    label: 'Yıl (en yeni)' },
    ...(tab === 'trend' ? [{ value: 'social', label: 'Sosyal etki' }] : []),
  ]

  const visibleFiltered = filtered.slice(0, visible[dk])
  const canShowMore = visibleFiltered.length < filtered.length ||
    (hasMore[dk] && filtered.length <= visible[dk])
  const contentCap = tab === 'trend' ? 100 : 250

  // ── Editoryal raflar (yalnız ülke merceği) ─────────────────────────────────
  // Raflar küratörlü görünümlerdir; kullanıcı filtresi ile doğaları gereği çelişir
  // ("Kült Klasikler" rafı 2024 yıl filtresiyle ne demek?). Bu yüzden HERHANGİ bir
  // filtre veya arama aktifse raflar gizlenir ve yalnız ızgara kalır.
  const searchActive = Boolean(search.query)
  const railsEligible = Boolean(country) && !isSanaOzel && tab !== 'trend' && !aiOpen
  const { rails, loading: railsLoading } = useCountryRails(tab, railsEligible ? country : null)
  const showRails = railsEligible && !hasActiveFilter && !searchActive && !loading[dk]

  // ── Vitrin ────────────────────────────────────────────────────────────────
  // Bana Özel'deki vitrinin aynısı diğer sekmelerde de: bulunulan listenin ilk
  // 10'u. Tek yapımlık ayrı bir bileşen vardı (HeroSpotlight); aynı işi yaptığı
  // için kaldırıldı, iki yerde iki farklı vitrin dili kalmasın.
  //
  // Kaynak yine `filtered` — ızgaranın çizdiği sıralı dizinin ta kendisi.
  // Sıralama ölçütü sekmeye göre değişiyor (sosyal etki / ağırlıklı puan / ham
  // IMDB); ölçütü burada tekrarlamak ikisinin ayrışmasına davetiye olurdu.
  const vitrinItems = isSanaOzel ? [] : filtered.slice(0, 10)

  // Vitrin raflarla aynı kapıdan geçer: arama, filtre veya AI paneli aktifken
  // kullanıcı belirli bir şey arıyordur — küratörlü blok o niyeti böler.
  const showHero = vitrinItems.length > 0 && !isSanaOzel && !aiOpen &&
    !searchActive && !hasActiveFilter && !loading[dk]

  // Kicker ızgara başlığıyla aynı yerde durur: ikisi de "bu liste ne" sorusuna
  // cevap verir, ayrı yerlerde tanımlanırsa birbirinden habersiz kalırlar.
  const heroKicker = tab === 'trend' ? 'Bu hafta perdede' : 'Listenin zirvesinde'

  // Vitrin ızgaradan öğe ÇIKARMAZ. Tek yapımlık spot ışığında çıkarıyorduk —
  // aynı poster iki yüz piksel arayla iki kez görününce hata gibi okunuyordu.
  // Vitrin 10 yapım taşıyınca aynı mantık işlemez: ızgaradan 10 öğe silmek
  // "100 sonuç" sayacını yalancı yapar ve içerik kaybolur. Dönen vitrin zaten
  // listenin bir tanıtımı, listeden bir eksiltme değil.
  const gridItems = visibleFiltered

  // Izgaranın başlığı: raflar varken "geri kalanı" işaret eder, tek başınayken
  // sekmenin kısa adının taşımadığı iddiayı ("en iyi") üstlenir.
  const kindWord = tab === 'filmler' ? 'filmler' : 'diziler'
  const gridHeading = (() => {
    if (tab === 'trend') return 'Sosyalde konuşulanlar'
    // Ülke merceğinde ad öbeğini countryContentTitle kurar: sıfatı elle
    // birleştirmek "Tüm Türk diziler" gibi eksik tamlamalar üretiyordu.
    const what = country
      ? countryContentTitle(country, tab === 'filmler' ? 'film' : 'dizi')
      : kindWord
    return showRails ? `Tüm ${what}` : `En iyi ${what}`
  })()

  const applyGridAction = (action) => {
    if (!action) return
    if (action.type === 'sort')   setSortBy(action.value)
    if (action.type === 'genre')  setSelectedGenres([action.value])
    if (action.type === 'trOnly') setTrOnly(true)
    if (action.type === 'yearsBefore') {
      setSelectedYears(yearBuckets.filter(b => b.max < action.value).map(b => b.key))
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Mercekteki üçüncü segment: Türkiye dışındaki ülkeler.
  const otherCountries = COUNTRIES.filter(c => c.code !== HOME_COUNTRY)
  const isOtherCountry = Boolean(country) && country !== HOME_COUNTRY
  const platformChips  = country === HOME_COUNTRY ? TR_PLATFORMS : PLATFORMS

  return (
    <div className="app-shell">
      {/* ── BAŞLIK: iki bant ──────────────────────────────────────────────────
          Bant 1 kimlik + gezinme, bant 2 tek araç rayı (kapsam → arama → filtre).
          Önceki dört bant içeriği ekranın beşte birine kadar aşağı itiyordu. */}
      <header className="app-header">
        <div className="hdr-row">
          <span className="brand">Stream<span className="brand-tr">TR</span></span>

          <nav className="tabs" aria-label="Bölümler">
            {TABS.map(t => {
              const active  = tab === t.id
              const busy    = Boolean(loading[dataKey(country, t.id)])
              // İkon yüklenirken dönen göstergeye dönüşür: satır genişliği
              // oynamaz, durum yine de okunur.
              const Icon = busy ? Loader : TAB_ICON[t.icon]
              return (
                <button
                  key={t.id}
                  className={`tab${active ? ' tab-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(t.id)}
                >
                  <Icon size={16} className={busy ? 'spin' : undefined} aria-hidden="true" />
                  {t.label}
                </button>
              )
            })}
          </nav>

          <div className="hdr-actions">
            <AccountButton />
          </div>
        </div>

        <div className="toolbar">
          {/* Kapsam — "Yerli" aslında ülke=TR demektir; üçüncü segment onu
              genelleştirir. Sana Özel favori/öneri sekmesidir, köken orada anlamsız. */}
          {!isSanaOzel && (
            <div className="lens" role="group" aria-label="İçerik kapsamı">
              <button
                className="lens-option" aria-pressed={!country}
                onClick={() => setCountry(null)} title="Tüm dünyadan yapımlar"
              >Dünya</button>
              <button
                className="lens-option" aria-pressed={country === HOME_COUNTRY}
                onClick={() => setCountry(HOME_COUNTRY)} title="Türk yapımı dizi ve filmler"
              >Yerli</button>
              <Dropdown
                label={isOtherCountry ? countryLabel(country) : 'Ülke'}
                value={isOtherCountry ? country : null}
                onChange={v => setCountry(v)}
                options={otherCountries.map(c => ({ value: c.code, label: c.label }))}
                align="right"
                minWidth={96}
              />
            </div>
          )}

          {!isSanaOzel && (
            <>
              <SearchField search={search} />
              <button
                className={`ctl${aiOpen ? ' ctl-on' : ''}`}
                onClick={() => setAiOpen(o => !o)}
                aria-pressed={aiOpen}
              >
                <Sparkles size={15} style={{ color: 'var(--accent-ink)' }} aria-hidden="true" />
                AI ile Ara
              </button>
            </>
          )}

          {/* Filtreler AI panelinde gizlenir: AI sonuçları filtrelenmiyor. */}
          {!aiOpen && (isSanaOzel ? (
            <div className="toolbar-filters toolbar-filters-lead">
              {/* Üç seçenek açılır menüde saklanmaz: menü tek tıklık kararı iki
                  adıma çıkarıyor ve mevcut seçimi görmek için açmayı gerektiriyordu.
                  Bölmeli anahtar uygulamanın kendi kontrol dili (bkz. kapsam merceği). */}
              <Segmented
                label="İçerik türü"
                value={mediaType}
                onChange={setMediaType}
                options={[
                  { value: 'all',  label: 'Tümü' },
                  { value: 'dizi', label: 'Dizi' },
                  { value: 'film', label: 'Film' },
                ]}
              />

              {/* "Yayında" ayrı bir eksen (platformlarda var mı), platform çipleri
                  ise hangi platformda — araya ayırıcı konur ki iki eksen tek bir
                  liste gibi okunmasın. */}
              <span className="filter-sep" aria-hidden="true" />

              <button
                className={`ctl ctl-compact${trOnly ? ' ctl-on' : ''}`}
                onClick={() => setTrOnly(v => !v)}
                aria-pressed={trOnly}
                title="Yalnız bir platformda yayında olanlar"
              >
                Yayında
              </button>

              {platformSayaci.slice(0, 5).map(([p, n]) => {
                const secili = secilenPlatformlar.includes(p)
                return (
                  <button
                    key={p}
                    className={`ctl ctl-compact${secili ? ' ctl-on' : ''}`}
                    aria-pressed={secili}
                    onClick={() => setSecilenPlatformlar(prev =>
                      secili ? prev.filter(x => x !== p) : [...prev, p])}
                  >
                    {p} <span className="ctl-count tnum">{n}</span>
                  </button>
                )
              })}
              {platformSayaci.length > 5 && (
                <Dropdown
                  label={`+${platformSayaci.length - 5}`}
                  multi
                  value={secilenPlatformlar.filter(p => !platformSayaci.slice(0, 5).some(([t]) => t === p))}
                  onChange={v => setSecilenPlatformlar(prev => [
                    ...prev.filter(p => platformSayaci.slice(0, 5).some(([t]) => t === p)),
                    ...v,
                  ])}
                  options={platformSayaci.slice(5).map(([p, n]) => ({ value: p, label: `${p} (${n})` }))}
                  minWidth={120}
                />
              )}
            </div>
          ) : (
            <FilterBar
              genres={selectedGenres} onGenresChange={setSelectedGenres}
              yearBuckets={yearBuckets} selectedYears={activeYearKeys} onYearsChange={setSelectedYears}
              platforms={platformChips} platform={platform} onPlatformChange={setPlatform}
              sortOptions={SORT_OPTIONS} sortBy={sortBy} onSortChange={setSortBy}
              mediaType={mediaType} onMediaTypeChange={tab === 'trend' ? setMediaType : undefined}
              trOnly={trOnly} onTrOnlyChange={setTrOnly} enriching={enriching[dk]}
              hasActiveFilter={hasActiveFilter} onClear={clearFilters}
            />
          ))}
        </div>
      </header>

      {/* ── ANA İÇERİK ────────────────────────────────────────────────────── */}
      <main className="app-main">

       {isSanaOzel ? (
        <>
          {/* ── SANA ÖZEL ────────────────────────────────────────────────────
              Izgara yığını yerine vitrin + dört raf: dördü de tek ekrana sığar
              ve raflar uygulamada zaten var (ülke merceğindeki editoryal raflar),
              yani yeni bir dil icat edilmiyor.

              "Tümünü gör" bir listeyi ızgara olarak açar; açıkken raflar yerine
              yalnız o liste görünür. */}
          {saved.length === 0 && recommendations.length === 0 ? (
            <div className="empty-state">
              <Heart size={40} className="empty-icon" aria-hidden="true" />
              <p className="empty-title">Listelerin henüz boş</p>
              <p className="empty-sub">
                Kartlardaki <b>kalbe</b> dokun — bir kez Beğendim, iki kez Bayıldım.
                <b> Ayraç</b> ise izleyeceklerini biriktirir. Öneriler beğenilerine
                bakarak çıkar.
              </p>
            </div>
          ) : acikListe ? (
            <>
              <div className="grid-head">
                <h2 className="grid-title">{soListeler[acikListe].baslik}</h2>
                <button className="btn-text" onClick={() => setAcikListe(null)}>
                  <ChevronLeft size={14} aria-hidden="true" /> Tüm listelere dön
                </button>
              </div>
              {soListeler[acikListe].items.length === 0 ? (
                <p className="muted-note">Bu filtreye uygun kayıt yok.</p>
              ) : (
                <div className="grid-cards enter">
                  {soListeler[acikListe].items.map((item, i) => (
                    <ContentCard key={`${acikListe}-${item.key || item._tmdbId || item.title}-${i}`} item={item} isTrend={false} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Vitrin filtreden ETKİLENMEZ: öneri motorunun sesidir, kullanıcı
                  filtresiyle susturulmaz. Filtre yalnız listeleri daraltır. */}
              {onerilerZengin.length > 0 && <HeroSlider items={onerilerZengin} count={10} kicker="Bana özel öneri" />}

              {recLoading && recommendations.length === 0 && <SkeletonGrid count={6} />}

              {!recLoading && recommendations.length === 0 && saved.length > 0 && (
                <p className="muted-note">
                  {recError || 'Beğenilerine uygun yeni öneri bulunamadı. Birkaç yapım daha beğen.'}
                </p>
              )}

              {/* Boş raf çizilmez: sayfayı uzatır, bilgi vermez. */}
              {['oneriler', 'loved', 'liked', 'watchlist'].map(anahtar => {
                const { baslik, items } = soListeler[anahtar]
                if (items.length === 0) return null
                return (
                  <RailRow
                    key={anahtar}
                    title={baslik}
                    items={items}
                    onShowAll={() => setAcikListe(anahtar)}
                  />
                )
              })}
            </>
          )}
        </>
       ) : aiOpen ? (
        <AiSearchPanel ai={ai} onClose={() => setAiOpen(false)} />
       ) : (
        <>
        {/* Arama sonucu ve sistem uyarıları içerik alanında yaşar; araç rayı
            yalnız kontrolleri taşır. */}
        <SearchResult search={search} />

        {/* ── SPOT IŞIĞI ────────────────────────────────────────────────── */}
        {showHero && <HeroSlider items={vitrinItems} count={10} kicker={heroKicker} />}

        {/* ── EDİTORYAL RAFLAR ──────────────────────────────────────────── */}
        {showRails && rails.length > 0 && (
          <div className="rails-wrap">
            {rails.map(r => (
              <RailRow
                key={r.key}
                title={r.title}
                items={r.items}
                onShowAll={() => applyGridAction(r.gridAction)}
              />
            ))}
          </div>
        )}
        {showRails && railsLoading && rails.length === 0 && (
          <p className="muted-note">Raflar hazırlanıyor…</p>
        )}

        {/* Hata bandı */}
        {error[dk] && !loading[dk] && (
          <div className="band band-danger">
            <div className="band-row">
              <AlertTriangle size={18} className="band-icon" aria-hidden="true" />
              <div>
                <p className="band-title">Veriler yüklenemedi</p>
                <p className="band-sub">İçerik sunucusuna ulaşılamadı. Bağlantını kontrol edip yeniden dene.</p>
              </div>
            </div>
            <button className="btn btn-quiet" onClick={() => retry(dk)}>
              <RefreshCw size={14} aria-hidden="true" /> Yeniden dene
            </button>
          </div>
        )}

        {loading[dk] && <SkeletonGrid count={8} />}

        {/* Boş durum */}
        {!loading[dk] && filtered.length === 0 && !error[dk] && (
          <div className="empty-state">
            <SearchX size={40} className="empty-icon" aria-hidden="true" />
            {data[dk].length === 0 ? (
              <p className="empty-title">Yükleniyor…</p>
            ) : (
              <>
                <p className="empty-title">Bu filtrelerle eşleşen içerik yok</p>
                <p className="empty-sub">
                  Filtrelerden birini gevşetmeyi ya da hepsini temizleyip baştan başlamayı dene.
                </p>
                <button className="btn" onClick={clearFilters}>Filtreleri temizle</button>
              </>
            )}
          </div>
        )}

        {/* İçerik ızgarası */}
        {!loading[dk] && gridItems.length > 0 && (
          <>
            <div className="grid-head">
              <h2 className="grid-title">{gridHeading}</h2>
              <span className="grid-count tnum">{filtered.length} sonuç</span>
            </div>

            <div className="grid-cards enter">
              {gridItems.map((item, i) => (
                <ContentCard
                  key={`${dk}-${item.title}-${i}`}
                  item={item}
                  isTrend={tab === 'trend'}
                  // Diziler/Filmler sekmesinde tür sözcüğü zaten sekmenin adı.
                  showKind={tab === 'trend'}
                />
              ))}
            </div>
          </>
        )}

        {/* Daha fazla */}
        {!loading[dk] && visibleFiltered.length > 0 && canShowMore && (
          <div className="more-wrap">
            <button className="btn btn-quiet" onClick={() => showMore(dk)} disabled={loadingMore[dk]}>
              {loadingMore[dk]
                ? <><Loader size={14} className="spin" aria-hidden="true" /> Yükleniyor…</>
                : <><ChevronDown size={14} aria-hidden="true" /> Daha fazla göster</>
              }
            </button>
            <p className="more-note tnum">
              {visibleFiltered.length} / {filtered.length} gösteriliyor · en fazla {contentCap} içerik
            </p>
          </div>
        )}

        {!loading[dk] && !hasMore[dk] && data[dk].length >= contentCap && (
          <p className="more-note tnum" style={{ textAlign: 'center' }}>
            Tümü yüklendi · {data[dk].length} içerik
          </p>
        )}
        </>
       )}
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <div className="footer-top">
          <span className="footer-brand">StreamTR</span>
          <span className="footer-src">Veriler: TMDB · IMDB · Rotten Tomatoes</span>
        </div>
        <p className="footer-legal">
          Bu sitede yer alan bilgiler kişisel eğitim amaçlı AI ile tasarlanmış olup ticari bir amacı yoktur.
          <br />
          Özgür Seyrek — <a href="mailto:seyrek@gmail.com">seyrek@gmail.com</a>
        </p>
      </footer>
    </div>
  )
}
