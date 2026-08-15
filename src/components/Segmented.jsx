// Bölmeli anahtar — az sayıda, birbirini dışlayan seçenek için.
//
// Açılır menüye tercih edilir: seçenekler zaten üçtür, menüde saklamak tek
// tıklık bir kararı iki adıma çıkarıyor ve mevcut durumu görmek için menüyü
// açmayı gerektiriyor. Uygulamada bu dil zaten var — kapsam merceği (Dünya /
// Yerli / Ülke) aynı bileşenin ilk örneği.
export default function Segmented({ label, value, options, onChange }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          className="seg-option"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
