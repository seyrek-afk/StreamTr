import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useFormFactor, resolveFormFactor } from '../hooks/useFormFactor.js'

// Cihaz bağlamı — tek karar, iki tüketici.
//
// Karar `useFormFactor`tan gelir, kullanıcı tercihiyle (override) birleşir ve
// <html data-ff="phone" data-input="touch"> olarak köke yazılır. Böylece:
//   CSS   [data-ff="phone"] .x { … }      → biçimsel farklar
//   React const { isPhone } = useDevice()  → yapısal farklar (alt sekme çubuğu,
//                                            alt sayfa, tam ekran arama)
// İkisi AYNI karara bakar; ortam sorgusunu bir de CSS'te tekrar etmek iki
// mekanizmanın birbirinden kopmasına yol açardı.
//
// Tercih cihaz tercihidir (tema gibi), hesaba bağlı değil: localStorage.
// Denetlenebilirlik: karar otomatik ama görünür (hesap menüsü "Görünüm"
// bölümü algılananı yazar) ve geri alınabilir (Otomatik / Telefon / Masaüstü).
const STORAGE_KEY = 'streamtr-gorunum'
export const OVERRIDES = ['auto', 'phone', 'desktop']

export const FF_LABEL = { phone: 'telefon', tablet: 'tablet', desktop: 'masaüstü' }

const DeviceContext = createContext(null)

function readOverride() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return OVERRIDES.includes(saved) ? saved : 'auto'
  } catch {
    return 'auto'
  }
}

// Geliştirme kolaylığı: ?ff=phone|desktop kararı zorlar ve SAKLANMAZ.
// Yalnız DEV derlemesinde okunur — üretimde URL parametresi görünümü değiştirmez.
function readUrlForce() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  const p = new URLSearchParams(window.location.search).get('ff')
  return p === 'phone' || p === 'desktop' ? p : null
}

export function DeviceProvider({ children }) {
  const detected = useFormFactor()
  const [override, setOverrideState] = useState(readOverride)
  const [urlForce] = useState(readUrlForce)

  const setOverride = useCallback((v) => {
    const next = OVERRIDES.includes(v) ? v : 'auto'
    setOverrideState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* özel pencere: tercih bu oturumda kalır */ }
  }, [])

  const formFactor = resolveFormFactor(detected.formFactor, urlForce || override)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.ff = formFactor
    root.dataset.input = detected.input
    if (detected.installed) root.dataset.installed = 'true'
    else delete root.dataset.installed
  }, [formFactor, detected.input, detected.installed])

  const value = useMemo(() => ({
    formFactor,
    input: detected.input,
    installed: detected.installed,
    detectedFormFactor: detected.formFactor,
    override,
    setOverride,
    isPhone: formFactor === 'phone',
    isTouch: detected.input === 'touch',
  }), [formFactor, detected, override, setOverride])

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
}

// Sağlayıcısız kullanım (yalıtılmış bileşen testleri) masaüstüye düşer;
// bileşenler bağlam yok diye patlamaz.
const FALLBACK = {
  formFactor: 'desktop', input: 'pointer', installed: false,
  detectedFormFactor: 'desktop', override: 'auto', setOverride: () => {},
  isPhone: false, isTouch: false,
}

export const useDevice = () => useContext(DeviceContext) ?? FALLBACK
