import { useState } from 'react'

// Resmi / güvenilir kaynaktan (YouTube, gizlilik modunda) gömülü fragman oynatıcı.
// Tıklayınca uygulama içinde iframe ile oynatır; harici/yasal olmayan sitelere gitmez.
export default function TrailerEmbed({ trailerKey, compact = false }) {
  const [playing, setPlaying] = useState(false)
  if (!trailerKey) return null

  if (playing) {
    return (
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', aspectRatio: '16 / 9',
          borderRadius: 8, overflow: 'hidden', marginTop: 8,
          background: '#000', border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
          title="Fragman"
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    )
  }

  return (
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
  )
}
