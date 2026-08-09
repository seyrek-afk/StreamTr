import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Play } from 'lucide-react'

// Resmi / güvenilir kaynaktan (YouTube, gizlilik modunda) fragman oynatıcı.
// Tıklayınca sayfanın üstünde büyük bir popup pencerede oynatır; harici sitelere gitmez.
export default function TrailerEmbed({ trailerKey, compact = false }) {
  const [playing, setPlaying] = useState(false)

  // Popup açıkken: ESC ile kapat + arka plan kaydırmasını kilitle
  useEffect(() => {
    if (!playing) return
    const h = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setPlaying(false) } }
    document.addEventListener('keydown', h, { capture: true })
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', h, { capture: true })
      document.body.style.overflow = prevOverflow
    }
  }, [playing])

  if (!trailerKey) return null

  const modal = playing && createPortal(
    <div className="player-scrim" onClick={e => { e.stopPropagation(); setPlaying(false) }}>
      <div className="player" onClick={e => e.stopPropagation()}>
        <button
          className="player-close"
          onClick={e => { e.stopPropagation(); setPlaying(false) }}
          aria-label="Fragmanı kapat"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className="player-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
            title="Fragman"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>,
    document.body
  )

  return (
    <>
      <button
        className={`btn btn-quiet${compact ? ' btn-compact' : ''}`}
        onClick={e => { e.preventDefault(); e.stopPropagation(); setPlaying(true) }}
      >
        <Play size={14} fill="currentColor" aria-hidden="true" /> Fragman
      </button>
      {modal}
    </>
  )
}
