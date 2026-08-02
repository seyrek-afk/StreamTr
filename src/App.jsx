import { useState, useEffect } from 'react'
import { RefreshCw, X, ChevronDown, Loader } from 'lucide-react'
import { PLATFORMS, TABS } from './constants/index.js'
import { useStreamData } from './hooks/useStreamData.js'
import { useSearch }     from './hooks/useSearch.js'
import { useRecommendations } from './hooks/useRecommendations.js'
import { useFavorites } from './contexts/FavoritesContext.jsx'
import ContentCard  from './components/ContentCard.jsx'
import GenreFilter  from './components/GenreFilter.jsx'
import MediaTypeFilter from './components/MediaTypeFilter.jsx'
import SkeletonGrid from './components/SkeletonGrid.jsx'
import ThemePicker  from './components/ThemePicker.jsx'
import SearchBar    from './components/SearchBar.jsx'
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

export default function App() {
  const [tab,             setTab]            = useState('diziler')
  const [selectedGenres,  setSelectedGenres] = useState([])
  const [platform,        setPlatform]       = useState('Tümü')
  const [sortBy,          setSortBy]         = useState('default')
  const [trOnly,          setTrOnly]         = useState(false)
  const [sortOpen,        setSortOpen]       = useState(false)
  const [selectedYears,   setSelectedYears]  = useState([])  // seçili yıl-grubu key'leri (çoklu)
  const [mediaType,       setMediaType]      = useState('all') // 'all' | 'dizi' | 'film' (trend + sana özel)

  const {
    data, loading, loadingMore, error,
    visible, hasMore, enriching,
    fetchTab, showMore, retry,
  } = useStreamData()

  const search = useSearch()

  const { favorites } = useFavorites()
  const { recommendations, loading: recLoading, error: recError } = useRecommendations(favorites)
  const isSanaOzel = tab === 'sanaozel'

  useEffect(() => { if (tab !== 'sanaozel') fetchTab(tab) }, [tab])

  // Sekme değişiminde sosyal sıralama sadece trend'de geçerlidir
  useEffect(() => {
    if (tab !== 'trend' && sortBy === 'social') setSortBy('default')
  }, [tab, sortBy])

  // Dışarı tıklanınca sıralama menüsünü kapat
  useEffect(() => {
    if (!sortOpen) return
    const handler = () => setSortOpen(false)
    document.addEventListener('click', handler, { capture: true, once: true })
    return () => document.removeEventListener('click', handler, { capture: true })
  }, [sortOpen])

  const toggleGenre  = (g) =>
    setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  const toggleYear   = (key) =>
    setSelectedYears(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  const clearFilters = () => {
    setSelectedGenres([])
    setPlatform('Tümü')
    setTrOnly(false)
    setSortBy('default')
    setSelectedYears([])
    setMediaType('all')
  }
  const hasActiveFilter = selectedGenres.length > 0 || platform !== 'Tümü' || trOnly || sortBy !== 'default' || selectedYears.length > 0 || mediaType !== 'all'

  const effectiveSortBy = (sortBy === 'social' && tab !== 'trend') ? 'default' : sortBy

  // Yıl filtresi grupları — geçerli sekmenin verisinden dinamik üretilir (çoklu seçim).
  // (mock yıl=number, TMDB yıl=string olabilir; Number() ile kıyaslanır)
  const availableYears = [...new Set((data[tab] || []).map(i => i.year).filter(Boolean))]
  const yearBuckets = buildYearBuckets(availableYears)
  // Sekme/veri değişince geçersiz kalan grup seçimlerini ayıkla
  const activeYearKeys = selectedYears.filter(k => yearBuckets.some(b => b.key === k))

  // Dizi/Film filtresi — tip bilgisi olmayan öğe (eski favori vb.) her seçimde geçer
  const mediaOk = (item) => mediaType === 'all' || !item.type || item.type === mediaType

  // Sana Özel sekmesi: favoriler + öneriler aynı dizi/film filtresinden geçer
  const favoritesFiltered       = favorites.filter(mediaOk)
  const recommendationsFiltered = recommendations.filter(mediaOk)

  const filtered = [...(data[tab] || [])].filter(item => {
    // İçerik tipi yalnız trend'de karışıktır; diziler/filmler sekmeleri tek tiptir
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
    // default: trend → socialScore, diğer → imdbScore
    return tab === 'trend'
      ? (b.socialScore || 0) - (a.socialScore || 0)
      : (b.imdbScore   || 0) - (a.imdbScore   || 0)
  })

  const SORT_OPTIONS = [
    { value: 'default', label: tab === 'trend' ? 'Varsayılan (Sosyal)' : 'Varsayılan (IMDB)' },
    { value: 'imdb',    label: 'IMDB Puanı' },
    { value: 'year',    label: 'Yıl (en yeni)' },
    ...(tab === 'trend' ? [{ value: 'social', label: 'Sosyal etki' }] : []),
  ]

  const visibleFiltered = filtered.slice(0, visible[tab])
  const canShowMore = visibleFiltered.length < filtered.length ||
    (hasMore[tab] && filtered.length <= visible[tab])
  // Diziler/filmler 250'ye kadar; sosyal trend ~100 ile sınırlı (haftalık trend 5 sayfa)
  const contentCap = tab === 'trend' ? 100 : 250

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');`}</style>

      {/* ── STICKY HEADER ─────────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--bg-header)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        position: 'sticky', top: 0, zIndex: 60,
      }}>
        {/* Logo + tema (tema sağ üst köşede, platformlardan ayrı bir görünüm kontrolü) */}
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 28, letterSpacing: '0.06em',
                background: 'var(--logo-grad)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>StreamTR</span>
              <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', fontWeight: 600 }}>TÜRKİYE</span>
            </div>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', fontWeight: 500, marginTop: 1 }}>
              IMDB · Rotten Tomatoes · Sosyal Medya
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <AccountButton />
            <ThemePicker />
          </div>
        </div>

        {/* Platform filtre satırı — tema kontrolünden ayrı, kendi satırında */}
        <div style={{ padding: '12px 20px 0', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9.5, color: 'var(--text-faint)', letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase', marginRight: 2 }}>
            Platform
          </span>
          {[{ id: 'Tümü', label: 'Tümü', color: '#444' }, ...PLATFORMS].map(p => {
            const active = platform === p.id
            return (
              <button key={p.id} onClick={() => setPlatform(p.id)} style={{
                background: active && p.id !== 'Tümü' ? p.color : active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? (p.color !== '#444' ? p.color + '99' : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 6, padding: '4px 10px',
                color: '#fff', fontSize: 10.5, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.02em',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}>{p.label}</button>
            )
          })}
        </div>

        {/* Tab satırı */}
        <div style={{ display: 'flex', padding: '0 20px', marginTop: 10, gap: 2 }}>
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${active ? 'var(--tab-active)' : 'transparent'}`,
                color: active ? 'var(--tab-active)' : 'rgba(255,255,255,0.42)',
                padding: '8px 16px 10px', fontSize: 12.5,
                fontWeight: active ? 700 : 500, cursor: 'pointer',
                transition: 'all 0.15s', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
                marginBottom: -1, whiteSpace: 'nowrap',
              }}>
                <span>{t.emoji}</span> {t.label}
                {loading[t.id] && <RefreshCw size={11} className="spin" />}
              </button>
            )
          })}
        </div>
      </header>

      {/* ── TÜR FİLTRESİ ──────────────────────────────────────────────────── */}
      {!isSanaOzel && (
        <GenreFilter
          selectedGenres={selectedGenres}
          onToggle={toggleGenre}
          onClear={clearFilters}
          showClear={hasActiveFilter}
          yearBuckets={yearBuckets}
          selectedYears={activeYearKeys}
          onYearToggle={toggleYear}
          onYearClear={() => setSelectedYears([])}
          mediaType={mediaType}
          onMediaTypeChange={tab === 'trend' ? setMediaType : undefined}
        />
      )}

      {/* ── SANA ÖZEL: DİZİ/FİLM FİLTRESİ ─────────────────────────────────── */}
      {isSanaOzel && (
        <div style={{
          padding: '9px 20px',
          display: 'flex', gap: 5, overflowX: 'auto', alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.038)',
        }}>
          <MediaTypeFilter value={mediaType} onChange={setMediaType} />
        </div>
      )}

      {/* ── ARAMA ÇUBUĞU ──────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <SearchBar search={search} />
      </div>

      {/* ── ANA İÇERİK ────────────────────────────────────────────────────── */}
      <main style={{ padding: '12px 20px 60px' }}>

       {isSanaOzel ? (
        <>
          {/* ── FAVORİLERİM ──────────────────────────────────────────────── */}
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '4px 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            ⭐ Favorilerim <span style={{ color: 'var(--text-faint)', fontSize: 11, fontWeight: 500 }}>({favoritesFiltered.length}{mediaType !== 'all' ? ` / ${favorites.length}` : ''})</span>
          </h2>

          {favorites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-faint)' }}>
              <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.6 }}>⭐</div>
              <p style={{ fontSize: 13, marginBottom: 6 }}>Henüz favori eklemediniz</p>
              <p style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                Kartlardaki ⭐ simgesine dokunarak beğendiklerinizi işaretleyin — size özel öneriler burada çıkar.
              </p>
            </div>
          ) : favoritesFiltered.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', fontSize: 12, padding: '14px 0' }}>
              Bu filtreye uygun favori yok.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 13 }}>
              {favoritesFiltered.map((item, i) => (
                <div key={`fav-${item.key}`} className="card-enter"
                  style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}>
                  <ContentCard item={item} isTrend={false} />
                </div>
              ))}
            </div>
          )}

          {/* ── SANA ÖZEL ÖNERİLER ───────────────────────────────────────── */}
          {favorites.length > 0 && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                ✨ Sana Özel Öneriler
                {recLoading && <RefreshCw size={12} className="spin" />}
              </h2>

              {recLoading && recommendations.length === 0 && <SkeletonGrid count={6} />}

              {!recLoading && recommendations.length === 0 && (
                <p style={{ color: 'var(--text-faint)', fontSize: 12, padding: '20px 0' }}>
                  {recError || 'Favorilerinize uygun yeni öneri bulunamadı. Daha fazla içerik favorileyin.'}
                </p>
              )}

              {recommendations.length > 0 && recommendationsFiltered.length === 0 && (
                <p style={{ color: 'var(--text-faint)', fontSize: 12, padding: '14px 0' }}>
                  Bu filtreye uygun öneri yok.
                </p>
              )}

              {recommendationsFiltered.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 13 }}>
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
       ) : (
        <>
        {/* Aktif filtre özeti */}
        {!loading[tab] && data[tab].length > 0 && (
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-faint)', fontSize: 10.5 }}>
              {visibleFiltered.length} / {filtered.length} içerik
            </span>
            {selectedGenres.length > 0 && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {selectedGenres.map(g => (
                    <span key={g} style={{
                      background: 'rgba(var(--accent-rgb),0.1)',
                      border: '1px solid rgba(var(--accent-rgb),0.3)',
                      borderRadius: 10, padding: '1px 8px', fontSize: 10,
                      color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      {g}
                      <button onClick={(e) => { e.stopPropagation(); toggleGenre(g) }} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center',
                      }}><X size={9} /></button>
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Sıralama açılır menüsü */}
            <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSortOpen(o => !o)}
                aria-expanded={sortOpen}
                aria-haspopup="listbox"
                className="sort-trigger"
                style={{
                  background: sortBy !== 'default' ? 'rgba(var(--accent-rgb),0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${sortBy !== 'default' ? 'rgba(var(--accent-rgb),0.35)' : 'rgba(255,255,255,0.1)'}`,
                  color: sortBy !== 'default' ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                }}
              >
                {SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sıralama'}
                <ChevronDown
                  size={10}
                  className="sort-chevron"
                  style={{ transform: sortOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              {sortOpen && (
                <div
                  role="listbox"
                  className="sort-dropdown"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      role="option"
                      aria-selected={sortBy === opt.value}
                      onClick={() => { setSortBy(opt.value); setSortOpen(false) }}
                      className="sort-option"
                      style={{
                        fontWeight: sortBy === opt.value ? 700 : 400,
                        color: sortBy === opt.value ? 'var(--accent)' : 'var(--text-muted)',
                        background: sortBy === opt.value ? 'rgba(var(--accent-rgb),0.09)' : 'transparent',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* TR-yayın filtresi pill */}
            <button
              onClick={() => setTrOnly(v => !v)}
              aria-pressed={trOnly}
              className="tr-pill"
              style={{
                background: trOnly ? 'rgba(var(--accent-rgb),0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${trOnly ? 'rgba(var(--accent-rgb),0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: trOnly ? 'var(--accent)' : 'rgba(255,255,255,0.45)',
                fontWeight: trOnly ? 700 : 500,
              }}
            >
              🇹🇷 Türkiye'de yayın bilgisi bulunanlar
            </button>

            {/* Enrichment yükleme ipucu */}
            {trOnly && enriching[tab] && (
              <span className="enrichment-hint">
                <Loader size={9} className="spin" /> yayın bilgileri yükleniyor…
              </span>
            )}
          </div>
        )}

        {/* Hata bandı */}
        {error[tab] && !loading[tab] && (
          <div style={{
            background: 'rgba(229,9,20,0.08)', border: '1px solid rgba(229,9,20,0.2)',
            borderRadius: 10, padding: '16px 20px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div>
              <p style={{ color: 'rgba(255,120,120,0.9)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                ⚠ Veri yüklenirken hata oluştu
              </p>
              <p style={{ color: 'rgba(255,100,100,0.55)', fontSize: 10.5, fontFamily: 'monospace' }}>
                İçerik sunucusundan yüklenemedi. Lütfen tekrar deneyin.
              </p>
            </div>
            <button onClick={() => retry(tab)} style={{
              background: 'rgba(229,9,20,0.15)', border: '1px solid rgba(229,9,20,0.35)',
              borderRadius: 7, padding: '7px 16px', color: '#ff7070',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <RefreshCw size={12} /> Yeniden Dene
            </button>
          </div>
        )}

        {/* Yükleme iskeletleri */}
        {loading[tab] && <SkeletonGrid count={8} />}

        {/* Boş durum */}
        {!loading[tab] && filtered.length === 0 && !error[tab] && (
          <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--text-faint)' }}>
            <div style={{ fontSize: 48, marginBottom: 14, opacity: 0.6 }}>
              {tab === 'trend' ? '🔥' : tab === 'filmler' ? '🎬' : '📺'}
            </div>
            {data[tab].length === 0 ? (
              <p style={{ fontSize: 13 }}>Yükleniyor…</p>
            ) : (
              <>
                <p style={{ fontSize: 13, marginBottom: 12 }}>
                  Seçilen filtrelere uygun içerik bulunamadı
                </p>
                <button onClick={clearFilters} style={{
                  background: 'rgba(var(--accent-rgb),0.1)',
                  border: '1px solid rgba(var(--accent-rgb),0.3)',
                  borderRadius: 8, padding: '7px 18px', color: 'var(--accent)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}>Filtreleri Temizle</button>
              </>
            )}
          </div>
        )}

        {/* İçerik ızgarası */}
        {!loading[tab] && visibleFiltered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 13 }}>
            {visibleFiltered.map((item, i) => (
              <div key={`${tab}-${item.title}-${i}`} className="card-enter"
                style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}>
                <ContentCard item={item} isTrend={tab === 'trend'} />
              </div>
            ))}
          </div>
        )}

        {/* ── DAHA ÇOK GÖSTER ────────────────────────────────────────────── */}
        {!loading[tab] && visibleFiltered.length > 0 && canShowMore && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button
              onClick={() => showMore(tab)}
              disabled={loadingMore[tab]}
              style={{
                background: 'rgba(var(--accent-rgb),0.08)',
                border: `1px solid rgba(var(--accent-rgb),0.3)`,
                borderRadius: 10, padding: '10px 28px',
                color: 'var(--accent)', fontSize: 12.5, fontWeight: 600,
                cursor: loadingMore[tab] ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                transition: 'all 0.15s', opacity: loadingMore[tab] ? 0.6 : 1,
              }}
            >
              {loadingMore[tab]
                ? <><Loader size={13} className="spin" /> Yükleniyor…</>
                : <><ChevronDown size={13} /> Daha Çok Göster</>
              }
            </button>
            <p style={{ color: 'var(--text-faint)', fontSize: 9.5, marginTop: 6 }}>
              {visibleFiltered.length} / {filtered.length} gösteriliyor · en fazla {contentCap} içerik
            </p>
          </div>
        )}

        {/* Limit bilgisi */}
        {!loading[tab] && !hasMore[tab] && data[tab].length >= contentCap && (
          <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 10, marginTop: 20 }}>
            Tüm içerikler yüklendi · {data[tab].length} içerik
          </p>
        )}
        </>
       )}
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '16px 20px 24px',
        display: 'flex', flexDirection: 'column', gap: 14,
        background: 'rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 12, letterSpacing: '0.06em',
            background: 'var(--logo-grad)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            STREAMTR
          </span>
          <span style={{ color: 'rgba(255,255,255,0.14)', fontSize: 9 }}>
            Veriler: IMDB · Rotten Tomatoes · Sosyal medya · Web arama
          </span>
        </div>

        {/* Yasal uyarı / disclaimer */}
        <p style={{
          textAlign: 'center', margin: 0,
          color: 'var(--text-faint)', fontSize: 10.5, lineHeight: 1.65,
          maxWidth: 680, marginLeft: 'auto', marginRight: 'auto',
          borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 14,
        }}>
          Bu sitede yer alan bilgiler kişisel eğitim amaçlı AI ile tasarlanmış olup ticari bir amacı yoktur.
          <br />
          Özgür Seyrek - <a href="mailto:seyrek@gmail.com" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>seyrek@gmail.com</a>
        </p>
      </footer>
    </div>
  )
}
