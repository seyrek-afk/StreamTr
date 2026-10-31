import { useEffect, useState } from 'react'

// Cihaz tanıma — UA (user agent) okumadan, tarayıcının kendi söylediği
// yeteneklerden. UA kırılgan: iPad masaüstü Safari gibi görünür, Chrome UA'yı
// sadeleştirdi. Ortam sorguları (matchMedia) ise tarayıcının o anki gerçek
// durumunu söyler ve değişince haber verir.
//
// Üç bağımsız eksen:
//   formFactor  phone | tablet | desktop  → YERLEŞİM kararı (alt sekme çubuğu,
//                                            alt sayfalar, tam ekran arama)
//   input       touch | pointer           → GİRDİ kararı (hedef boyu, hover yok,
//                                            vitrin otomatik dönmez)
//   installed   bool                      → ana ekrana eklenmiş (standalone) PWA
//
// Karar matrisi:
//   genişlik < 720            → phone   (işaretçi ne olursa olsun: daraltılmış
//                                        masaüstü penceresi de telefon kabuğunu
//                                        alır, böylece DevTools'ta aynı şey görülür)
//   720–1079 ve parmak        → tablet  (masaüstü yerleşimi, dokunmatik ölçek)
//   gerisi                    → desktop
//
// Yalnız GENİŞLİK dinlenir, yükseklik değil: Android'de klavye açılınca viewport
// yüksekliği yarıya iner; yüksekliğe tepki veren bir kabuk klavyeyle birlikte
// değişirdi. matchMedia yalnız eşik aşıldığında tetiklenir — debounce gerekmez.
export const PHONE_MAX  = 719   // < 720px → telefon (index.css'teki 720 kırılımıyla aynı)
export const TABLET_MAX = 1079  // < 1080px ve parmak → tablet

const QUERIES = {
  phone:      `(max-width: ${PHONE_MAX}px)`,
  narrow:     `(max-width: ${TABLET_MAX}px)`,
  coarse:     '(pointer: coarse)',
  noHover:    '(hover: none)',
  standalone: '(display-mode: standalone)',
}

export const FORM_FACTORS = ['phone', 'tablet', 'desktop']

const SAFE_DEFAULT = { formFactor: 'desktop', input: 'pointer', installed: false }

function mq(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(query) || null
}

// Saf karar: o anki ortam sorgularından üç ekseni üretir. Test edilebilir
// olması için kanca dışında yaşar; `window` yoksa (SSR, jsdom'da matchMedia
// yoksa) masaüstü varsayılanına düşer — yanlış karar en zararsız yönde.
export function detectDevice() {
  if (typeof window === 'undefined') return SAFE_DEFAULT
  const m = (k) => Boolean(mq(QUERIES[k])?.matches)

  // Parmak: kaba işaretçi YA DA hover yok. İkisi birden aranmaz — bazı Android
  // tarayıcıları (hover: hover) bildirir ama işaretçi yine de kabadır.
  // navigator.userAgentData.mobile yalnız ikincil ipucu (Chromium'a özel).
  const touch = m('coarse') || m('noHover') || window.navigator?.userAgentData?.mobile === true
  const input = touch ? 'touch' : 'pointer'

  const formFactor = m('phone') ? 'phone' : (m('narrow') && touch) ? 'tablet' : 'desktop'

  // iOS Safari display-mode'u destekler ama eski sürümler için navigator.standalone yedek.
  const installed = m('standalone') || window.navigator?.standalone === true

  return { formFactor, input, installed }
}

// Kullanıcı tercihi kararı ezer: "Masaüstü görünümü iste"nin karşılığı.
// Tablet zorlanamaz — o bir ara durumdur, kullanıcının seçeceği iki uç var.
export function resolveFormFactor(detected, override) {
  if (override === 'phone' || override === 'desktop') return override
  return detected
}

function same(a, b) {
  return a.formFactor === b.formFactor && a.input === b.input && a.installed === b.installed
}

function listen(list, fn) {
  if (!list) return () => {}
  if (typeof list.addEventListener === 'function') {
    list.addEventListener('change', fn)
    return () => list.removeEventListener('change', fn)
  }
  // Eski Safari (< 14): addListener/removeListener.
  if (typeof list.addListener === 'function') {
    list.addListener(fn)
    return () => list.removeListener(fn)
  }
  return () => {}
}

// Ortam sorgularına abone olur; eşik aşıldığında (döndürme, pencere
// daraltma, ana ekrana ekleme) kararı yeniler. Aynı karar yeniden üretilirse
// state değişmez — gereksiz yeniden çizim yok.
export function useFormFactor() {
  const [device, setDevice] = useState(detectDevice)

  useEffect(() => {
    const update = () => setDevice(prev => {
      const next = detectDevice()
      return same(prev, next) ? prev : next
    })
    const unsubs = Object.values(QUERIES).map(q => listen(mq(q), update))
    // İlk çizim ile abonelik arasında değişen bir şey varsa yakala.
    update()
    return () => unsubs.forEach(u => u())
  }, [])

  return device
}
