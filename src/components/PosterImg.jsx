import { useState } from 'react'
import { Film } from 'lucide-react'
import { POSTER_GRADIENTS } from '../constants/index.js'

// Poster yoksa başlıktan türetilen sabit bir degrade + film ikonu gösterilir.
// Emoji KULLANILMAZ: her platformda farklı çizilir ve ikon setinin çizgisiyle
// uyuşmaz. alt="" bilinçli: başlık zaten kartın kendi etiketinde okunuyor,
// ekran okuyucuya iki kez söylemenin faydası yok.
export default function PosterImg({ path, title }) {
  const [err, setErr]       = useState(false)
  const [loaded, setLoaded] = useState(false)

  const idx = title ? Math.abs(title.charCodeAt(0) + (title.charCodeAt(1) || 0)) % POSTER_GRADIENTS.length : 0
  const [c1, c2] = POSTER_GRADIENTS[idx]

  if (!path || err) {
    return (
      <div className="poster-fallback" style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)` }}>
        <Film size={20} aria-hidden="true" />
        <span>{(title || '').substring(0, 24)}</span>
      </div>
    )
  }

  return (
    <div className="poster-img" style={{ background: `linear-gradient(160deg,${c1},${c2})` }}>
      <img
        src={`https://image.tmdb.org/t/p/w185${path}`}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setErr(true)}
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  )
}
