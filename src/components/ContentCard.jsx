import { useState, useEffect } from 'react'
import { Star, TrendingUp, ChevronDown, ChevronUp, User } from 'lucide-react'
import PosterImg from './PosterImg.jsx'
import { PLATFORMS } from '../constants/index.js'

const PLAT_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]))

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY

// TMDB provider_id → platform adı (Türkiye)
const TMDB_PROVIDER_MAP = {
  8:    'Netflix',
  119:  'Amazon Prime',
  337:  'Disney+',
  350:  'Apple TV+',
  1899: 'HBO Max',
  384:  'HBO Max',
  11:   'Mubi',
  341:  'BluTV',
  479:  'PUHUTV',
  531:  'Paramount+',
  533:  'Gain',
  584:  'TOD',
  1759: 'MUBI',
  2:    'Apple TV+',
}

// ── Skor Rozeti ────────────────────────────────────────────────────────────────
function ScoreBadge({ imdb, rt, lb }) {
  if (!imdb && !rt && !lb) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
      {imdb && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Star size={11} fill="var(--accent)" color="var(--accent)" />
          <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 800, fontFamily: 'monospace' }}>{imdb}</span>
          <span style={{ color: 'var(--text-faint)', fontSize: 9 }}>/10</span>
        </div>
      )}
      {rt && (
        <span style={{
          fontSize: 9.5, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
          background: rt >= 60 ? 'rgba(76,175,80,0.13)' : 'rgba(244,67,54,0.13)',
          border: `1px solid ${rt >= 60 ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)'}`,
          color: rt >= 60 ? '#81c784' : '#e57373',
        }}>🍅 {rt}%</span>
      )}
      {lb && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 9.5, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
          background: 'rgba(0,172,56,0.12)',
          border: '1px solid rgba(0,172,56,0.28)',
          color: '#4dcf7a',
        }}>
          🎞 {lb}
          <span style={{ fontSize: 8, color: 'rgba(77,207,122,0.6)' }}>/5</span>
        </span>
      )}
    </div>
  )
}

