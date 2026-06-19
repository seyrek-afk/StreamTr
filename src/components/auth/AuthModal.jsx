import { useEffect, useRef, useState } from 'react'
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

  const field = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 9, padding: '10px 12px',
    color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
  }
  const primaryBtn = {
    width: '100%', marginTop: 4,
    background: 'var(--accent)', color: '#0b0b14',
    border: 'none', borderRadius: 10, padding: '11px 16px',
    fontSize: 13.5, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', opacity: busy ? 0.6 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 220,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        role="dialog" aria-modal="true" aria-label="Hesap"
        style={{
          background: '#13131f', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, width: '100%', maxWidth: 380, overflow: 'hidden',
        }}
      >
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {step === 'code' && (
              <button onClick={() => { setStep('form'); setError(''); setInfo('') }} aria-label="Geri"
                style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 style={{ color: 'var(--text)', fontSize: 14.5, fontWeight: 700, margin: 0 }}>
              {step === 'form' ? 'Giriş yap / Kayıt ol' : 'E-postanı doğrula'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Kapat"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '5px 6px', color: 'var(--text-faint)', cursor: 'pointer', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 11 }}>
          {!configured ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
              Giriş henüz yapılandırılmamış. Yöneticinin <code style={{ color: 'var(--accent)' }}>VITE_SUPABASE_URL</code> ve{' '}
              <code style={{ color: 'var(--accent)' }}>VITE_SUPABASE_ANON_KEY</code> değerlerini ayarlaması gerekir.
            </p>
          ) : step === 'form' ? (
            <>
              <p style={{ color: 'var(--text-faint)', fontSize: 11.5, lineHeight: 1.6, margin: '0 0 2px' }}>
                Favorilerini tüm cihazlarında görmek için giriş yap. Şifre yok — e-postana tek kullanımlık bir kod gönderiyoruz.
              </p>

              {/* Google */}
              <button onClick={onGoogle} disabled={busy}
                style={{
                  width: '100%', background: '#fff', color: '#1f1f1f',
                  border: 'none', borderRadius: 10, padding: '10px 14px',
                  fontSize: 13, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                }}>
                <GoogleIcon /> Google ile devam et
              </button>

              <div style={{ position: 'relative', textAlign: 'center', margin: '4px 0' }}>
                <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px solid rgba(255,255,255,0.08)' }} />
                <span style={{ position: 'relative', background: '#13131f', padding: '0 10px', color: 'var(--text-faint)', fontSize: 11 }}>veya e-posta ile</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input style={field} placeholder="Ad" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <input style={field} placeholder="Soyad (ops.)" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={15} style={{ position: 'absolute', left: 11, color: 'var(--text-faint)', pointerEvents: 'none' }} />
                <input style={{ ...field, paddingLeft: 34 }} type="email" placeholder="E-posta" value={email}
                  onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSend()} />
              </div>

              <button onClick={onSend} disabled={busy} style={primaryBtn}>
                {busy ? <Loader size={15} className="spin" /> : <User size={15} />} Kod gönder
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 12.5 }}>
                <ShieldCheck size={15} /> {email} adresine gönderilen kodu gir
              </div>
              <input
                style={{ ...field, textAlign: 'center', letterSpacing: '0.5em', fontSize: 20, fontFamily: 'monospace' }}
                placeholder="••••••" inputMode="numeric" maxLength={6} autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && onVerify()}
              />
              <button onClick={onVerify} disabled={busy || code.length < 6} style={primaryBtn}>
                {busy ? <Loader size={15} className="spin" /> : <ShieldCheck size={15} />} Doğrula ve gir
              </button>
              <button onClick={onSend} disabled={busy}
                style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                Kod gelmedi mi? Tekrar gönder
              </button>
            </>
          )}

          {error && <p style={{ color: '#ff8a8a', background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.25)', borderRadius: 8, padding: '8px 11px', fontSize: 11.5, margin: 0 }}>{error}</p>}
          {info && <p style={{ color: '#86efac', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '8px 11px', fontSize: 11.5, margin: 0 }}>{info}</p>}
        </div>
      </div>
    </div>
  )
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
