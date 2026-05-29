import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Star, User, X } from 'lucide-react'
import { PLATFORMS } from '../constants/index.js'

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY
const PLAT_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]))

const PROVIDER_MAP = {
  8: 'Netflix', 119: 'Amazon Prime', 337: 'Disney+', 350: 'Apple TV+',
  1899: 'HBO Max', 384: 'HBO Max', 11: 'Mubi', 341: 'BluTV',
  479: 'PUHUTV', 531: 'Paramount+', 533: 'Gain', 584: 'TOD',
}

function OverlayActorCard({ actor }) {
  const [err, setErr] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 60, flexShrink: 0 }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
        border: '1.5px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {actor.profilePath && !err
          ? <img src={`https://image.tmdb.org/t/p/w185${actor.profilePath}`} alt={actor.name}
              onError={() => setErr(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <User size={20} color="rgba(255,255,255,0.3)" />}
      </div>
      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 8, textAlign: 'center', lineHeight: 1.25, maxWidth: 58, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{actor.name}</span>
      {actor.character && (
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 7, fontStyle: 'italic', maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{actor.character}</span>
      )}
    </div>
  )
}

export default function DetailOverlay({ item, onClose }) {
  const [detail, setDetail]               = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [trailerKey, setTrailerKey]       = useState(null)
  const [watchPlatforms, setWatchPlatforms] = useState(null)

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
    if (!item?.tmdbId || !item?.mediaType || !TMDB_KEY) {
      setError('Detay yüklenemedi.')
      setLoading(false)
      return
    }
    const ctrl = new AbortController()

    Promise.all([
      fetch(
        `https://api.themoviedb.org/3/${item.mediaType}/${item.tmdbId}` +
        `?api_key=${TMDB_KEY}&language=tr-TR&append_to_response=credits,reviews,videos`,
        { signal: ctrl.signal }
      ).then(r => { if (!r.ok) throw new Error(`TMDB ${r.status}`); return r.json() }),

      fetch(
        `https://api.themoviedb.org/3/${item.mediaType}/${item.tmdbId}/watch/providers?api_key=${TMDB_KEY}`,
        { signal: ctrl.signal }
      ).then(r => r.json()).catch(() => ({})),
    ])
      .then(([json, wp]) => {
        const isMovie = item.mediaType === 'movie'

        // Trailer
        const trailer = (json.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube')
          || (json.videos?.results || []).find(v => v.site === 'YouTube')
        if (trailer) setTrailerKey(trailer.key)

        // Watch providers
        const tr = wp.results?.TR
        const all = [...(tr?.flatrate || []), ...(tr?.free || [])]
        const seen = new Set()
        const list = []
        for (const p of all) {
          const mapped = PROVIDER_MAP[p.provider_id]
          const k = mapped || p.provider_name
          if (k && !seen.has(k)) { seen.add(k); list.push(k) }
        }
        setWatchPlatforms(list)

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
          reviews:     (json.reviews?.results || []).slice(0, 3).map(r => ({
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
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 520,
          background: 'var(--bg-card)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, overflow: 'hidden',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Kapat butonu */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
          }}
        >
          <X size={14} />
        </button>

        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
            Yükleniyor…
          </div>
        )}

        {error && (
          <div style={{ padding: 30, textAlign: 'center', color: '#e57373', fontSize: 12 }}>
            {error}
          </div>
        )}

        {detail && (
          <>
            {/* Poster + başlık + açıklama */}
            <div style={{ display: 'flex', gap: 14, padding: 16 }}>
              <div style={{ width: 110, flexShrink: 0, borderRadius: 8, overflow: 'hidden', height: 162, background: 'rgba(255,255,255,0.04)' }}>
                {detail.posterPath && (
                  <img
                    src={`https://image.tmdb.org/t/p/w300${detail.posterPath}`}
                    alt={detail.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--text)', fontSize: 14, fontWeight: 700, lineHeight: 1.3, flex: 1, paddingRight: 30 }}>
                    {detail.title}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {detail.year && <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>{detail.year}</span>}
                  {detail.duration && <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>⏱ {detail.duration}dk</span>}
                  {detail.imdbScore && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Star size={10} fill="var(--accent)" color="var(--accent)" />
                      <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 800, fontFamily: 'monospace' }}>
                        {detail.imdbScore}
                      </span>
                      <span style={{ color: 'var(--text-faint)', fontSize: 9 }}>/10</span>
                    </div>
                  )}
                </div>
                {detail.description && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, lineHeight: 1.65 }}>
                    {detail.description}
                  </p>
                )}

                {/* Butonlar */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  {trailerKey && (
                    <a
                      href={`https://www.youtube.com/watch?v=${trailerKey}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'rgba(255,50,50,0.12)', border: '1px solid rgba(255,50,50,0.3)',
                        borderRadius: 6, padding: '4px 10px',
                        fontSize: 10, fontWeight: 700, color: '#ff5555', textDecoration: 'none',
                      }}
                    >▶ Fragmanı İzle</a>
                  )}
                  {typeof item.tmdbId === 'number' && (
                    <a
                      href={`https://vidsrc.to/embed/${item.mediaType === 'movie' ? 'movie' : 'tv'}/${item.tmdbId}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'rgba(0,200,100,0.12)', border: '1px solid rgba(0,200,100,0.3)',
                        borderRadius: 6, padding: '4px 10px',
                        fontSize: 10, fontWeight: 700, color: '#4dff9d', textDecoration: 'none',
                      }}
                    >▶ İzle</a>
                  )}
                </div>
              </div>
            </div>

            {/* TR platformları */}
            {watchPlatforms !== null && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ color: 'var(--text-faint)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 7px' }}>
                  🇹🇷 Türkiye'de İzle
                </p>
                {watchPlatforms.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {watchPlatforms.map(pid => {
                      const plat = PLAT_MAP[pid]
                      return (
                        <span key={pid} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: plat ? plat.color + '22' : 'rgba(255,255,255,0.07)',
                          border: `1px solid ${plat ? plat.color + '55' : 'rgba(255,255,255,0.12)'}`,
                          borderRadius: 6, padding: '4px 10px',
                          fontSize: 10, fontWeight: 700, color: '#fff',
                        }}>
                          {plat && <span style={{ background: plat.color, borderRadius: 3, padding: '1px 5px', fontSize: 8, fontWeight: 900 }}>{plat.badge}</span>}
                          {plat ? plat.label : pid}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>Türkiye'de yayın bilgisi bulunamadı</span>
                )}
              </div>
            )}

            {/* Oyuncular */}
            {detail.cast.length > 0 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ color: 'var(--text-faint)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Oyuncular</p>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {detail.cast.map((actor, i) => <OverlayActorCard key={i} actor={actor} />)}
                </div>
              </div>
            )}

            {/* Yorumlar */}
            {detail.reviews.length > 0 && (
              <div style={{ padding: '10px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ color: 'var(--text-faint)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Öne Çıkan Yorumlar</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detail.reviews.map((r, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '8px 10px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>"{r.quote}"</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                        <span style={{ background: 'rgba(var(--accent-rgb),0.15)', borderRadius: 3, padding: '1px 6px', fontSize: 8.5, fontWeight: 700, color: 'var(--accent)' }}>{r.source}</span>
                        {r.author && <span style={{ color: 'var(--text-faint)', fontSize: 8.5 }}>— {r.author}</span>}
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
