import { useState, useEffect } from 'react'
import { Star, User, Film } from 'lucide-react'
import PosterImg from './PosterImg.jsx'
import SaveControls from './SaveControls.jsx'
import TrailerEmbed from './TrailerEmbed.jsx'
import { ALL_PLATFORMS } from '../constants/index.js'
import { isValidTmdbRef, isValidTmdbId, mapTrProviders } from '../lib/tmdb.js'
import { badgeInk } from '../lib/cards.js'

// Yapım detayı — kart açılınca, vitrinde "Detaya bak"ta, raf kartında ve
// mini kartlardan açılan overlay'de AYNI içerik. Önce overlay ayrı, daha
// sade bir kopyaydı; vitrinden açılan detay karttakinden eksik kalıyordu.
//
// variant="card"    → kartın altına açılır; başlık/puan zaten kartın üst satırında.
// variant="overlay" → modal içinde; üst satır olmadığı için başlık, puanlar ve
//                     kaydetme grubu burada çizilir. Eksik alanlar (mini kartlar
//                     yalnız id/başlık/yıl/poster taşır) TMDB yanıtından tamamlanır.

// Rozet çözümlemesi küresel + yerli tüm sağlayıcıları kapsar; aksi halde
// puhutv/TOD gibi yerli platformlar gri "PUH" fallback'ine düşerdi.
const PLAT_MAP = Object.fromEntries(ALL_PLATFORMS.map(p => [p.id, p]))

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/

// ── Puan satırı ───────────────────────────────────────────────────────────────
// Bir kahraman, iki destekçi. Önce üç puan da emoji + çerçeveli rozetti ve
// eşit ağırlıkta bağırıyordu. IMDB puanı kartın en büyük ikinci tipografik
// öğesi oldu; RT ve Letterboxd düz metne indi. "Taze/çürük" bilgisi kutuda
// değil, sayının renginde yaşamaya devam ediyor.
export function ScoreLine({ imdb, rt, lb }) {
  if (!imdb && !rt && !lb) return null
  return (
    <div className="cc-scores">
      {imdb && (
        <span className="cc-imdb tnum">
          <Star size={14} fill="currentColor" aria-hidden="true" />
          {imdb}<span className="cc-imdb-max">/10</span>
        </span>
      )}
      {rt && (
        <span className={`cc-alt tnum ${rt >= 60 ? 'cc-alt-ok' : 'cc-alt-bad'}`} title="Rotten Tomatoes">
          RT %{rt}
        </span>
      )}
      {lb && <span className="cc-alt tnum" title="Letterboxd">LB {lb}</span>}
    </div>
  )
}

// ── Mini Kart (benzer yapım / yönetmen / oyuncu filmoğrafisi) ─────────────────
function MiniCard({ item, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <button className="mini-card" onClick={e => { e.stopPropagation(); onClick(item) }}>
      <span className="mini-poster">
        {item.posterPath && !imgErr
          ? <img
              src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
              alt=""
              loading="lazy"
              onError={() => setImgErr(true)}
            />
          : <Film size={18} aria-hidden="true" />}
      </span>
      <span className="mini-title">{item.title}</span>
      {item.year && <span className="mini-year">{item.year}</span>}
    </button>
  )
}

// ── Oyuncu Kartı ───────────────────────────────────────────────────────────────
function ActorCard({ actor, onClick, isActive }) {
  const [imgErr, setImgErr] = useState(false)
  const hasImg      = actor.profilePath && !imgErr
  const isClickable = !!(actor.id && onClick)
  const Tag = isClickable ? 'button' : 'div'
  return (
    <Tag
      className={`actor${isActive === false ? ' actor-dim' : ''}`}
      onClick={isClickable ? (e) => { e.stopPropagation(); onClick(actor) } : undefined}
      aria-pressed={isClickable ? isActive === true : undefined}
    >
      <span className={`actor-photo${isActive ? ' actor-photo-on' : ''}`}>
        {hasImg
          ? <img src={`https://image.tmdb.org/t/p/w185${actor.profilePath}`} alt="" loading="lazy"
              onError={() => setImgErr(true)} />
          : <User size={20} aria-hidden="true" />}
      </span>
      <span className="actor-name">{actor.name}</span>
      {actor.character && <span className="actor-role">{actor.character}</span>}
    </Tag>
  )
}

