import { Star } from 'lucide-react'
import { useFavorites } from '../contexts/FavoritesContext.jsx'

// ⭐ Favori (beğeni) tuşu — kart ve detay ekranlarında kullanılır.
export default function FavoriteButton({ item, size = 16 }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const active = isFavorite(item)

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation() // kartı açma / overlay'i kapatma tetiklenmesin
    toggleFavorite(item)
  }

  return (
    <button
      onClick={handleClick}
      title={active ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      aria-label={active ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      aria-pressed={active}
      className="btn-pressable"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size + 14, height: size + 14,
        borderRadius: '50%',
        background: active ? 'rgba(var(--accent-rgb),0.18)' : 'rgba(0,0,0,0.55)',
        border: `1px solid ${active ? 'var(--accent)' : 'rgba(255,255,255,0.18)'}`,
        cursor: 'pointer', padding: 0,
        backdropFilter: 'blur(4px)',
        transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
      }}
    >
      <Star
        size={size}
        fill={active ? 'var(--accent)' : 'none'}
        color={active ? 'var(--accent)' : 'var(--text-faint)'}
      />
    </button>
  )
}
