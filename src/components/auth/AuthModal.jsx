import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Mail, User, ShieldCheck, Loader, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext.jsx'

// Hafif kimlik modalı (TechTrend-Radar tarzı): ad + e-posta → tek kullanımlık kod → giriş.
// Ayrıca "Google ile devam et". Inline stiller, StreamTR temasıyla uyumlu.
export default function AuthModal({ open, onClose }) {
  const { configured, sendEmailCode, verifyEmailCode, googleSignIn } = useAuth()
  const [step, setStep] = useState('form') // form | code
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  useEffect(() => {
    if (!open) return
    setStep('form'); setError(''); setInfo(''); setCode('')
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const run = async (fn) => {
    setBusy(true); setError(''); setInfo('')
    try { await fn() } catch (e) { setError(e?.message || 'Bir hata oluştu.') }
    finally { setBusy(false) }
  }

  const onSend = () => run(async () => {
    if (!firstName.trim()) throw new Error('Lütfen adınızı girin.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Geçerli bir e-posta girin.')
    await sendEmailCode({ email, firstName, lastName })
    setStep('code')
    setInfo('E-postana 6 haneli bir kod gönderdik. Gelen kutunu (ve spam) kontrol et.')
  })

  const onVerify = () => run(async () => {
    if (code.trim().length < 6) throw new Error('6 haneli kodu gir.')
    await verifyEmailCode({ email, code, firstName, lastName })
    onClose?.()
  })

  const onGoogle = () => run(async () => { await googleSignIn() })

  // Portal ile body'e taşınır: yapışkan başlık kendi yığın bağlamını kurduğu
  // için position:fixed'i kendine bağlar, modal ekranın üstüne taşardı.
  return createPortal((
    <div className="modal-scrim" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal modal-auth" role="dialog" aria-modal="true" aria-label="Hesap">
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {step === 'code' && (
              <button className="icon-btn" aria-label="Geri"
                onClick={() => { setStep('form'); setError(''); setInfo('') }}>
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
            )}
            <h2 className="modal-title">
              {step === 'form' ? 'Giriş yap' : 'E-postanı doğrula'}
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="auth-body">
          {!configured ? (
            <p className="cc-desc">
              Giriş henüz yapılandırılmamış. Yöneticinin <code>VITE_SUPABASE_URL</code> ve{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> değerlerini ayarlaması gerekir.
            </p>
          ) : step === 'form' ? (
            <>
              <p className="cc-desc-alt" style={{ lineHeight: 1.65 }}>
                Favorilerini tüm cihazlarında görmek için giriş yap. Şifre yok — e-postana
                tek kullanımlık bir kod gönderiyoruz.
              </p>

              <button className="btn btn-google" onClick={onGoogle} disabled={busy}>
                <GoogleIcon /> Google ile devam et
              </button>

              <div className="auth-sep"><span>veya e-posta ile</span></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input className="field" placeholder="Ad" aria-label="Ad" value={firstName}
                  onChange={(e) => setFirstName(e.target.value)} />
                <input className="field" placeholder="Soyad (isteğe bağlı)" aria-label="Soyad" value={lastName}
                  onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="field-with-icon">
                <Mail size={16} aria-hidden="true" />
                <input className="field" type="email" placeholder="E-posta" aria-label="E-posta" value={email}
                  onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSend()} />
              </div>

              <button className="btn auth-primary" onClick={onSend} disabled={busy}>
                {busy ? <Loader size={16} className="spin" aria-hidden="true" /> : <User size={16} aria-hidden="true" />}
                Kod gönder
              </button>
            </>
          ) : (
            <>
              <p className="cc-desc-alt" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} aria-hidden="true" /> {email} adresine gönderilen kodu gir.
              </p>
              <input
                className="field field-code tnum"
                placeholder="••••••" inputMode="numeric" maxLength={6} autoFocus
                aria-label="Doğrulama kodu"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && onVerify()}
              />
              <button className="btn auth-primary" onClick={onVerify} disabled={busy || code.length < 6}>
                {busy ? <Loader size={16} className="spin" aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
                Doğrula ve gir
              </button>
              <button className="link-btn" onClick={onSend} disabled={busy} style={{ alignSelf: 'center' }}>
                Kod gelmedi mi? Tekrar gönder
              </button>
            </>
          )}

          {error && <p className="auth-msg auth-msg-error">{error}</p>}
          {info  && <p className="auth-msg auth-msg-ok">{info}</p>}
        </div>
      </div>
    </div>
  ), document.body)
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