// ── Yorum Kartı ───────────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  return (
    <div className="review">
      <q>{review.quote}</q>
      <div className="review-src">
        <b>{review.source}</b>
        {review.author && <span>{review.author}</span>}
      </div>
    </div>
  )
}

// ── Kriter Çubuğu ─────────────────────────────────────────────────────────────
function CriteriaBar({ criterion }) {
  return (
    <div className="crit">
      <div className="crit-head">
        <span className="crit-label">{criterion.label}</span>
        <span className="crit-value tnum">{criterion.value}</span>
        <span className="crit-score tnum">{criterion.score}</span>
      </div>
      <div className="cc-bar"><i style={{ width: `${criterion.score}%` }} /></div>
      <span className="crit-src">Kaynak: {criterion.source}</span>
    </div>
  )
}

// ── Yatay Scroll Bölümü (MiniCard'lar) ────────────────────────────────────────
function MiniSection({ title, items, loading, onMiniClick }) {
  if (!loading && (!items || items.length === 0)) return null
  return (
    <div className="cc-sec">
      <p className="cc-sec-title">{title}</p>
      {loading && (!items || items.length === 0) && <span className="cc-desc-alt">Yükleniyor…</span>}
      {items && items.length > 0 && (
        <div className="cc-strip">
          {items.map(mini => <MiniCard key={mini.tmdbId} item={mini} onClick={onMiniClick} />)}
        </div>
      )}
    </div>
  )
}

