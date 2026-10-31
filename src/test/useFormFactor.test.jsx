import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, renderHook, act, fireEvent, screen } from '@testing-library/react'
import React from 'react'
import { detectDevice, resolveFormFactor, useFormFactor } from '../hooks/useFormFactor.js'
import { DeviceProvider, useDevice } from '../contexts/DeviceContext.jsx'

// Kontrol edilebilir matchMedia: sorgu → eşleşme tablosu; `ortam()` ile
// değiştirilir ve abonelere "change" duyurulur — döndürme/daraltma taklidi.
let eslesme = {}
let dinleyiciler = {}
function kurMatchMedia() {
  eslesme = {}; dinleyiciler = {}
  window.matchMedia = vi.fn((query) => ({
    get matches() { return Boolean(eslesme[query]) },
    media: query,
    addEventListener: (_, fn) => { (dinleyiciler[query] ||= new Set()).add(fn) },
    removeEventListener: (_, fn) => { dinleyiciler[query]?.delete(fn) },
  }))
}
function ortam(degisiklik) {
  Object.assign(eslesme, degisiklik)
  Object.keys(degisiklik).forEach(q => dinleyiciler[q]?.forEach(fn => fn({ matches: eslesme[q] })))
}

const DAR    = '(max-width: 719px)'
const ORTA   = '(max-width: 1079px)'
const KABA   = '(pointer: coarse)'
const HOVERSIZ = '(hover: none)'
const KURULU = '(display-mode: standalone)'

describe('detectDevice — karar matrisi', () => {
  beforeEach(kurMatchMedia)

  it('hiçbir sorgu eşleşmezse masaüstü + fare', () => {
    expect(detectDevice()).toEqual({ formFactor: 'desktop', input: 'pointer', installed: false })
  })

  it('720px altı telefon — işaretçi fare olsa bile (daraltılmış pencere)', () => {
    ortam({ [DAR]: true, [ORTA]: true })
    expect(detectDevice().formFactor).toBe('phone')
    expect(detectDevice().input).toBe('pointer')
  })

  it('720–1079 ve parmak → tablet; parmak yoksa masaüstü', () => {
    ortam({ [ORTA]: true, [KABA]: true })
    expect(detectDevice().formFactor).toBe('tablet')
    ortam({ [KABA]: false })
    expect(detectDevice().formFactor).toBe('desktop')
  })

  it('hover yokluğu da parmak sayılır', () => {
    ortam({ [HOVERSIZ]: true })
    expect(detectDevice().input).toBe('touch')
  })

  it('standalone → kurulu', () => {
    ortam({ [KURULU]: true })
    expect(detectDevice().installed).toBe(true)
  })

  it('matchMedia yoksa (eski ortam) masaüstü varsayılanına düşer, patlamaz', () => {
    window.matchMedia = undefined
    expect(detectDevice()).toEqual({ formFactor: 'desktop', input: 'pointer', installed: false })
  })
})

describe('resolveFormFactor — kullanıcı tercihi', () => {
  it('auto algılananı korur, phone/desktop ezer, bilinmeyen değer yok sayılır', () => {
    expect(resolveFormFactor('tablet', 'auto')).toBe('tablet')
    expect(resolveFormFactor('desktop', 'phone')).toBe('phone')
    expect(resolveFormFactor('phone', 'desktop')).toBe('desktop')
    expect(resolveFormFactor('phone', 'saçma')).toBe('phone')
  })
})

describe('useFormFactor — canlı takip', () => {
  beforeEach(kurMatchMedia)

  it('eşik aşıldığında karar değişir, geri dönüldüğünde geri gelir', () => {
    const { result } = renderHook(() => useFormFactor())
    expect(result.current.formFactor).toBe('desktop')
    act(() => ortam({ [DAR]: true, [ORTA]: true }))
    expect(result.current.formFactor).toBe('phone')
    act(() => ortam({ [DAR]: false, [ORTA]: false }))
    expect(result.current.formFactor).toBe('desktop')
  })

  it('aynı karar yeniden üretilirse state nesnesi değişmez (gereksiz çizim yok)', () => {
    const { result } = renderHook(() => useFormFactor())
    const ilk = result.current
    act(() => ortam({ [KURULU]: false }))
    expect(result.current).toBe(ilk)
  })

  it('kaldırılınca abonelikleri bırakır', () => {
    const { unmount } = renderHook(() => useFormFactor())
    expect(dinleyiciler[DAR].size).toBe(1)
    unmount()
    expect(dinleyiciler[DAR].size).toBe(0)
  })
})

