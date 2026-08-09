import { useEffect, useRef, useState } from 'react'
import { LogIn, LogOut, Mail } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import AuthModal from './AuthModal.jsx'

// Başlık hesap düğmesi. Giriş yoksa "Giriş" → modal. Giriş varsa ad + açılır menü.
// Ortak kontrol dilini kullanır: tema düğmesiyle aynı yükseklik, yarıçap ve
// odak halkası — başlıkta iki farklı düğme dili kalmadı.
export default function AccountButton() {
  const { user, isAuthed, signOut } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menuOpen])

  if (!isAuthed) {
    return (
      <>
        <button className="ctl" onClick={() => setModalOpen(true)} title="Giriş yap veya kayıt ol">
          <LogIn size={15} style={{ color: 'var(--accent-ink)' }} aria-hidden="true" />
          <span className="hide-narrow">Giriş</span>
        </button>
        <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    )
  }

  const initial = (user.name || user.email || '?').slice(0, 1).toUpperCase()

  return (
    <div className="acct" ref={ref}>
      <button
        className="ctl"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={menuOpen}
      >
        {user.avatarUrl
          ? <img className="acct-avatar" src={user.avatarUrl} alt="" width={22} height={22} referrerPolicy="no-referrer" />
          : <span className="acct-avatar acct-initial">{initial}</span>}
        <span className="acct-name hide-narrow">{user.name}</span>
      </button>

      {menuOpen && (
        <div role="menu" className="acct-menu">
          <div className="acct-head">
            <p className="acct-head-name">{user.name}</p>
            {user.email && (
              <p className="acct-head-mail">
                <Mail size={13} aria-hidden="true" /> {user.email}
              </p>
            )}
          </div>
          <button onClick={() => { setMenuOpen(false); signOut() }} role="menuitem" className="acct-item">
            <LogOut size={15} aria-hidden="true" /> Çıkış yap
          </button>
        </div>
      )}
    </div>
  )
}
