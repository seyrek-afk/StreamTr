import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Dropdown from '../components/Dropdown.jsx'
import { THEMES } from '../constants/index.js'

const OPTIONS = [
  { value: 'TR', label: 'Türkiye' },
  { value: 'KR', label: 'Güney Kore' },
  { value: 'JP', label: 'Japonya' },
]

describe('Dropdown', () => {
  it('açılınca seçenekleri listeler', () => {
    render(<Dropdown label="Ülke" value={null} options={OPTIONS} onChange={() => {}} />)
    expect(screen.queryByText('Güney Kore')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Ülke/ }))
    expect(screen.getByText('Güney Kore')).toBeTruthy()
  })

  // KIRPILMA REGRESYONU (üretimde yakalandı): menü `position:absolute` iken
  // mercek segmenti (`overflow:hidden`) ve dar ekranda yatay kaydırılan
  // kontrol şeridi (`overflow-x:auto`) tarafından kırpılıyor, ülke menüsü
  // "hiçbir şey listelemiyor" gibi görünüyordu.
  // Menünün tetikten AYRI bir kökte (portal) durması bunun tek yapısal garantisi;
  // menü tekrar tetiğin içine taşınırsa bu test düşer.
  it('menüyü tetiğin DOM alt ağacının dışına (portal) çizer', () => {
    const { container } = render(
      <Dropdown label="Ülke" value={null} options={OPTIONS} onChange={() => {}} />
    )
    fireEvent.click(screen.getByRole('button', { name: /Ülke/ }))

    const menu = document.body.querySelector('.dd-menu')
    expect(menu).toBeTruthy()
    // Menü, bileşenin kendi kökünün içinde OLMAMALI — aksi halde herhangi bir
    // atanın overflow'u onu yeniden kırpabilir.
    expect(container.contains(menu)).toBe(false)
    expect(menu.parentElement).toBe(document.body)
    // Viewport koordinatlarıyla konumlanır (JS satır içi stil yazar).
    expect(menu.style.top).toMatch(/px$/)
    expect(menu.style.maxHeight).toMatch(/px$/)
  })

  it('tek seçimde seçince değeri verir ve kapanır', () => {
    const onChange = vi.fn()
    render(<Dropdown label="Ülke" value={null} options={OPTIONS} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Ülke/ }))
    fireEvent.click(screen.getByText('Japonya'))
    expect(onChange).toHaveBeenCalledWith('JP')
    expect(document.body.querySelector('.dd-menu')).toBeNull()
  })

  it('çoklu seçimde menü açık kalır ve seçim birikir', () => {
    const onChange = vi.fn()
    render(<Dropdown label="Tür" multi value={['TR']} options={OPTIONS} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Tür/ }))
    fireEvent.click(screen.getByText('Japonya'))
    expect(onChange).toHaveBeenCalledWith(['TR', 'JP'])
    expect(document.body.querySelector('.dd-menu')).toBeTruthy()
  })

  it('dışarı tıklayınca kapanır (menü portalda olsa da)', () => {
    render(<Dropdown label="Ülke" value={null} options={OPTIONS} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Ülke/ }))
    expect(document.body.querySelector('.dd-menu')).toBeTruthy()
    fireEvent.mouseDown(document.body)
    expect(document.body.querySelector('.dd-menu')).toBeNull()
  })

  it('menü içine tıklamak kapatmaz', () => {
    render(<Dropdown label="Tür" multi value={[]} options={OPTIONS} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Tür/ }))
    fireEvent.mouseDown(document.body.querySelector('.dd-menu'))
    expect(document.body.querySelector('.dd-menu')).toBeTruthy()
  })
})

describe('tema yüzeyleri', () => {
  // ŞEFFAFLIK REGRESYONU: menü zemini --bg-card kullanıyordu; "Cam Efekti"
  // temasında o değer rgba(255,255,255,0.055), yani menü arkasındaki ızgara
  // görünüyor ve liste okunmuyordu. Menü zemini her temada OPAK olmalı.
  it('her tema opak bir --bg-elevated tanımlar', () => {
    for (const t of THEMES) {
      const v = t.css['--bg-elevated']
      expect(v, `${t.id} temasında --bg-elevated eksik`).toBeTruthy()
      expect(v, `${t.id} temasında --bg-elevated saydam`).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