function Gosterge() {
  const d = useDevice()
  return (
    <div>
      <span data-testid="ff">{d.formFactor}</span>
      <span data-testid="algilanan">{d.detectedFormFactor}</span>
      <span data-testid="override">{d.override}</span>
      <button onClick={() => d.setOverride('desktop')}>masaüstü</button>
      <button onClick={() => d.setOverride('auto')}>otomatik</button>
    </div>
  )
}

describe('DeviceProvider', () => {
  beforeEach(() => { kurMatchMedia(); localStorage.clear() })
  afterEach(() => {
    delete document.documentElement.dataset.ff
    delete document.documentElement.dataset.input
    delete document.documentElement.dataset.installed
    window.history.replaceState({}, '', '/')
  })

  it('kararı <html data-ff data-input> olarak köke yazar ve günceller', () => {
    ortam({ [DAR]: true, [ORTA]: true, [KABA]: true })
    render(<DeviceProvider><Gosterge /></DeviceProvider>)
    expect(document.documentElement.dataset.ff).toBe('phone')
    expect(document.documentElement.dataset.input).toBe('touch')
    expect(document.documentElement.dataset.installed).toBeUndefined()
    act(() => ortam({ [DAR]: false, [ORTA]: false, [KABA]: false }))
    expect(document.documentElement.dataset.ff).toBe('desktop')
    expect(document.documentElement.dataset.input).toBe('pointer')
  })

  it('kullanıcı tercihi algılananı ezer, saklanır ve "otomatik" ile geri alınır', () => {
    ortam({ [DAR]: true, [ORTA]: true })
    render(<DeviceProvider><Gosterge /></DeviceProvider>)
    expect(screen.getByTestId('ff').textContent).toBe('phone')

    fireEvent.click(screen.getByText('masaüstü'))
    expect(screen.getByTestId('ff').textContent).toBe('desktop')
    // Algılanan değer değişmez — menü "Otomatik · telefon" yazabilir.
    expect(screen.getByTestId('algilanan').textContent).toBe('phone')
    expect(document.documentElement.dataset.ff).toBe('desktop')
    expect(localStorage.getItem('streamtr-gorunum')).toBe('desktop')

    fireEvent.click(screen.getByText('otomatik'))
    expect(screen.getByTestId('ff').textContent).toBe('phone')
    expect(localStorage.getItem('streamtr-gorunum')).toBe('auto')
  })

  it('saklı tercih açılışta okunur; bozuk değer "auto" sayılır', () => {
    localStorage.setItem('streamtr-gorunum', 'phone')
    const { unmount } = render(<DeviceProvider><Gosterge /></DeviceProvider>)
    expect(screen.getByTestId('ff').textContent).toBe('phone')
    unmount()

    localStorage.setItem('streamtr-gorunum', 'tablet')
    render(<DeviceProvider><Gosterge /></DeviceProvider>)
    expect(screen.getByTestId('override').textContent).toBe('auto')
  })

  it('geliştirmede ?ff= kararı zorlar ama saklamaz', () => {
    // vitest DEV derlemesidir; üretimde bu dal hiç çalışmaz.
    window.history.replaceState({}, '', '/?ff=phone')
    render(<DeviceProvider><Gosterge /></DeviceProvider>)
    expect(screen.getByTestId('ff').textContent).toBe('phone')
    expect(localStorage.getItem('streamtr-gorunum')).toBeNull()
  })

  it('sağlayıcısız useDevice masaüstü yedeğini verir, patlamaz', () => {
    render(<Gosterge />)
    expect(screen.getByTestId('ff').textContent).toBe('desktop')
    expect(() => fireEvent.click(screen.getByText('masaüstü'))).not.toThrow()
  })
})
