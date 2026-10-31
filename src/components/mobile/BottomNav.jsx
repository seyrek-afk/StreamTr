import { Loader } from 'lucide-react'

// Alt sekme çubuğu — telefonda birincil gezinme başparmak bölgesinde.
//
// Üst sekmeler telefonda iki sorun çıkarıyordu: yapışkan başlıkta 44px yer
// tutuyor ve ekranın en uzak köşesinde duruyorlardı. Alt çubuk ikisini de
// çözer; iOS/Android'in kendi uygulamalarının kalıbı olduğu için öğrenme
// maliyeti sıfır.
//
// Aktif sekmeye yeniden dokunmak sayfayı başa sarar: uzun listede yukarı
// dönmenin standart telefon hareketi.
export default function BottomNav({ tabs, active, onChange, iconFor, busyFor }) {
  return (
    <nav className="bnav" aria-label="Bölümler">
      {tabs.map(t => {
        const on   = t.id === active
        const busy = Boolean(busyFor?.(t))
        const Icon = busy ? Loader : iconFor(t)
        return (
          <button
            key={t.id}
            type="button"
            className={`bnav-item${on ? ' bnav-item-on' : ''}`}
            aria-current={on ? 'page' : undefined}
            onClick={() => {
              if (on) window.scrollTo?.({ top: 0, behavior: 'smooth' })
              else onChange(t.id)
            }}
          >
            <Icon size={22} className={busy ? 'spin' : undefined} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
