import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  prefersReducedMotion, scrollBehavior, scrollToTop, headerHeight,
  isTopVisibleBelowHeader, scrollBelowHeader, scheduleScrollBelowHeader, SCROLL_GAP,
} from '../lib/scroll.js'

const HEADER_H = 120

function hareketTercihi(reduce) {
  window.matchMedia = vi.fn((q) => ({
    matches: reduce && q === '(prefers-reduced-motion: reduce)',
    media: q, addEventListener() {}, removeEventListener() {},
  }))
}

function basliKur(height = HEADER_H) {
  const header = document.createElement('header')
  header.className = 'app-header'
  header.getBoundingClientRect = () => ({ top: 0, bottom: height, height })
  document.body.appendChild(header)
  return header
}

function hedef(top) {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({ top, bottom: top + 200, height: 200 })
  document.body.appendChild(el)
  return el
}

let originalMatchMedia
beforeEach(() => {
  originalMatchMedia = window.matchMedia
  document.body.innerHTML = ''
  window.scrollTo = vi.fn()
  Object.defineProperty(window, 'scrollY', { value: 3000, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true })
  hareketTercihi(false)
})
afterEach(() => {
  window.matchMedia = originalMatchMedia
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('azaltılmış hareket (AC-19)', () => {
  it('reduce eşleşirse auto, değilse smooth', () => {
    expect(prefersReducedMotion()).toBe(false)
    expect(scrollBehavior()).toBe('smooth')
    hareketTercihi(true)
    expect(prefersReducedMotion()).toBe(true)
    expect(scrollBehavior()).toBe('auto')
  })

  it('matchMedia yoksa ya da hata verirse smooth', () => {
    window.matchMedia = undefined
    expect(scrollBehavior()).toBe('smooth')
    window.matchMedia = () => { throw new Error('yok') }
    expect(scrollBehavior()).toBe('smooth')
  })

  it('scrollToTop tercihe uyar', () => {
    scrollToTop()
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' })
    hareketTercihi(true)
    scrollToTop()
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'auto' })
  })
})

describe('başlık ofsetli kaydırma (FR-14, AC-17, AC-20)', () => {
  it('başlık yüksekliği çalışma anında ölçülür; başlık yoksa 0', () => {
    expect(headerHeight()).toBe(0)
    basliKur(64)
    expect(headerHeight()).toBe(64)
  })

  it('hedef = belge konumu − başlık − boşluk', () => {
    basliKur()
    const el = hedef(-2500)
    expect(scrollBelowHeader(el)).toBe(true)
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 3000 - 2500 - HEADER_H - SCROLL_GAP, behavior: 'smooth',
    })
  })

  it('azaltılmış harekette anlık kaydırır', () => {
    hareketTercihi(true)
    basliKur()
    scrollBelowHeader(hedef(-2500))
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }))
  })

  it('hedef başlığın altında görünür durumdaysa kaydırmaz', () => {
    basliKur()
    const el = hedef(HEADER_H + 10)
    expect(isTopVisibleBelowHeader(el)).toBe(true)
    expect(scrollBelowHeader(el)).toBe(false)
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('hedef başlığın ALTINA girmişse (kısmen örtülü) kaydırır', () => {
    basliKur()
    expect(scrollBelowHeader(hedef(40))).toBe(true)
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 3000 + 40 - HEADER_H - SCROLL_GAP }))
  })

  it('hedef görünümün alt yarısındaysa da kaydırır', () => {
    basliKur()
    expect(scrollBelowHeader(hedef(760))).toBe(true)
  })

  it('hedef konum negatif olmaz', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
    basliKur()
    scrollBelowHeader(hedef(-50))
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })

  it('öğe yoksa hiçbir şey yapmaz', () => {
    expect(scrollBelowHeader(null)).toBe(false)
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
})

describe('ertelenmiş kaydırma', () => {
  it('bir sonraki karede kaydırır; iptal edilirse kaydırmaz', async () => {
    basliKur()
    const el = hedef(-2500)
    const iptal = scheduleScrollBelowHeader(() => el)
    expect(window.scrollTo).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledTimes(1))

    window.scrollTo.mockClear()
    const iptal2 = scheduleScrollBelowHeader(() => el)
    iptal2()
    await new Promise(r => setTimeout(r, 50))
    expect(window.scrollTo).not.toHaveBeenCalled()
    iptal()
  })

  it('kısa süre içinde gelen popstate sonrası yeniden hizalar (geçmiş geri yüklemesi)', async () => {
    basliKur()
    const el = hedef(-2500)
    scheduleScrollBelowHeader(() => el)
    await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledTimes(1))
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledTimes(2))
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    await new Promise(r => setTimeout(r, 50))
    expect(window.scrollTo).toHaveBeenCalledTimes(2)
  })
})
