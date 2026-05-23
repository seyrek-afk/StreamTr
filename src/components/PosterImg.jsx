import { useState } from 'react'
import { POSTER_GRADIENTS } from '../constants/index.js'

export default function PosterImg({ path, title }) {
  const [err, setErr]     = useState(false)
  const [loaded, setLoaded] = useState(false)

  const idx    = title ? Math.abs(title.charCodeAt(0) + (title.charCodeAt(1) || 0)) % POSTER_GRADIENTS.length : 0
  const [c1, c2] = POSTER_GRADIENTS[idx]

  const fallback = (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 8, gap: 5,
    }}>
      <span style={{ fontSize: 22, opacity: 0.85 }}>🎬</span>
      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 8.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word' }}>
        {(title || '').substring(0, 22)}
      </span>
    </div>
  )

  if (!path || err) return fallback

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: `linear-gradient(160deg,${c1},${c2})` }}>
      <img
        src={`https://image.tmdb.org/t/p/w185${path}`}
        alt={title}
        onLoad={() => setLoaded(true)}
        onError={() => setErr(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s', display: 'block' }}
      />
    </div>
  )
}
