import { useEffect, useRef, useState } from 'react'
import { LogIn, LogOut, Mail, UserRound, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useTheme } from '../../contexts/ThemeContext.jsx'
import AuthModal from './AuthModal.jsx'

// Başlıktaki TEK hesap kontrolü — hem oturum hem görünüm ayarları burada.
//
// Önce başlıkta iki ayrı düğme vardı (Hesap + Tema) ve tema kendi modalını
// açıyordu. Tema, günde bir kez dokunulan bir tercih; kendi başına başlıkta
// yer tutmayı hak etmiyordu ve modal beş kartlık bir sahne kurmak için
// ekranı karartıyordu. Artık hesap menüsünün bir bölümü.
//
// Menü giriş yapılmamışken de açılır: tema bir hesap ayarı değil, cihaz
// tercihi — ziyaretçiden esirgemek için sebep yok. Oturumsuz durumda menünün
// ilk maddesi "Giriş yap" olur, böylece asıl eylem hâlâ en üstte.
export default function AccountButton() {
  const { user, isAuthed, signOut } = useAuth()
  const { themeId, setThemeId, themes } = useTheme()
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

  return (
    <div className="acct" ref={ref}>
      <button
        className="ctl"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={isAuthed ? 'Hesap ve görünüm' : 'Giriş ve görünüm'}
      >
        {/* AVATAR YOK — bilinçli. Sağlayıcıdan gelen profil fotoğrafı denenmişti;
            başlık rayındaki diğer kontroller ikon + etiket kullanırken oraya
            konan yuvarlak fotoğraf yabancı bir cisim kalıyor, ayrıca dış
            kaynaklı görsel yüklenemediğinde kırık resim gösteriyordu. */}
        <UserRound size={15} style={{ color: 'var(--accent-ink)' }} aria-hidden="true" />
        <span className="acct-name hide-narrow">{isAuthed ? user.name : 'Hesap'}</span>
        <ChevronDown
          size={14} className="dd-chevron" aria-hidden="true"
          style={{ transform: menuOpen ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {menuOpen && (
        <div role="menu" className="acct-menu">
          {isAuthed ? (
            <div className="acct-head">
              <p className="acct-head-name">{user.name}</p>
              {user.email && (
                <p className="acct-head-mail">
                  <Mail size={13} aria-hidden="true" /> {user.email}
                </p>
              )}
            </div>
          ) : (
            <button
              role="menuitem"
              className="acct-item acct-item-primary"
              onClick={() => { setMenuOpen(false); setModalOpen(true) }}
            >
              <LogIn size={15} aria-hidden="true" /> Giriş yap
            </button>
          )}

          <div className="acct-sec">
            <p className="acct-sec-title">Tema</p>
            {themes.map(t => {
              const active = themeId === t.id
              return (
                <button
                  key={t.id}
                  role="menuitemradio"
                  aria-checked={active}
                  className={`acct-theme${active ? ' acct-theme-on' : ''}`}
                  // Menü seçimde KAPANMAZ: tema denenerek seçilir, her denemede
                  // menüyü yeniden açtırmak seçimi bir işkenceye çevirirdi.
                  onClick={() => setThemeId(t.id)}
                >
                  {/* Noktalar temanın kendi `preview` üçlüsünden gelir, aktif
                      temanın tokenlarından değil: burada gösterilen şey aktif
                      tema değil, seçilebilecek başka bir tema. */}
                  <span className="acct-theme-dots" aria-hidden="true">
                    {t.preview.map((c, i) => <i key={i} style={{ background: c }} />)}
                  </span>
                  <span className="acct-theme-name">{t.label}</span>
                  {active && <Check size={14} style={{ color: 'var(--accent-ink)' }} aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          {isAuthed && (
            <div className="acct-sec">
              <button onClick={() => { setMenuOpen(false); signOut() }} role="menuitem" className="acct-item">
                <LogOut size={15} aria-hidden="true" /> Çıkış yap
              </button>
            </div>
          )}
        </div>
      )}

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
