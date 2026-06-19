import { useEffect, useRef, useState } from 'react'
import { LogIn, LogOut, User, Mail } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import AuthModal from './AuthModal.jsx'

// Başlık hesap düğmesi. Giriş yoksa "Giriş" → modal. Giriş varsa ad + açılır menü (çıkış).
export default function AccountButton() {
  const { user, isAuthed, signOut } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  if (!isAuthed) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          title="Giriş yap veya kayıt ol"
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999, padding: '6px 12px', color: 'var(--text-muted)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <LogIn size={13} style={{ color: 'var(--accent)' }} /> Giriş
        </button>
        <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    )
  }

  const initial = (user.name || user.email || '?').slice(0, 1).toUpperCase()

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={menuOpen}
        style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 999, padding: '4px 10px 4px 4px', color: 'var(--text)', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
        }}
      >
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="" width={22} height={22} style={{ borderRadius: '50%' }} referrerPolicy="no-referrer" />
          : <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(var(--accent-rgb),0.2)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{initial}</span>}
        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
      </button>

      {menuOpen && (
        <div role="menu" style={{
          position: 'absolute', right: 0, marginTop: 8, width: 230, zIndex: 210,
          background: '#13131f', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12, padding: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: '6px 8px 8px' }}>
            <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
            {user.email && (
              <p style={{ color: 'var(--text-faint)', fontSize: 11, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Mail size={11} /> {user.email}
              </p>
            )}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '2px 0' }} />
          <button onClick={() => { setMenuOpen(false); signOut() }} role="menuitem"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', borderRadius: 8, padding: '8px',
              color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#ff8a8a' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <LogOut size={14} /> Çıkış yap
          </button>
        </div>
      )}
    </div>
  )
}
