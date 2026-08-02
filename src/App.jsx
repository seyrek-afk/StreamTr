import { useState, useEffect } from 'react'
import { RefreshCw, X, ChevronDown, Loader, Sparkles } from 'lucide-react'
import { PLATFORMS, TR_PLATFORMS, TABS } from './constants/index.js'
import { COUNTRIES, countryLabel, countryAdjective } from './constants/countries.js'
import { useStreamData, dataKey } from './hooks/useStreamData.js'
import { useSearch }     from './hooks/useSearch.js'
import { useRecommendations } from './hooks/useRecommendations.js'
import { useCountryRails } from './hooks/useCountryRails.js'
import { useAiSearch } from './hooks/useAiSearch.js'
import { useFavorites } from './contexts/FavoritesContext.jsx'
import ContentCard  from './components/ContentCard.jsx'
import FilterBar    from './components/FilterBar.jsx'
import Dropdown     from './components/Dropdown.jsx'
import RailRow      from './components/RailRow.jsx'
import SkeletonGrid from './components/SkeletonGrid.jsx'
import ThemePicker  from './components/ThemePicker.jsx'
import SearchBar    from './components/SearchBar.jsx'
import AiSearchPanel from './components/AiSearchPanel.jsx'
import AccountButton from './components/auth/AccountButton.jsx'

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

  const { favorites } = useFavorites()
  const { recommendations, loading: recLoading, error: recError } = useRecommendations(favorites)
  const isSanaOzel = tab === 'sanaozel'

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

  const favoritesFiltered       = favorites.filter(mediaOk)
  const recommendationsFiltered = recommendations.filter(mediaOk)

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');`}</style>

      {/* ── BAŞLIK: iki sıra ──────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="hdr-row hdr-brand">
          <div className="brand">
            <span className="brand-name">StreamTR</span>
            <span className="brand-kicker">TÜRKİYE</span>
          </div>
          <div className="hdr-actions">
            <AccountButton />
            <ThemePicker />
          </div>
        </div>

        <div className="hdr-row hdr-nav">
          <nav className="tabs">
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  className={`tab${active ? ' tab-active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <span>{t.emoji}</span> {t.label}
                  {loading[dataKey(country, t.id)] && <RefreshCw size={11} className="spin" />}
                </button>
              )
            })}
          </nav>

          {/* Mercek — "Yerli" aslında ülke=TR demektir; üçüncü segment onu
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
                minWidth={104}
              />
            </div>
          )}
        </div>
      </header>

      {/* ── ARAMA SATIRI ──────────────────────────────────────────────────── */}
      {!isSanaOzel && (
        <div className="search-row">
          <div className="search-row-main">
            <SearchBar search={search} />
          </div>
          <button
            className={`ai-toggle${aiOpen ? ' ai-toggle-on' : ''}`}
            onClick={() => setAiOpen(o => !o)}
            aria-pressed={aiOpen}
          >
            <Sparkles size={13} /> AI ile Ara
          </button>
        </div>
      )}

      {/* ── AI PANELİ ─────────────────────────────────────────────────────── */}
      {aiOpen && !isSanaOzel && (
        <div className="ai-panel-wrap">
          <AiSearchPanel ai={ai} onClose={() => setAiOpen(false)} />
        </div>
      )}

      {/* ── FİLTRE ÇUBUĞU ─────────────────────────────────────────────────── */}
      {!aiOpen && (isSanaOzel ? (
        <div className="filter-bar">
          <Dropdown
            label="İçerik"
            value={mediaType === 'all' ? null : mediaType}
            onChange={v => setMediaType(v || 'all')}
            options={[{ value: 'dizi', label: 'Dizi' }, { value: 'film', label: 'Film' }]}
            minWidth={104}
          />
        </div>
      ) : (
        <FilterBar
          genres={selectedGenres} onGenresChange={setSelectedGenres}
          yearBuckets={yearBuckets} selectedYears={activeYearKeys} onYearsChange={setSelectedYears}
          platforms={platformChips} platform={platform} onPlatformChange={setPlatform}
          sortOptions={SORT_OPTIONS} sortBy={sortBy} onSortChange={setSortBy}
          mediaType={mediaType} onMediaTypeChange={tab === 'trend' ? setMediaType : undefined}
          trOnly={trOnly} onTrOnlyChange={setTrOnly} enriching={enriching[dk]}
          shownCount={visibleFiltered.length} totalCount={filtered.length}
          hasActiveFilter={hasActiveFilter} onClear={clearFilters}
        />
      ))}

      {/* ── ANA İÇERİK ────────────────────────────────────────────────────── */}
      <main className="app-main">

       {isSanaOzel ? (
        <>
          <h2 className="section-title">
            ⭐ Favorilerim
            <span className="section-count">
              ({favoritesFiltered.length}{mediaType !== 'all' ? ` / ${favorites.length}` : ''})
            </span>
          </h2>

          {favorites.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⭐</div>
              <p className="empty-title">Henüz favori eklemediniz</p>
              <p className="empty-sub">
                Kartlardaki ⭐ simgesine dokunarak beğendiklerinizi işaretleyin — size özel öneriler burada çıkar.
              </p>
            </div>
          ) : favoritesFiltered.length === 0 ? (
            <p className="muted-note">Bu filtreye uygun favori yok.</p>
          ) : (
            <div className="grid-cards">
              {favoritesFiltered.map((item, i) => (
                <div key={`fav-${item.key}`} className="card-enter"
                  style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}>
                  <ContentCard item={item} isTrend={false} />
                </div>
              ))}
            </div>
          )}

          {favorites.length > 0 && (
            <>
              <h2 className="section-title section-title-gap">
                ✨ Sana Özel Öneriler
                {recLoading && <RefreshCw size={12} className="spin" />}
              </h2>

              {recLoading && recommendations.length === 0 && <SkeletonGrid count={6} />}

              {!recLoading && recommendations.length === 0 && (
                <p className="muted-note">
                  {recError || 'Favorilerinize uygun yeni öneri bulunamadı. Daha fazla içerik favorileyin.'}
                </p>
              )}

              {recommendations.length > 0 && recommendationsFiltered.length === 0 && (
                <p className="muted-note">Bu filtreye uygun öneri yok.</p>
              )}

              {recommendationsFiltered.length > 0 && (
                <div className="grid-cards">
                  {recommendationsFiltered.map((item, i) => (
                    <div key={`rec-${item._tmdbId || item.title}-${i}`} className="card-enter"
                      style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}>
                      <ContentCard item={item} isTrend={false} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
       ) : aiOpen ? null : (
        <>
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
            <div className="rails-divider">
              <h2 className="rails-divider-title">
                Tüm {countryAdjective(country)} {tab === 'filmler' ? 'Filmleri' : 'Dizileri'}
              </h2>
            </div>
          </div>
        )}
        {showRails && railsLoading && rails.length === 0 && (
          <p className="muted-note">Raflar hazırlanıyor…</p>
        )}

        {/* Hata bandı */}
        {error[dk] && !loading[dk] && (
          <div className="error-band">
            <div>
              <p className="error-title">⚠ Veri yüklenirken hata oluştu</p>
              <p className="error-sub">İçerik sunucusundan yüklenemedi. Lütfen tekrar deneyin.</p>
            </div>
            <button className="error-retry" onClick={() => retry(dk)}>
              <RefreshCw size={12} /> Yeniden Dene
            </button>
          </div>
        )}

        {loading[dk] && <SkeletonGrid count={8} />}

        {/* Boş durum */}
        {!loading[dk] && filtered.length === 0 && !error[dk] && (
          <div className="empty-state">
            <div className="empty-icon">
              {tab === 'trend' ? '🔥' : tab === 'filmler' ? '🎬' : '📺'}
            </div>
            {data[dk].length === 0 ? (
              <p className="empty-title">Yükleniyor…</p>
            ) : (
              <>
                <p className="empty-title">Seçilen filtrelere uygun içerik bulunamadı</p>
                <button className="btn-accent" onClick={clearFilters}>Filtreleri Temizle</button>
              </>
            )}
          </div>
        )}

        {/* İçerik ızgarası */}
        {!loading[dk] && visibleFiltered.length > 0 && (
          <div className="grid-cards">
            {visibleFiltered.map((item, i) => (
              <div key={`${dk}-${item.title}-${i}`} className="card-enter"
                style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}>
                <ContentCard item={item} isTrend={tab === 'trend'} />
              </div>
            ))}
          </div>
        )}

        {/* Daha çok göster */}
        {!loading[dk] && visibleFiltered.length > 0 && canShowMore && (
          <div className="more-wrap">
            <button className="btn-accent" onClick={() => showMore(dk)} disabled={loadingMore[dk]}>
              {loadingMore[dk]
                ? <><Loader size={13} className="spin" /> Yükleniyor…</>
                : <><ChevronDown size={13} /> Daha Çok Göster</>
              }
            </button>
            <p className="more-note">
              {visibleFiltered.length} / {filtered.length} gösteriliyor · en fazla {contentCap} içerik
            </p>
          </div>
        )}

        {!loading[dk] && !hasMore[dk] && data[dk].length >= contentCap && (
          <p className="more-note more-note-center">
            Tüm içerikler yüklendi · {data[dk].length} içerik
          </p>
        )}
        </>
       )}
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <div className="footer-top">
          <span className="brand-name footer-brand">STREAMTR</span>
          <span className="footer-src">Veriler: TMDB · IMDB · Rotten Tomatoes</span>
        </div>
        <p className="footer-legal">
          Bu sitede yer alan bilgiler kişisel eğitim amaçlı AI ile tasarlanmış olup ticari bir amacı yoktur.
          <br />
          Özgür Seyrek - <a href="mailto:seyrek@gmail.com">seyrek@gmail.com</a>
        </p>
      </footer>
    </div>
  )
}
