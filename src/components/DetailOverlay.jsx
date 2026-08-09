import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Star, User, X, Film } from 'lucide-react'
import { ALL_PLATFORMS } from '../constants/index.js'
import { isValidTmdbRef, mapTrProviders } from '../lib/tmdb.js'
import { badgeInk } from '../lib/cards.js'
import FavoriteButton from './FavoriteButton.jsx'
import TrailerEmbed from './TrailerEmbed.jsx'

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY
// Küresel + yerli tüm sağlayıcılar (bkz. ContentCard'daki aynı gerekçe).
const PLAT_MAP = Object.fromEntries(ALL_PLATFORMS.map(p => [p.id, p]))

// Overlay oyuncu kartı — ContentCard'daki `.actor` ile aynı sınıfları kullanır:
// aynı bilgi iki ekranda iki farklı boyda görünmesin.
function OverlayActorCard({ actor }) {
  const [err, setErr] = useState(false)
  return (
    <div className="actor">
      <span className="actor-photo">
        {actor.profilePath && !err
          ? <img src={`https://image.tmdb.org/t/p/w185${actor.profilePath}`} alt="" loading="lazy"
              onError={() => setErr(true)} />
          : <User size={20} aria-hidden="true" />}
      </span>
      <span className="actor-name">{actor.name}</span>
      {actor.character && <span className="actor-role">{actor.character}</span>}
    </div>
  )
}

