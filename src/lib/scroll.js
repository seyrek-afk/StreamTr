// ── Sayfa kaydırma yardımcıları ──────────────────────────────────────────────
//
// Başlık yapışkan (.app-header) ve yüksekliği kabuğa göre değişir (telefon tek
// bant, masaüstü iki bant); hedef konumdan çalışma anında ölçülüp düşülür.

export const HEADER_SELECTOR = '.app-header'
export const SCROLL_GAP = 8

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)')?.matches)
  } catch {
    return false
  }
}

export function scrollBehavior() {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}

export function scrollToTop() {
  if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return
  window.scrollTo({ top: 0, behavior: scrollBehavior() })
}

export function headerHeight() {
  if (typeof document === 'undefined') return 0
  const header = document.querySelector(HEADER_SELECTOR)
  if (!header) return 0
  const rectHeight = header.getBoundingClientRect?.().height || 0
  return rectHeight || header.offsetHeight || 0
}

// Hedefin tepesi başlığın altında ve görünümün üst yarısındaysa yeterince
// görünür sayılır; en üstteyken gereksiz sıçrama olmasın.
export function isTopVisibleBelowHeader(element, offset = headerHeight()) {
  if (!element || typeof window === 'undefined') return false
  const { top } = element.getBoundingClientRect()
  const viewport = window.innerHeight || document.documentElement.clientHeight || 0
  return top >= offset && top <= offset + (viewport - offset) / 2
}

export function scrollBelowHeader(element, { gap = SCROLL_GAP } = {}) {
  if (!element || typeof window === 'undefined' || typeof window.scrollTo !== 'function') return false
  const offset = headerHeight()
  if (isTopVisibleBelowHeader(element, offset)) return false
  const currentY = window.scrollY ?? window.pageYOffset ?? 0
  const top = Math.max(0, Math.round(currentY + element.getBoundingClientRect().top - offset - gap))
  window.scrollTo({ top, behavior: scrollBehavior() })
  return true
}

function nextFrame(callback) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    const id = window.requestAnimationFrame(callback)
    return () => window.cancelAnimationFrame?.(id)
  }
  const id = setTimeout(callback, 0)
  return () => clearTimeout(id)
}

// Telefonda arama katmanı kapanırken geçmiş girişini geri alır (history.back);
// tarayıcı o geçişte eski kaydırma konumunu geri yükleyebilir. Kısa bir pencere
// içinde gelen popstate'ten sonra hizalama bir kez daha denenir.
export const POPSTATE_REALIGN_MS = 1000

export function scheduleScrollBelowHeader(getElement, options) {
  const resolve = () => (typeof getElement === 'function' ? getElement() : getElement)
  const cancels = []
  cancels.push(nextFrame(() => scrollBelowHeader(resolve(), options)))

  if (typeof window !== 'undefined') {
    const onPopState = () => {
      window.removeEventListener('popstate', onPopState)
      cancels.push(nextFrame(() => scrollBelowHeader(resolve(), options)))
    }
    window.addEventListener('popstate', onPopState)
    const timer = setTimeout(() => window.removeEventListener('popstate', onPopState), POPSTATE_REALIGN_MS)
    cancels.push(() => {
      clearTimeout(timer)
      window.removeEventListener('popstate', onPopState)
    })
  }

  return () => cancels.forEach(cancel => cancel())
}
