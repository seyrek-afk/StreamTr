import Sheet from './Sheet.jsx'

// Filtre alt sayfası — telefonda bütün filtre eksenleri tek yerde.
//
// Masaüstünde beş açılır menü yan yana durur; telefonda bunlar yatay kayan bir
// satıra sıkışıyor ve her menü viewport matematiğiyle konumlanıyordu. Alt
// sayfada her eksen kendi başlıklı bölümünde, seçenekler ÇİP olarak (dokun =
// seç) sarılı durur: mevcut seçim menü açmadan görünür, 44px hedef doğal.
//
// Çipler uygulamanın kontrol dilini (.ctl / .ctl-on) konuşur; yeni bir dil
// icat edilmez. Altbilgi iki eylem: Temizle (yalnız filtre varken) ve
// "Sonuçları göster · N" — kullanıcı sayfayı kapatmadan kaç sonuç kaldığını görür.
export default function FilterSheet({ open, onClose, resultCount, hasActive, onClear, children }) {
  const footer = (
    <>
      {hasActive && (
        <button className="btn btn-quiet" onClick={onClear}>Temizle</button>
      )}
      <button className="btn" onClick={onClose}>
        {resultCount == null
          ? 'Uygula'
          : <>Sonuçları göster <span className="tnum sheet-count">· {resultCount}</span></>}
      </button>
    </>
  )
  return (
    <Sheet open={open} onClose={onClose} title="Filtrele" footer={footer}>
      {children}
    </Sheet>
  )
}

export function FilterSection({ title, children }) {
  return (
    <section className="fsec">
      <p className="fsec-title">{title}</p>
      {children}
    </section>
  )
}

// Çip grubu: tekli (radyo) ya da çoklu (onay) seçim.
// allowClear: tekli modda seçiliye yeniden dokunmak seçimi kaldırır (null).
export function ChipGroup({ options, value, onChange, multi = false, allowClear = false, label }) {
  const isOn = (v) => multi ? (value || []).includes(v) : value === v
  const toggle = (v) => {
    if (multi) {
      const cur = value || []
      onChange(cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v])
    } else if (value === v) {
      if (allowClear) onChange(null)
    } else {
      onChange(v)
    }
  }
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map(o => {
        const on = isOn(o.value)
        return (
          <button
            key={String(o.value)}
            type="button"
            className={`ctl${on ? ' ctl-on' : ''}`}
            aria-pressed={on}
            onClick={() => toggle(o.value)}
          >
            {o.label}
            {o.count != null && <span className="ctl-count tnum">{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
