import { Star } from 'lucide-react'
import { useFavorites } from '../contexts/FavoritesContext.jsx'

// Favori tuşu — poster üzerinde yaşar, bu yüzden kendi koyu diski var:
// posterin rengi ne olursa olsun yıldız okunur kalmalı.
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
      className={`fav-btn${active ? ' fav-btn-on' : ''}`}
      style={{ width: size + 16, height: size + 16 }}
    >
      <Star size={size} fill={active ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}
