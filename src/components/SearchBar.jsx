import { useRef, useEffect } from 'react'
import { Search, X, Loader, AlertTriangle, RefreshCw } from 'lucide-react'
import ContentCard from './ContentCard.jsx'
import { shouldShowOriginal } from '../lib/searchMatch.js'

// Arama iki parçaya bölündü:
//   SearchField  → araç rayında yaşayan kontrol (kutu + öneri listesi)
//   SearchResult → içerik alanında yaşayan çıktı (uyarı, yükleniyor, hata, kart)
//
// Neden? Eskiden ikisi tek bileşendeydi ve arama kendi tam genişlikte bandını
// açmak zorundaydı. Kontrolü rayla, sonucu içerikle birleştirince başlıktan bir
// bant tamamen kalktı ve her parça ait olduğu katmana yerleşti.

export function SearchField({ search }) {
  const {
    query, suggestions, suggesting, correctedFrom,
    selectedItem, detailLoading,
    handleQueryChange, selectSuggestion, clearSearch, clearSuggestions,
  } = search

  const wrapRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) clearSuggestions()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clearSuggestions])

  const showSuggestions = suggestions.length > 0 && !detailLoading && !selectedItem
  const busy = suggesting || detailLoading

  return (
    <div className={`search-field${query ? ' search-field-on' : ''}`} ref={wrapRef}>
      <span className="search-icon">
        {busy
          ? <Loader size={16} color="var(--accent-ink)" className="spin" aria-hidden="true" />
          : <Search size={16} color="var(--text-faint)" aria-hidden="true" />}
      </span>

      <input
        className="search-input"
        type="search"
        value={query}
        maxLength={200}
        aria-label="Film veya dizi ara"
        onChange={e => handleQueryChange(e.target.value)}
        placeholder="Film veya dizi ara…"
      />

      {query && (
        <button className="icon-btn" onClick={clearSearch} aria-label="Aramayı temizle">
          <X size={15} aria-hidden="true" />
        </button>
      )}

      {showSuggestions && (
        <div className="search-menu" role="listbox">
          {/* Yazım hatası kurtarma: sessizce başka bir şey aramak yerine ne
              yaptığımızı söyler. Kutunun altında ayrı bir satır değil, listenin
              başlığı — araç rayının yüksekliğini bozmasın. */}
          {correctedFrom && (
            <p className="search-correction">
              “{query}” için sonuç yok. <b>“{correctedFrom}”</b> sonuçları gösteriliyor.
            </p>
          )}
          {suggestions.map(s => (
            <button
              key={s.id}
              role="option"
              aria-selected={false}
              className="search-suggest-item"
              onClick={() => selectSuggestion(s)}
            >
              <span className="search-suggest-main">
                <span className="search-suggest-title">{s.title}</span>
                {/* Orijinal ad — TMDB tr-TR'de "Inception"ı "Başlangıç" olarak
                    döndürür; yalnız yerelleştirilmiş adı göstermek kullanıcının
                    aradığı yapımı tanımasını engelliyordu. */}
                {shouldShowOriginal(s.title, s.originalTitle) && (
                  <span className="search-suggest-orig">{s.originalTitle}</span>
                )}
              </span>
              <span className="search-suggest-year">
                {s.mediaType === 'movie' ? 'Film' : 'Dizi'}{s.year ? ` · ${s.year}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SearchResult({ search }) {
  const { query, selectedItem, detailLoading, detailError, retryDetail, noApiKey } = search

  return (
    <>
      {noApiKey && (
        <div className="band">
          <div className="band-row">
            <AlertTriangle size={18} className="band-icon" aria-hidden="true" />
            <div>
              <p className="band-title">TMDB anahtarı tanımlı değil</p>
              <p className="band-sub">
                Arama ve detaylar için <code>.env</code> dosyasına <code>VITE_TMDB_KEY</code> ekle.
                Ücretsiz anahtar: themoviedb.org → Ayarlar → API.
              </p>
            </div>
          </div>
        </div>
      )}

      {detailLoading && (
        <p className="muted-note" style={{ textAlign: 'center' }}>
          <Loader size={14} className="spin" aria-hidden="true" /> “{query}” yükleniyor…
        </p>
      )}

      {detailError && !detailLoading && (
        <div className="band band-danger">
          <div className="band-row">
            <AlertTriangle size={18} className="band-icon" aria-hidden="true" />
            <p className="band-title">{detailError}</p>
          </div>
          <button className="btn btn-quiet" onClick={retryDetail}>
            <RefreshCw size={14} aria-hidden="true" /> Yeniden dene
          </button>
        </div>
      )}

      {selectedItem && !detailLoading && (
        <section className="enter" style={{ marginBottom: 'var(--section-gap)' }}>
          <div className="grid-head">
            <h2 className="grid-title">Arama sonucu</h2>
            <span className="grid-count">{query}</span>
          </div>
          <div className="grid-cards">
            <ContentCard item={selectedItem} isTrend={false} />
          </div>
        </section>
      )}
    </>
  )
}
