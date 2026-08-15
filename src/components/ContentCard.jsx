import { useState, useEffect } from 'react'
import { Star, ChevronDown, ChevronUp, User, Film } from 'lucide-react'
import PosterImg from './PosterImg.jsx'
import DetailOverlay from './DetailOverlay.jsx'
import SaveControls from './SaveControls.jsx'
import TrailerEmbed from './TrailerEmbed.jsx'
import { ALL_PLATFORMS } from '../constants/index.js'
import { isValidTmdbRef, isValidTmdbId, mapTrProviders } from '../lib/tmdb.js'
import { badgeInk } from '../lib/cards.js'

// Rozet çözümlemesi küresel + yerli tüm sağlayıcıları kapsar; aksi halde
// puhutv/TOD gibi yerli platformlar gri "PUH" fallback'ine düşerdi.
const PLAT_MAP = Object.fromEntries(ALL_PLATFORMS.map(p => [p.id, p]))

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY

// ── Puan satırı ───────────────────────────────────────────────────────────────
// Bir kahraman, iki destekçi. Önce üç puan da emoji + çerçeveli rozetti ve
// eşit ağırlıkta bağırıyordu. IMDB puanı kartın en büyük ikinci tipografik
// öğesi oldu; RT ve Letterboxd düz metne indi. "Taze/çürük" bilgisi kutuda
// değil, sayının renginde yaşamaya devam ediyor.
function ScoreLine({ imdb, rt, lb }) {
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

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
// showKind=false → "Dizi/Film" sözcüğü yazılmaz. Diziler ve Filmler sekmelerinde
// zaten hepsi aynı türden; her kartta tekrarlamak 20 kez aynı şeyi söylemekti.
export default function ContentCard({ item, isTrend, showKind = true }) {
  const [open, setOpen] = useState(false)

  // ── TMDB ID çözümleme (mock data için) ──────────────────────────────────────
  const [resolvedTmdbId,    setResolvedTmdbId]    = useState(item._tmdbId    || null)
  const [resolvedMediaType, setResolvedMediaType] = useState(item._mediaType || null)
  const [tmdbResolveFetched, setTmdbResolveFetched] = useState(!!item._tmdbId)

  // ── Watch providers (lazy) ───────────────────────────────────────────────────
  const [watchPlatforms, setWatchPlatforms] = useState(null)

  // ── Trailer (lazy) ───────────────────────────────────────────────────────────
  const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/
  const [trailerKey,     setTrailerKey]     = useState(
    item.trailerKey && YOUTUBE_ID_RE.test(item.trailerKey) ? item.trailerKey : null
  )
  const [trailerFetched, setTrailerFetched] = useState(item.trailerKey !== undefined)

  // ── Zengin detay: credits + recommendations (trend + mock için) ──────────────
  const [richDetail,  setRichDetail]  = useState(null)
  const [richFetched, setRichFetched] = useState(false)
  const [richLoading, setRichLoading] = useState(false)

  // ── Yönetmenin diğer yapımları ────────────────────────────────────────────────
  const [directorWorks,        setDirectorWorks]        = useState(null)
  const [directorWorksFetched, setDirectorWorksFetched] = useState(false)

  // ── Oyuncu filmografisi ───────────────────────────────────────────────────────
  const [activeActorId,      setActiveActorId]      = useState(null)
  const [actorFilmo,         setActorFilmo]         = useState({})
  const [actorFilmoLoading,  setActorFilmoLoading]  = useState({})

  // ── Detail overlay ────────────────────────────────────────────────────────────
  const [overlayItem, setOverlayItem] = useState(null)

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

  // ── Effect A: Mock item için TMDB ID çözümleme ────────────────────────────────
  useEffect(() => {
    if (tmdbResolveFetched || !open || !TMDB_KEY) return
    if (item._tmdbId) { setTmdbResolveFetched(true); return }
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
  }, [open, item._tmdbId, item.title, item.originalTitle])

  // ── Effect B: Trend + mock için zengin detay (credits + recommendations) ──────
  useEffect(() => {
    if (!open || richFetched || !validRef || !TMDB_KEY) return
    if (isSearchItem) return
    setRichFetched(true)
    setRichLoading(true)
    const ctrl = new AbortController()
    const base = `https://api.themoviedb.org/3/${effectiveMediaType}/${effectiveTmdbId}`
    Promise.all([
      fetch(`${base}?language=tr-TR&append_to_response=credits,recommendations&api_key=${TMDB_KEY}`,
        { signal: ctrl.signal }).then(r => r.json()),
      // Yorumlar TMDB'de çoğunlukla İngilizce; tr-TR boş döner → en-US ile çek
      fetch(`${base}/reviews?language=en-US&api_key=${TMDB_KEY}`,
        { signal: ctrl.signal }).then(r => (r.ok ? r.json() : { results: [] })).catch(() => ({ results: [] })),
    ])
      .then(([json, rev]) => {
        const dirEntry = (json.credits?.crew || []).find(p => p.job === 'Director')
          || json.created_by?.[0] || null
        setRichDetail({
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
      .catch(e => { if (e.name !== 'AbortError') setRichDetail({ cast: [], director: null, similarItems: [], reviews: [] }) })
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

  const hasCast     = Array.isArray(cast) && cast.length > 0
  const hasReviews  = Array.isArray(reviews) && reviews.length > 0
  // Zengin kart bölümleri isTrend bayrağına değil verinin varlığına bakar —
  // böylece aynı kart yapısı tüm sekmelerde (trend, listeler, öneriler) ortaktır.
  const hasCriteria = Array.isArray(item.popularityCriteria) && item.popularityCriteria.length > 0

  // Tür + içerik tipi tek satırda düz metin: "Dizi · Dram · Suç". Önce her biri
  // ayrı çerçeveli etiketti; üç kutu bir cümlelik bilgiyi taşıyordu.
  // Tür sayısı 2 ile sınırlı: üçüncüsü satırı sarmalıyor ve kart ritmini bozuyordu.
  const kindWord = (showKind && item.type) ? (item.type === 'film' ? 'Film' : 'Dizi') : null
  const genreWords = (item.genres || []).slice(0, 2)

  return (
    <>
      <div
        className={`cc${isTrend ? ' cc-trend' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`${item.title} — detayları ${open ? 'kapat' : 'aç'}`}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) }
        }}
      >
        {isTrend && <div className="cc-trendbar" />}

        <div className="cc-head">
          <div className="cc-poster">
            <PosterImg path={item.posterPath} title={item.title} />

            {item.trendRank && (
              <div className={`cc-rank tnum${item.trendRank <= 3 ? ' cc-rank-top' : ''}`}>
                {item.trendRank}
              </div>
            )}

            {item.isNewRelease && <div className="cc-new">YENİ</div>}
          </div>

          <div className="cc-body">
            <div className="cc-title-row">
              <span className="cc-title" title={item.title}>{item.title}</span>
              <span className="cc-year tnum">{item.year}</span>
            </div>


            <ScoreLine imdb={item.imdbScore} rt={item.rottenTomatoesScore} lb={item.letterboxdScore} />

            {(kindWord || genreWords.length > 0) && (
              <p className="cc-meta">
                {kindWord && <span className="cc-kind">{kindWord}{genreWords.length > 0 ? ' · ' : ''}</span>}
                {genreWords.join(' · ')}
              </p>
            )}

            {item.socialScore != null && (
              <div className="cc-social">
                <div className="cc-bar"><i style={{ width: `${item.socialScore}%` }} /></div>
                <span className="cc-social-n tnum">{item.socialScore}</span>
              </div>
            )}

            <div className="cc-tags">
              {/* Yerli yapım etiketi platform rozetlerinden ÖNCE gelir: köken
                  yapımın kalıcı özelliğidir, platform ise değişebilir. */}
              {item.isYerli && <span className="tr-tag">TR YAPIMI</span>}
              {(item.platforms || []).map(p => {
                const plat = PLAT_MAP[p]
                return (
                  // Platform rengi MARKA verisidir (PLATFORMS), tema tokenı
                  // değil — bu yüzden satır içi gelir. Mürekkep marka renginin
                  // parlaklığından hesaplanır. Bilinmeyen sağlayıcı CSS'teki
                  // nötr yedeğe düşer.
                  <span
                    key={p}
                    className="cc-plat"
                    style={plat?.color ? { background: plat.color, color: badgeInk(plat.color) } : undefined}
                  >
                    {plat?.badge || p.substring(0, 3).toUpperCase()}
                  </span>
                )
              })}
              {item.duration && <span className="cc-dur tnum">{item.duration} dk</span>}
              <span className="cc-chevron" aria-hidden="true">
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </div>

            {/* Kaydetme grubu bilgiden SONRA gelir: başlık → puan → tür →
                platform sırası "bu ne" sorusunu yanıtlar, eylem en sonda durur.
                Araya girdiğinde okuma akışını kesiyordu.

                Poster üzerinde DEĞİL: ölçüldü, 3×44px hedef 132px ister ve kart
                posteri masaüstünde 108px. Böylece poster sanatı da açıkta kalır. */}
            <SaveControls item={item} size={16} />
          </div>
        </div>

        {/* ── Genişletilmiş Detay ──────────────────────────────────────────── */}
        {open && (
          <div className="cc-detail" onClick={e => e.stopPropagation()}>
            <div className="cc-sec cc-lead">
              <div className="cc-lead-poster">
                <PosterImg path={item.posterPath} title={item.title} />
              </div>
              <div className="cc-lead-body">
                {item.description && <p className="cc-desc">{item.description}</p>}
                {item.trendReason && <p className="cc-trend-reason">{item.trendReason}</p>}
                {item.originalTitle && item.originalTitle !== item.title && (
                  <p className="cc-desc-alt">Orijinal adı: {item.originalTitle}</p>
                )}
                {item.releaseDate && (
                  <p className="cc-desc-alt">
                    Yayın tarihi: {new Date(item.releaseDate).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
                <TrailerEmbed trailerKey={trailerKey} />
              </div>
            </div>

            {effectiveTmdbId && (
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
              onMiniClick={setOverlayItem}
            />

            {director && (
              <MiniSection
                title={`${director.name} — diğer yapımları`}
                items={directorWorks}
                loading={directorWorks === null}
                onMiniClick={setOverlayItem}
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
                          {filmo.map(mini => <MiniCard key={mini.tmdbId} item={mini} onClick={setOverlayItem} />)}
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

            {!hasCast && !hasReviews && !effectiveTmdbId && <div style={{ height: 14 }} />}
          </div>
        )}
      </div>

      {/* Detail Overlay (portal) */}
      {overlayItem && (
        <DetailOverlay item={overlayItem} onClose={() => setOverlayItem(null)} />
      )}
    </>
  )
}