export default function DetailOverlay({ item, onClose }) {
  const [detail, setDetail]               = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [trailerKey, setTrailerKey]       = useState(null)
  const [watchPlatforms, setWatchPlatforms] = useState(null)
  const [posterErr, setPosterErr]         = useState(false)

  // Body scroll kilidi
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ESC ile kapat
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  // Detay + platformları çek
  useEffect(() => {
    if (!isValidTmdbRef(item?.tmdbId, item?.mediaType) || !TMDB_KEY) {
      setError('Detay yüklenemedi.')
      setLoading(false)
      return
    }
    const ctrl = new AbortController()

    Promise.all([
      fetch(
        `https://api.themoviedb.org/3/${item.mediaType}/${item.tmdbId}` +
        `?language=tr-TR&append_to_response=credits&api_key=${TMDB_KEY}`,
        { signal: ctrl.signal }
      ).then(r => { if (!r.ok) throw new Error(`TMDB ${r.status}`); return r.json() }),

      // Fragman + yorumlar en-US ile (tr-TR çoğunlukla boş döner)
      fetch(
        `https://api.themoviedb.org/3/${item.mediaType}/${item.tmdbId}` +
        `?language=en-US&append_to_response=videos,reviews&api_key=${TMDB_KEY}`,
        { signal: ctrl.signal }
      ).then(r => (r.ok ? r.json() : {})).catch(() => ({})),

      fetch(
        `https://api.themoviedb.org/3/${item.mediaType}/${item.tmdbId}/watch/providers?api_key=${TMDB_KEY}`,
        { signal: ctrl.signal }
      ).then(r => r.json()).catch(() => ({})),
    ])
      .then(([json, en, wp]) => {
        const isMovie = item.mediaType === 'movie'

        // Trailer — validate key format before trusting API response
        const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/
        const trailer = (en.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube')
          || (en.videos?.results || []).find(v => v.site === 'YouTube')
        if (trailer?.key && YOUTUBE_ID_RE.test(trailer.key)) setTrailerKey(trailer.key)

        // Watch providers
        setWatchPlatforms(mapTrProviders(wp))

        setDetail({
          title:       isMovie ? json.title : json.name,
          description: json.overview,
          posterPath:  json.poster_path,
          year:        (isMovie ? json.release_date : json.first_air_date)?.slice(0, 4),
          imdbScore:   json.vote_average ? Number(json.vote_average.toFixed(1)) : null,
          duration:    isMovie ? json.runtime : null,
          cast:        (json.credits?.cast || []).slice(0, 8).map(c => ({
            name: c.name, character: c.character, profilePath: c.profile_path,
          })),
          reviews:     (en.reviews?.results || []).slice(0, 3).map(r => ({
            source: 'TMDB', author: r.author,
            quote: (r.content || '').slice(0, 220) + ((r.content?.length || 0) > 220 ? '…' : ''),
          })),
        })
      })
      .catch(e => { if (e.name !== 'AbortError') setError('Detay yüklenemedi.') })
      .finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [item?.tmdbId, item?.mediaType])

  const overlay = (
    <div className="modal-scrim modal-scrim-top" onClick={onClose}>
      <div
        className="modal modal-detail"
        role="dialog" aria-modal="true" aria-label={item?.title || 'Detay'}
        onClick={e => e.stopPropagation()}
      >
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Kapat">
          <X size={18} aria-hidden="true" />
        </button>

        {loading && <p className="muted-note" style={{ textAlign: 'center' }}>Yükleniyor…</p>}

        {error && <p className="muted-note" style={{ textAlign: 'center', color: 'var(--danger-ink)' }}>{error}</p>}

        {detail && (
          <>
            <div className="cc-lead">
              <div className="cc-lead-poster">
                {detail.posterPath && !posterErr ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w300${detail.posterPath}`}
                    alt=""
                    onError={() => setPosterErr(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div className="poster-fallback" style={{ background: 'var(--surface)' }}>
                    <Film size={22} aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="cc-lead-body">
                <h3 className="modal-title" style={{ paddingRight: 32 }}>{detail.title}</h3>

                <div className="cc-scores">
                  {detail.imdbScore && (
                    <span className="cc-imdb tnum">
                      <Star size={14} fill="currentColor" aria-hidden="true" />
                      {detail.imdbScore}<span className="cc-imdb-max">/10</span>
                    </span>
                  )}
                  {detail.year && <span className="cc-alt tnum">{detail.year}</span>}
                  {detail.duration && <span className="cc-alt tnum">{detail.duration} dk</span>}
                </div>

                {detail.description && <p className="cc-desc">{detail.description}</p>}

                <div className="cc-tags">
                  <TrailerEmbed trailerKey={trailerKey} compact />
                  <FavoriteButton item={item} size={18} />
                </div>
              </div>
            </div>

            {watchPlatforms !== null && (
              <div className="cc-sec">
                <p className="cc-sec-title">Türkiye'de izle</p>
                {watchPlatforms.length > 0 ? (
                  <div className="cc-tags">
                    {watchPlatforms.map(pid => {
                      const plat = PLAT_MAP[pid]
                      return (
                        <span key={pid} className="cc-plat-full" style={{
                          background: plat ? plat.color + '26' : 'var(--surface)',
                          border: `1px solid ${plat ? plat.color + '66' : 'var(--border-strong)'}`,
                        }}>
                          {plat && <b style={{ background: plat.color, color: badgeInk(plat.color) }}>{plat.badge}</b>}
                          {plat ? plat.label : pid}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <span className="cc-desc-alt">Türkiye'de yayın bilgisi bulunamadı.</span>
                )}
              </div>
            )}

            {detail.cast.length > 0 && (
              <div className="cc-sec">
                <p className="cc-sec-title">Oyuncular</p>
                <div className="cc-strip">
                  {detail.cast.map((actor, i) => <OverlayActorCard key={i} actor={actor} />)}
                </div>
              </div>
            )}

            {detail.reviews.length > 0 && (
              <div className="cc-sec cc-sec-end">
                <p className="cc-sec-title">Öne çıkan yorumlar</p>
                <div className="cc-reviews">
                  {detail.reviews.map((r, i) => (
                    <div key={i} className="review">
                      <q>{r.quote}</q>
                      <div className="review-src">
                        <b>{r.source}</b>
                        {r.author && <span>{r.author}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
