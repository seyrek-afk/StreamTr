import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

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
    <div
      onClick={e => { e.stopPropagation(); setPlaying(false) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '4vh 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', width: 'min(1100px, 96vw)' }}
      >
        <button
          onClick={e => { e.stopPropagation(); setPlaying(false) }}
          aria-label="Fragmanı kapat"
          style={{
            position: 'absolute', top: -14, right: -14, zIndex: 10,
            background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '50%', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
          }}
        >
          <X size={16} />
        </button>
        <div style={{
          width: '100%', aspectRatio: '16 / 9', maxHeight: '86vh',
          background: '#000', borderRadius: 12, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.75)',
        }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
            title="Fragman"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        </div>
      </div>
    </div>,
    document.body
  )

  return (
    <>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setPlaying(true) }}
        className="btn-pressable"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 5,
          background: 'rgba(210,55,55,0.12)',
          border: '1px solid rgba(210,55,55,0.28)',
          borderRadius: 6, padding: compact ? '4px 10px' : '5px 12px',
          fontSize: compact ? 10 : 11, fontWeight: 700, color: '#e07070',
          cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start',
          transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
        }}
      >▶ Fragmanı İzle</button>
      {modal}
    </>
  )
}