// Öğenin kendi değeri varsa o kazanır (kartın üst satırıyla tutarlı kalsın);
// yoksa TMDB'den gelen doldurur.
const dolu = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
const sec = (kendi, tmdb) => (dolu(kendi) ? kendi : tmdb)

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
// open=false iken hiçbir şey çizmez ama bağlı kalır: kart kapanıp yeniden
// açıldığında çekilmiş veri korunur, istekler tekrarlanmaz.
export default function DetailBody({ item, open = true, variant = 'card', onMiniClick }) {
  const overlay = variant === 'overlay'

  // ── TMDB ID çözümleme ────────────────────────────────────────────────────────
  // Kart/vitrin/raf öğeleri _tmdbId/_mediaType, mini/arama öğeleri tmdbId/mediaType
  // taşır. İkisi de yoksa (mock veri) başlıkla aranır.
  const initialId   = item._tmdbId    ?? item.tmdbId    ?? null
  const initialType = item._mediaType ?? item.mediaType ?? null
  const [resolvedTmdbId,    setResolvedTmdbId]    = useState(initialId)
  const [resolvedMediaType, setResolvedMediaType] = useState(initialType)
  const [tmdbResolveFetched, setTmdbResolveFetched] = useState(initialId != null)

  // ── Watch providers (lazy) ───────────────────────────────────────────────────
  const [watchPlatforms, setWatchPlatforms] = useState(null)

  // ── Trailer (lazy) ───────────────────────────────────────────────────────────
  const [trailerKey,     setTrailerKey]     = useState(
    item.trailerKey && YOUTUBE_ID_RE.test(item.trailerKey) ? item.trailerKey : null
  )
  const [trailerFetched, setTrailerFetched] = useState(item.trailerKey !== undefined)

  // ── Zengin detay: temel bilgi + credits + recommendations ────────────────────
  const [richDetail,  setRichDetail]  = useState(null)
  const [richFetched, setRichFetched] = useState(false)
  const [richLoading, setRichLoading] = useState(false)
  const [richError,   setRichError]   = useState(false)

  // ── Yönetmenin diğer yapımları ────────────────────────────────────────────────
  const [directorWorks,        setDirectorWorks]        = useState(null)
  const [directorWorksFetched, setDirectorWorksFetched] = useState(false)

  // ── Oyuncu filmografisi ───────────────────────────────────────────────────────
  const [activeActorId,      setActiveActorId]      = useState(null)
  const [actorFilmo,         setActorFilmo]         = useState({})
  const [actorFilmoLoading,  setActorFilmoLoading]  = useState({})

  // ── Türetilmiş değerler ───────────────────────────────────────────────────────
  const effectiveTmdbId    = resolvedTmdbId
  const effectiveMediaType = resolvedMediaType
  // Güven sınırı: tmdbId/mediaType saklanan favoriden (kullanıcı yazabilir) gelebilir.
  // TMDB URL'sine gömülmeden önce katı doğrulama — path-injection'ı engeller.
  const validRef = isValidTmdbRef(effectiveTmdbId, effectiveMediaType)
  // Search item'ı: _tmdbId ve similarItems birlikte varsa (useSearch.js'den geliyor)
  const isSearchItem = !!item._tmdbId && Array.isArray(item.similarItems)
  const cast         = isSearchItem ? item.cast         : (richDetail?.cast         || item.cast  || [])
  const director     = isSearchItem ? item.director     : richDetail?.director
  const similarItems = isSearchItem ? item.similarItems : (richDetail?.similarItems || [])
  // Yorumlar: arama öğesi veya mock kendi yorumunu taşır; TMDB liste/trend için en-US ile çekilir
  const reviews      = isSearchItem
    ? (item.reviews || [])
    : ((item.reviews && item.reviews.length) ? item.reviews : (richDetail?.reviews || []))

  const base = richDetail?.base || {}
  const info = {
    title:         sec(item.title,         base.title),
    posterPath:    sec(item.posterPath,    base.posterPath),
    description:   sec(item.description,   base.description),
    year:          sec(item.year,          base.year),
    imdbScore:     sec(item.imdbScore,     base.imdbScore),
    duration:      sec(item.duration,      base.duration),
    genres:        sec(item.genres,        base.genres) || [],
    originalTitle: sec(item.originalTitle, base.originalTitle),
    releaseDate:   sec(item.releaseDate,   base.releaseDate),
  }

  // Overlay'de kimlik hiç doğrulanamıyorsa ya da ana istek düştüyse kullanıcıya söylenir.
  const loadFailed = overlay && (
    richError || !TMDB_KEY || (effectiveTmdbId != null && !validRef)
  )

  // ── Effect A: Mock item için TMDB ID çözümleme ────────────────────────────────
  useEffect(() => {
    if (tmdbResolveFetched || !open || !TMDB_KEY) return
    if (initialId != null) { setTmdbResolveFetched(true); return }
    setTmdbResolveFetched(true)
    const q = encodeURIComponent((item.originalTitle || item.title || '').slice(0, 100))
    if (!q) return
    const ctrl = new AbortController()
    fetch(
      `https://api.themoviedb.org/3/search/multi?query=${q}&language=tr-TR&page=1&include_adult=false&api_key=${TMDB_KEY}`,
      { signal: ctrl.signal }
    )
      .then(r => r.json())
      .then(json => {
        const hit = (json.results || []).find(r => r.media_type === 'movie' || r.media_type === 'tv')
        if (hit) {
          setResolvedTmdbId(hit.id)
          setResolvedMediaType(hit.media_type)
        }
      })
      .catch(() => {})
    return () => ctrl.abort()
    // NOT: tmdbResolveFetched bağımlılıkta DEĞİL — efekt içinde set edildiğinden,
    // bağımlılık olsaydı kendi fetch'ini iptal edip yeniden çalışmayı engellerdi.
  }, [open, initialId, item.title, item.originalTitle])

  // ── Effect B: Zengin detay (temel bilgi + credits + recommendations) ──────────
  useEffect(() => {
    if (!open || richFetched || !validRef || !TMDB_KEY) return
    if (isSearchItem) return
    setRichFetched(true)
    setRichLoading(true)
    const ctrl = new AbortController()
    const tmdbBase = `https://api.themoviedb.org/3/${effectiveMediaType}/${effectiveTmdbId}`
    Promise.all([
      fetch(`${tmdbBase}?language=tr-TR&append_to_response=credits,recommendations&api_key=${TMDB_KEY}`,
        { signal: ctrl.signal }).then(r => r.json()),
      // Yorumlar TMDB'de çoğunlukla İngilizce; tr-TR boş döner → en-US ile çek
      fetch(`${tmdbBase}/reviews?language=en-US&api_key=${TMDB_KEY}`,
        { signal: ctrl.signal }).then(r => (r.ok ? r.json() : { results: [] })).catch(() => ({ results: [] })),
    ])
      .then(([json, rev]) => {
        // TMDB hata gövdesi { success: false, status_message } döner
        if (json?.success === false) throw new Error('TMDB')
        const isMovie = effectiveMediaType === 'movie'
        const dirEntry = (json.credits?.crew || []).find(p => p.job === 'Director')
          || json.created_by?.[0] || null
        setRichDetail({
          base: {
            title:         isMovie ? json.title : json.name,
            posterPath:    json.poster_path,
            description:   json.overview,
            year:          (isMovie ? json.release_date : json.first_air_date)?.slice(0, 4),
            imdbScore:     json.vote_average ? Number(json.vote_average.toFixed(1)) : null,
            duration:      isMovie ? json.runtime : json.episode_run_time?.[0],
            genres:        (json.genres || []).map(g => g.name),
            originalTitle: isMovie ? json.original_title : json.original_name,
            releaseDate:   isMovie ? json.release_date : json.first_air_date,
          },
          cast: (json.credits?.cast || []).slice(0, 8).map(c => ({
            id: c.id, name: c.name, character: c.character, profilePath: c.profile_path,
          })),
          director: dirEntry ? { id: dirEntry.id, name: dirEntry.name } : null,
          similarItems: (json.recommendations?.results || []).slice(0, 12).map(r => ({
            tmdbId: r.id,
            mediaType: r.media_type || (r.title ? 'movie' : 'tv'),
            title: r.title || r.name,
            year: (r.release_date || r.first_air_date || '').slice(0, 4),
            posterPath: r.poster_path,
          })),
          reviews: (rev.results || []).slice(0, 3).map(r => ({
            source: 'TMDB', author: r.author,
            quote: (r.content || '').slice(0, 220) + ((r.content?.length || 0) > 220 ? '…' : ''),
          })),
        })
      })
      .catch(e => {
        if (e.name === 'AbortError') return
        setRichError(true)
        setRichDetail({ cast: [], director: null, similarItems: [], reviews: [] })
      })
      .finally(() => setRichLoading(false))
    return () => ctrl.abort()
    // NOT: richFetched bağımlılıkta DEĞİL (efekt içinde set ediliyor) — aksi halde
    // bayrak true olunca cleanup tetiklenip uçuştaki fetch iptal olur, detay hiç gelmezdi.
  }, [open, effectiveTmdbId, effectiveMediaType, isSearchItem])

  // ── Effect C: Watch providers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !validRef || !TMDB_KEY) return
    if (watchPlatforms !== null) return
    const ctrl = new AbortController()
    fetch(
      `https://api.themoviedb.org/3/${effectiveMediaType}/${effectiveTmdbId}/watch/providers?api_key=${TMDB_KEY}`,
      { signal: ctrl.signal }
    )
      .then(r => r.json())
      .then(json => {
        setWatchPlatforms(mapTrProviders(json))
      })
      .catch(e => { if (e.name !== 'AbortError') setWatchPlatforms([]) })
    return () => ctrl.abort()
  }, [open, effectiveTmdbId, effectiveMediaType, watchPlatforms])

  // ── Effect D: Trailer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || trailerFetched || !validRef || !TMDB_KEY) return
    setTrailerFetched(true)
    const ctrl = new AbortController()
    // Fragmanlar çoğunlukla en-US altında listelenir; tr-TR boş döner
    fetch(
      `https://api.themoviedb.org/3/${effectiveMediaType}/${effectiveTmdbId}/videos?language=en-US&api_key=${TMDB_KEY}`,
      { signal: ctrl.signal }
    )
      .then(r => r.json())
      .then(json => {
        const trailer = (json.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube')
          || (json.results || []).find(v => v.site === 'YouTube')
        if (trailer?.key && YOUTUBE_ID_RE.test(trailer.key)) setTrailerKey(trailer.key)
      })
      .catch(() => {})
    return () => ctrl.abort()
    // NOT: trailerFetched bağımlılıkta DEĞİL — kendi fetch'ini iptal etmesini önler.
  }, [open, effectiveTmdbId, effectiveMediaType])

  // ── Effect E: Yönetmenin diğer yapımları ─────────────────────────────────────
  useEffect(() => {
    if (!open || directorWorksFetched || !isValidTmdbId(director?.id) || !TMDB_KEY) return
    setDirectorWorksFetched(true)
    const ctrl = new AbortController()
    const endpoint = (effectiveMediaType === 'tv' || item.type === 'dizi')
      ? `person/${director.id}/tv_credits`
      : `person/${director.id}/movie_credits`
    fetch(`https://api.themoviedb.org/3/${endpoint}?language=tr-TR&api_key=${TMDB_KEY}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(json => {
        const works = (json.crew || [])
          .filter(r => r.job === 'Director' && r.poster_path && r.id !== effectiveTmdbId)
          .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
          .slice(0, 12)
          .map(r => ({
            tmdbId: r.id,
            mediaType: effectiveMediaType === 'tv' ? 'tv' : 'movie',
            title: r.title || r.name,
            year: (r.release_date || r.first_air_date || '').slice(0, 4),
            posterPath: r.poster_path,
          }))
        setDirectorWorks(works)
      })
      .catch(e => { if (e.name !== 'AbortError') setDirectorWorks([]) })
    return () => ctrl.abort()
    // NOT: directorWorksFetched bağımlılıkta DEĞİL — kendi fetch'ini iptal etmesini önler.
  }, [open, director, effectiveTmdbId, effectiveMediaType, item.type])

  // ── Oyuncu filmografi çek ─────────────────────────────────────────────────────
  const fetchActorFilmo = (personId) => {
    if (!isValidTmdbId(personId) || actorFilmo[personId] !== undefined || actorFilmoLoading[personId] || !TMDB_KEY) return
    setActorFilmoLoading(p => ({ ...p, [personId]: true }))
    fetch(`https://api.themoviedb.org/3/person/${personId}/combined_credits?language=tr-TR&api_key=${TMDB_KEY}`)
      .then(r => r.json())
      .then(json => {
        const items = (json.cast || [])
          .filter(r => r.poster_path && (r.media_type === 'movie' || r.media_type === 'tv'))
          .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
          .slice(0, 12)
          .map(r => ({
            tmdbId: r.id,
            mediaType: r.media_type,
            title: r.title || r.name,
            year: (r.release_date || r.first_air_date || '').slice(0, 4),
            posterPath: r.poster_path,
          }))
        setActorFilmo(p => ({ ...p, [personId]: items }))
      })
      .catch(() => setActorFilmo(p => ({ ...p, [personId]: [] })))
      .finally(() => setActorFilmoLoading(p => ({ ...p, [personId]: false })))
  }

  const handleActorClick = (actor) => {
    if (!actor.id) return
    const next = activeActorId === actor.id ? null : actor.id
    setActiveActorId(next)
    if (next) fetchActorFilmo(next)
  }

  if (!open) return null

  const hasCast     = Array.isArray(cast) && cast.length > 0
  const hasReviews  = Array.isArray(reviews) && reviews.length > 0
  // Zengin bölümler isTrend bayrağına değil verinin varlığına bakar —
  // böylece aynı yapı tüm sekmelerde (trend, listeler, öneriler) ortaktır.
  const hasCriteria = Array.isArray(item.popularityCriteria) && item.popularityCriteria.length > 0

  // Overlay üst satırı: kartın özet satırının karşılığı. Tür + yıl + süre tek
  // satırda düz metin — kartla aynı gerekçe.
  const kindWord = item.type
    ? (item.type === 'film' ? 'Film' : 'Dizi')
    : (effectiveMediaType === 'movie' ? 'Film' : effectiveMediaType === 'tv' ? 'Dizi' : null)
  const metaWords = [kindWord, ...info.genres.slice(0, 2), info.year, info.duration && `${info.duration} dk`].filter(Boolean)

  const sections = (
    <>
      <div className="cc-sec cc-lead">
        <div className="cc-lead-poster">
          <PosterImg path={info.posterPath} title={info.title} size={overlay ? 'w342' : undefined} />
        </div>
        <div className="cc-lead-body">
          {overlay && (
            <>
              <h3 className="modal-title" style={{ paddingRight: 32 }}>{info.title}</h3>
              <ScoreLine imdb={info.imdbScore} rt={item.rottenTomatoesScore} lb={item.letterboxdScore} />
              {metaWords.length > 0 && <p className="cc-meta">{metaWords.join(' · ')}</p>}
              {item.isYerli && <span className="tr-tag">TR YAPIMI</span>}
            </>
          )}
          {loadFailed && <p className="cc-desc-alt" style={{ color: 'var(--danger-ink)' }}>Detay yüklenemedi.</p>}
          {info.description
            ? <p className="cc-desc">{info.description}</p>
            : (overlay && richLoading && <span className="cc-desc-alt">Yükleniyor…</span>)}
          {item.trendReason && <p className="cc-trend-reason">{item.trendReason}</p>}
          {info.originalTitle && info.originalTitle !== info.title && (
            <p className="cc-desc-alt">Orijinal adı: {info.originalTitle}</p>
          )}
          {info.releaseDate && (
            <p className="cc-desc-alt">
              Yayın tarihi: {new Date(info.releaseDate).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
          {overlay ? (
            <div className="cc-tags">
              <TrailerEmbed trailerKey={trailerKey} compact />
              <SaveControls item={item} size={18} />
            </div>
          ) : (
            <TrailerEmbed trailerKey={trailerKey} />
          )}
        </div>
      </div>

      {validRef && (
        <div className="cc-sec">
          <p className="cc-sec-title">Türkiye'de izle</p>
          {watchPlatforms === null && <span className="cc-desc-alt">Yükleniyor…</span>}
          {watchPlatforms !== null && watchPlatforms.length > 0 && (
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
          )}
          {watchPlatforms !== null && watchPlatforms.length === 0 && (
            <span className="cc-desc-alt">Türkiye'de yayın bilgisi bulunamadı.</span>
          )}
        </div>
      )}

      {hasCriteria && (
        <div className="cc-sec">
          <p className="cc-sec-title">Popülerlik kriterleri</p>
          {item.popularityCriteria.map(c => <CriteriaBar key={c.label} criterion={c} />)}
          <div className="crit-total">
            <span className="cc-desc-alt">Bileşik sosyal skor</span>
            <span className="cc-imdb tnum">{item.socialScore}<span className="cc-imdb-max">/100</span></span>
          </div>
        </div>
      )}

      <MiniSection
        title="Benzer yapımlar"
        items={similarItems}
        loading={richLoading}
        onMiniClick={onMiniClick}
      />

      {director && (
        <MiniSection
          title={`${director.name} — diğer yapımları`}
          items={directorWorks}
          loading={directorWorks === null}
          onMiniClick={onMiniClick}
        />
      )}

      {hasCast && (
        <div className="cc-sec">
          <p className="cc-sec-title">Oyuncular</p>
          <div className="cc-strip">
            {cast.slice(0, 8).map((actor, i) => (
              <ActorCard
                key={actor.id || i}
                actor={actor}
                onClick={actor.id ? handleActorClick : undefined}
                isActive={actor.id ? (activeActorId === actor.id ? true : activeActorId !== null ? false : undefined) : undefined}
              />
            ))}
          </div>

          {activeActorId && (() => {
            const activeActor = cast.find(a => a.id === activeActorId)
            const filmo       = actorFilmo[activeActorId]
            const loading     = actorFilmoLoading[activeActorId]
            return (
              <div className="cc-subsec">
                <p className="cc-sec-title">{activeActor?.name} — filmografisi</p>
                {loading && <span className="cc-desc-alt">Yükleniyor…</span>}
                {filmo && filmo.length > 0 && (
                  <div className="cc-strip">
                    {filmo.map(mini => <MiniCard key={mini.tmdbId} item={mini} onClick={onMiniClick} />)}
                  </div>
                )}
                {filmo && filmo.length === 0 && <span className="cc-desc-alt">Yapım bulunamadı.</span>}
              </div>
            )
          })()}
        </div>
      )}

      {hasReviews && (
        <div className="cc-sec cc-sec-end">
          <p className="cc-sec-title">Öne çıkan yorumlar</p>
          <div className="cc-reviews">
            {reviews.slice(0, 3).map((review, i) => <ReviewCard key={i} review={review} />)}
          </div>
        </div>
      )}

      {!hasCast && !hasReviews && !validRef && <div style={{ height: 14 }} />}
    </>
  )

  if (overlay) return sections
  return <div className="cc-detail" onClick={e => e.stopPropagation()}>{sections}</div>
}
