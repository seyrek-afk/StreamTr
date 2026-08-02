import { useRef, useEffect } from 'react'
import { Search, X, Loader, ChevronRight, RefreshCw } from 'lucide-react'
import ContentCard from './ContentCard.jsx'
import { shouldShowOriginal } from '../lib/searchMatch.js'

export default function SearchBar({ search }) {
  const {
    query, suggestions, suggesting, correctedFrom,
    selectedItem, detailLoading, detailError,
    handleQueryChange, selectSuggestion, retryDetail, clearSearch,
    clearSuggestions, noApiKey,
  } = search

  const inputRef    = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current    && !inputRef.current.contains(e.target)
      ) {
        clearSuggestions()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clearSuggestions])

  const showSuggestions = suggestions.length > 0 && !detailLoading && !selectedItem
  const showSpinner     = suggesting || detailLoading

  return (
    <section className="searchbar">
      {/* Başlık etiketi ("FİLM / DİZİ ARA") kaldırıldı: yer tutucu metin zaten ne
          yapılacağını söylüyor, etiket yalnız dikey yer kaplıyordu. */}

      {/* API anahtarı yoksa uyarı */}
      {noApiKey && (
        <div style={{
          marginBottom: 8,
          background: 'rgba(255,180,0,0.07)',
          border: '1px solid rgba(255,180,0,0.25)',
          borderRadius: 8, padding: '8px 12px',
          color: 'rgba(255,200,60,0.85)', fontSize: 10.5,
        }}>
          ⚠ TMDB API anahtarı eksik. <code style={{ fontSize: 10 }}>.env</code> dosyasına{' '}
          <code style={{ fontSize: 10 }}>VITE_TMDB_KEY=&lt;anahtarın&gt;</code> ekle.
          Ücretsiz anahtar:{' '}
          <strong>themoviedb.org → Ayarlar → API</strong>
        </div>
      )}

      {/* Arama kutusu */}
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${query ? 'rgba(var(--accent-rgb),0.4)' : 'var(--border)'}`,
          borderRadius: 10, overflow: 'visible',
          transition: 'border-color 0.15s',
        }}>
          <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {showSpinner
              ? <Loader size={14} color="var(--accent)" className="spin" />
              : <Search size={14} color="var(--text-faint)" />
            }
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            maxLength={200}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Film veya dizi adı yaz… (Ör: Inception, Breaking Bad)"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 12.5, padding: '10px 0',
              fontFamily: 'inherit',
            }}
          />

          {query && (
            <button
              onClick={clearSearch}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0 10px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Yazım hatası kurtarma bildirimi — sessizce başka bir şey aramak yerine
            ne yaptığımızı söyler. */}
        {correctedFrom && showSuggestions && (
          <p className="searchbar-note">
            "{query}" için sonuç yok — <strong style={{ color: 'var(--text-muted)' }}>
            "{correctedFrom}"</strong> sonuçları gösteriliyor.
          </p>
        )}

        {/* Öneri Açılır Listesi */}
        {showSuggestions && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: '#18182a',
              border: '1px solid rgba(var(--accent-rgb),0.25)',
              borderRadius: 10, overflow: 'hidden',
              zIndex: 100,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {suggestions.map((s, i) => (
              <button
                key={s.id}
                onClick={() => selectSuggestion(s)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  padding: '9px 14px', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  color: 'var(--text)',
                  transition: 'background 0.1s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Search size={10} color="var(--text-faint)" style={{ flexShrink: 0 }} />
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
                    <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.title}
                    </span>
                    {/* Orijinal ad — TMDB tr-TR'de "Inception"ı "Başlangıç" olarak
                        döndürür; yalnız yerelleştirilmiş adı göstermek kullanıcının
                        aradığı yapımı tanımasını engelliyordu. */}
                    {shouldShowOriginal(s.title, s.originalTitle) && (
                      <span style={{
                        fontSize: 9.5, color: 'var(--text-faint)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{s.originalTitle}</span>
                    )}
                  </span>
                  {s.year && (
                    <span style={{ fontSize: 9.5, color: 'var(--text-faint)', flexShrink: 0 }}>{s.year}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 8.5, fontWeight: 700,
                    color: s.mediaType === 'movie' ? 'rgba(229,9,20,0.8)' : 'rgba(0,168,224,0.8)',
                    background: s.mediaType === 'movie' ? 'rgba(229,9,20,0.1)' : 'rgba(0,168,224,0.1)',
                    border: `1px solid ${s.mediaType === 'movie' ? 'rgba(229,9,20,0.2)' : 'rgba(0,168,224,0.2)'}`,
                    borderRadius: 3, padding: '1px 5px',
                  }}>
                    {s.mediaType === 'movie' ? 'FİLM' : 'DİZİ'}
                  </span>
                  <ChevronRight size={11} color="var(--text-faint)" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Yükleniyor */}
      {detailLoading && (
        <div style={{
          marginTop: 12, textAlign: 'center',
          color: 'var(--text-faint)', fontSize: 11.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
          <Loader size={12} color="var(--accent)" className="spin" />
          "{query}" detayları yükleniyor…
        </div>
      )}

      {/* Hata */}
      {detailError && !detailLoading && (
        <div style={{
          marginTop: 10,
          background: 'rgba(229,9,20,0.07)',
          border: '1px solid rgba(229,9,20,0.2)',
          borderRadius: 8, padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span style={{ color: 'rgba(255,120,120,0.85)', fontSize: 11.5 }}>⚠ {detailError}</span>
          <button
            onClick={retryDetail}
            style={{
              background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.3)',
              borderRadius: 6, padding: '4px 10px', color: '#ff7070',
              fontSize: 10.5, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <RefreshCw size={10} /> Tekrar Dene
          </button>
        </div>
      )}

      {/* Seçilen Detay Kartı */}
      {selectedItem && !detailLoading && (
        <div style={{ marginTop: 12 }} className="card-enter">
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              background: 'rgba(var(--accent-rgb),0.12)',
              border: '1px solid rgba(var(--accent-rgb),0.3)',
              borderRadius: 5, padding: '2px 8px',
              color: 'var(--accent)', fontSize: 9.5, fontWeight: 700,
            }}>ARAMA SONUCU</span>
            <span style={{ color: 'var(--text-faint)', fontSize: 9.5 }}>{query}</span>
          </div>
          <ContentCard item={selectedItem} isTrend={false} />
        </div>
      )}
    </section>
  )
}
