import { useEffect, useRef, useState } from 'react'
import { LogIn, LogOut, Mail, UserRound } from 'lucide-react'
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

  return (
    <div className="acct" ref={ref}>
      <button
        className="ctl"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={menuOpen}
      >
        {/* AVATAR YOK — bilinçli. Sağlayıcıdan gelen profil fotoğrafı denenmişti;
            başlık rayındaki diğer her kontrol (Giriş, Tema) ikon + etiket
            kullanırken oraya konan yuvarlak fotoğraf yabancı bir cisim kalıyor,
            ayrıca dış kaynaklı görsel yüklenemediğinde kırık resim gösteriyordu.
            Profil fotoğrafını gerçekten sunmak ayrı bir iş: depolama kovası,
            RLS, boyut/format doğrulaması ve bir ayar ekranı. Dekoratif bir öge
            için bu maliyet alınmadı. İleride istenirse hazır avatar seti ya da
            yükleme buraya eklenebilir; sözleşme bu düğmeyle sınırlı. */}
        <UserRound size={15} style={{ color: 'var(--accent-ink)' }} aria-hidden="true" />
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