// ── Oyuncu Kartı ───────────────────────────────────────────────────────────────
function ActorCard({ actor }) {
  const [imgErr, setImgErr] = useState(false)
  const hasImg = actor.profilePath && !imgErr
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 62, flexShrink: 0 }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
        border: '1.5px solid var(--border)',
        background: 'rgba(var(--accent-rgb),0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {hasImg
          ? <img src={`https://image.tmdb.org/t/p/w185${actor.profilePath}`} alt={actor.name}
              onError={() => setImgErr(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <User size={22} color="var(--text-faint)" />
        }
      </div>
      <span style={{
        color: 'var(--text-muted)', fontSize: 8.5, textAlign: 'center', lineHeight: 1.25,
        maxWidth: 60, overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>{actor.name}</span>
      {actor.character && (
        <span style={{
          color: 'var(--text-faint)', fontSize: 7.5, textAlign: 'center',
          fontStyle: 'italic', lineHeight: 1.2, maxWidth: 60,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
        }}>{actor.character}</span>
      )}
    </div>
  )
}

// ── Yorum Kartı ───────────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  return (
    <div style={{
      background: 'rgba(var(--accent-rgb),0.05)',
      border: '1px solid rgba(var(--accent-rgb),0.15)',
      borderRadius: 7, padding: '8px 10px',
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>
        "{review.quote}"
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
        <span style={{
          background: 'rgba(var(--accent-rgb),0.15)', borderRadius: 3, padding: '1px 6px',
          fontSize: 8.5, fontWeight: 700, color: 'var(--accent)',
        }}>{review.source}</span>
        {review.author && (
          <span style={{ color: 'var(--text-faint)', fontSize: 8.5 }}>— {review.author}</span>
        )}
      </div>
    </div>
  )
}

// ── Kriter Çubuğu (genişletilmiş trend detayı) ────────────────────────────────
function CriteriaBar({ criterion }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 13, flexShrink: 0, width: 18, textAlign: 'center' }}>{criterion.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>{criterion.label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{ color: 'var(--text)', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
              {criterion.value}
            </span>
            <span style={{
              color: 'var(--accent)', fontSize: 9, fontWeight: 800,
              background: 'rgba(var(--accent-rgb),0.12)',
              borderRadius: 3, padding: '1px 5px', minWidth: 24, textAlign: 'center',
            }}>{criterion.score}</span>
          </div>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${criterion.score}%`, height: '100%',
            background: 'var(--trend-bar)', borderRadius: 3,
            transition: 'width 0.4s ease',
          }} />
        </div>
        <span style={{ color: 'var(--text-faint)', fontSize: 8, marginTop: 2, display: 'block' }}>
          Kaynak: {criterion.source}
        </span>
      </div>
    </div>
  )
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
export default function ContentCard({ item, isTrend }) {
  const [open, setOpen] = useState(false)
  // null = henüz çekilmedi, [] = çekildi ama bulunamadı, [...] = bulundu
  const [watchPlatforms, setWatchPlatforms] = useState(null)
  const [trailerKey, setTrailerKey]         = useState(item.trailerKey || null)
  // trailerKey undefined ise daha çekilmedi; null ise çekildi ama bulunamadı
  const [trailerFetched, setTrailerFetched] = useState(item.trailerKey !== undefined)

  // Kart açılınca Türkiye platformlarını lazy çek (trend + arama sonuçları)
  useEffect(() => {
    if (!open || !item._tmdbId || !item._mediaType || !TMDB_KEY) return
    if (watchPlatforms !== null) return
    fetch(
      `https://api.themoviedb.org/3/${item._mediaType}/${item._tmdbId}/watch/providers?api_key=${TMDB_KEY}`
    )
      .then(r => r.json())
      .then(json => {
        const tr = json.results?.TR
        const all = [...(tr?.flatrate || []), ...(tr?.free || [])]
        const seen = new Set()
        const list = []
        for (const p of all) {
          const mapped = TMDB_PROVIDER_MAP[p.provider_id]
          const key = mapped || p.provider_name
          if (key && !seen.has(key)) { seen.add(key); list.push(key) }
        }
        setWatchPlatforms(list)
      })
      .catch(() => setWatchPlatforms([]))
  }, [open, item._tmdbId, item._mediaType, watchPlatforms])

  // Kart açılınca fragman lazy çek (henüz trailerKey'i olmayan trend kartları)
  useEffect(() => {
    if (!open || trailerFetched || !item._tmdbId || !item._mediaType || !TMDB_KEY) return
    setTrailerFetched(true)
    fetch(
      `https://api.themoviedb.org/3/${item._mediaType}/${item._tmdbId}/videos?api_key=${TMDB_KEY}&language=tr-TR`
    )
      .then(r => r.json())
      .then(json => {
        const trailer = (json.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube')
          || (json.results || []).find(v => v.site === 'YouTube')
        if (trailer) setTrailerKey(trailer.key)
      })
      .catch(() => {})
  }, [open, trailerFetched, item._tmdbId, item._mediaType])

  const hasCast    = Array.isArray(item.cast)    && item.cast.length    > 0
  const hasReviews = Array.isArray(item.reviews) && item.reviews.length > 0
  const hasCriteria = isTrend && Array.isArray(item.popularityCriteria) && item.popularityCriteria.length > 0

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: isTrend ? 'var(--bg-card-trend)' : 'var(--bg-card)',
        border: `1px solid ${isTrend ? 'var(--border-trend)' : 'var(--border)'}`,
        backdropFilter: 'var(--card-backdrop)',
        WebkitBackdropFilter: 'var(--card-backdrop)',
        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.18s, transform 0.18s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--hover-border)'
        e.currentTarget.style.transform   = 'translateY(-3px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isTrend ? 'var(--border-trend)' : 'var(--border)'
        e.currentTarget.style.transform   = 'translateY(0)'
      }}
    >
      {isTrend && <div style={{ height: 2, background: 'var(--trend-bar)' }} />}

      <div style={{ display: 'flex', minHeight: 148 }}>
        {/* Poster */}
        <div style={{ width: 98, flexShrink: 0, position: 'relative' }}>
          <PosterImg path={item.posterPath} title={item.title} />

          {/* Trend sırası rozeti */}
          {isTrend && item.trendRank && (
            <div style={{
              position: 'absolute', top: 5, left: 5,
              background: item.trendRank <= 3
                ? 'linear-gradient(135deg,#f5a623,#e50914)'
                : item.trendRank <= 10
                  ? 'linear-gradient(135deg,rgba(var(--accent-rgb),0.9),rgba(var(--accent-rgb),0.6))'
                  : 'rgba(0,0,0,0.75)',
              borderRadius: 5, padding: '2px 6px',
              fontFamily: 'monospace', fontSize: item.trendRank <= 9 ? 13 : 11,
              fontWeight: 900, color: '#fff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              border: item.trendRank <= 3 ? '1px solid rgba(255,200,0,0.4)' : '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(4px)',
            }}>#{item.trendRank}</div>
          )}

          {/* Yeni yayın rozeti */}
          {isTrend && item.isNewRelease && (
            <div style={{
              position: 'absolute', bottom: 5, left: 5,
              background: 'rgba(76,175,80,0.85)',
              borderRadius: 3, padding: '1px 5px',
              fontSize: 7.5, fontWeight: 900, color: '#fff', letterSpacing: '0.06em',
            }}>YENİ</div>
          )}
        </div>

        {/* Bilgi */}
        <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
            <span style={{
              color: 'var(--text)', fontSize: 13, fontWeight: 700, lineHeight: 1.3, flex: 1,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{item.title}</span>
            <span style={{ color: 'var(--text-faint)', fontSize: 9.5, flexShrink: 0, paddingTop: 1 }}>{item.year}</span>
          </div>

          <ScoreBadge imdb={item.imdbScore} rt={item.rottenTomatoesScore} lb={item.letterboxdScore} />

          {/* Tür etiketleri */}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {(item.genres || []).slice(0, 3).map(g => (
              <span key={g} style={{
                background: 'rgba(255,255,255,0.055)', borderRadius: 3,
                padding: '1.5px 5px', fontSize: 9, color: 'var(--text-muted)',
              }}>{g}</span>
            ))}
            {isTrend && item.type && (
              <span style={{
                background: item.type === 'film' ? 'rgba(229,9,20,0.18)' : 'rgba(0,168,224,0.18)',
                border: `1px solid ${item.type === 'film' ? 'rgba(229,9,20,0.35)' : 'rgba(0,168,224,0.35)'}`,
                borderRadius: 3, padding: '1.5px 5px', fontSize: 9, fontWeight: 800,
                color: item.type === 'film' ? '#ff7070' : '#70ccf0', letterSpacing: '0.04em',
              }}>{item.type === 'film' ? 'FİLM' : 'DİZİ'}</span>
            )}
          </div>

          {/* Sosyal skor çubuğu */}
          {isTrend && item.socialScore != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <TrendingUp size={9} color="var(--accent)" />
              <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${item.socialScore}%`, height: '100%', background: 'var(--trend-bar)', borderRadius: 2 }} />
              </div>
              <span style={{ color: 'var(--accent)', fontSize: 9, fontWeight: 800, minWidth: 22 }}>
                {item.socialScore}
              </span>
            </div>
          )}

          {/* Trend için mini kriter etiketleri (sadece kart kapalıyken) */}
          {isTrend && !open && item.popularityCriteria && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 1 }}>
              {item.popularityCriteria.map(c => (
                <span key={c.label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4, padding: '1px 6px',
                  fontSize: 8.5, color: 'var(--text-faint)',
                }}>
                  <span style={{ fontSize: 9 }}>{c.icon}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{c.value}</span>
                </span>
              ))}
            </div>
          )}

          {/* Platform rozetleri */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            {(item.platforms || []).map(p => {
              const plat = PLAT_MAP[p]
              return (
                <span key={p} style={{
                  background: plat?.color || '#333', borderRadius: 2, padding: '1.5px 5px',
                  fontSize: 7.5, fontWeight: 900, color: '#fff', letterSpacing: '0.06em',
                }}>{plat?.badge || p.substring(0, 3).toUpperCase()}</span>
              )
            })}
            {item._tmdbId && item.platforms?.length === 0 && (
              <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 8 }}>📺 Genişlet → TR platformları</span>
            )}
            {item.duration && (
              <span style={{ color: 'var(--text-faint)', fontSize: 9, marginLeft: 2 }}>⏱ {item.duration}dk</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 10px 0 0' }}>
          {open
            ? <ChevronUp   size={13} color="var(--text-faint)" />
            : <ChevronDown size={13} color="var(--text-faint)" />}
        </div>
      </div>

      {/* ── Genişletilmiş Detay ────────────────────────────────────────────── */}
      {open && (
        <div
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.35)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Poster + açıklama */}
          <div style={{ display: 'flex', gap: 12, padding: '12px 12px 0' }}>
            <div style={{ width: 110, flexShrink: 0, borderRadius: 8, overflow: 'hidden', height: 162 }}>
              <PosterImg path={item.posterPath} title={item.title} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {item.description && (
                <p style={{ color: 'var(--text-muted)', fontSize: 11.5, margin: 0, lineHeight: 1.7 }}>
                  {item.description}
                </p>
              )}
              {item.trendReason && (
                <p style={{ color: 'var(--accent)', fontSize: 11, margin: 0, fontStyle: 'italic', lineHeight: 1.5, opacity: 0.85 }}>
                  🔥 {item.trendReason}
                </p>
              )}
              {item.originalTitle && item.originalTitle !== item.title && (
                <p style={{ color: 'var(--text-faint)', fontSize: 9.5, margin: 0 }}>
                  Orijinal adı: {item.originalTitle}
                </p>
              )}
              {isTrend && item.releaseDate && (
                <p style={{ color: 'var(--text-faint)', fontSize: 9.5, margin: 0 }}>
                  📅 Yayın tarihi: {new Date(item.releaseDate).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
              {trailerKey && (
                <a
                  href={`https://www.youtube.com/watch?v=${trailerKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(255,50,50,0.12)',
                    border: '1px solid rgba(255,50,50,0.3)',
                    borderRadius: 6, padding: '5px 12px', marginTop: 4,
                    fontSize: 11, fontWeight: 700, color: '#ff5555',
                    textDecoration: 'none', alignSelf: 'flex-start',
                  }}
                >
                  ▶ Fragmanı İzle
                </a>
              )}
            </div>
          </div>

          {/* ── Türkiye'de İzle (tüm TMDB içerikler — lazy) ───────────────── */}
          {item._tmdbId && (
            <div style={{ padding: '12px 14px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <p style={{
                color: 'var(--text-faint)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px',
              }}>🇹🇷 Türkiye'de İzle</p>

              {watchPlatforms === null && (
                <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>Yükleniyor…</span>
              )}

              {watchPlatforms !== null && watchPlatforms.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {watchPlatforms.map(pid => {
                    const plat = PLAT_MAP[pid]
                    return (
                      <span key={pid} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: plat ? plat.color + '22' : 'rgba(255,255,255,0.07)',
                        border: `1px solid ${plat ? plat.color + '55' : 'rgba(255,255,255,0.12)'}`,
                        borderRadius: 6, padding: '4px 10px',
                        fontSize: 10.5, fontWeight: 700, color: '#fff',
                      }}>
                        {plat && (
                          <span style={{
                            background: plat.color, borderRadius: 3,
                            padding: '1px 5px', fontSize: 8, fontWeight: 900,
                          }}>{plat.badge}</span>
                        )}
                        {plat ? plat.label : pid}
                      </span>
                    )
                  })}
                </div>
              )}

              {watchPlatforms !== null && watchPlatforms.length === 0 && (
                <span style={{
                  color: 'var(--text-faint)', fontSize: 10,
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 5, padding: '4px 10px', display: 'inline-block',
                }}>Türkiye'de yayın bilgisi bulunamadı</span>
              )}
            </div>
          )}

          {/* Popülerlik Kriterleri */}
          {hasCriteria && (
            <div style={{ padding: '14px 14px 4px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 10,
              }}>
                <p style={{
                  color: 'var(--text-faint)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0,
                }}>Popülerlik Kriterleri</p>
                <span style={{
                  fontSize: 8.5, color: 'rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 3, padding: '1px 6px',
                }}>Kaynak: TMDB</span>
              </div>
              {item.popularityCriteria.map(c => (
                <CriteriaBar key={c.label} criterion={c} />
              ))}
              <div style={{
                marginTop: 6, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ color: 'var(--text-faint)', fontSize: 9 }}>Bileşik Sosyal Skor</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${item.socialScore}%`, height: '100%', background: 'var(--trend-bar)', borderRadius: 2 }} />
                  </div>
                  <span style={{
                    color: 'var(--accent)', fontSize: 13, fontWeight: 900, fontFamily: 'monospace',
                  }}>{item.socialScore}</span>
                  <span style={{ color: 'var(--text-faint)', fontSize: 9 }}>/100</span>
                </div>
              </div>
            </div>
          )}

          {/* Oyuncular */}
          {hasCast && (
            <div style={{ padding: '12px 12px 0' }}>
              <p style={{
                color: 'var(--text-faint)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase',
              }}>Oyuncular</p>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {item.cast.slice(0, 8).map((actor, i) => (
                  <ActorCard key={i} actor={actor} />
                ))}
              </div>
            </div>
          )}

          {/* Yorumlar */}
          {hasReviews && (
            <div style={{ padding: '12px 12px 12px' }}>
              <p style={{
                color: 'var(--text-faint)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase',
              }}>Öne Çıkan Yorumlar</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {item.reviews.slice(0, 3).map((review, i) => (
                  <ReviewCard key={i} review={review} />
                ))}
              </div>
            </div>
          )}

          {!hasCast && !hasReviews && <div style={{ height: 12 }} />}
        </div>
      )}
    </div>
  )
}
