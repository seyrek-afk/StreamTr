import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import FilterBar, { AnimationToggle } from '../components/FilterBar.jsx'

const SORT_OPTIONS = [
  { value: 'default', label: 'Varsayılan (IMDB)' },
  { value: 'imdb', label: 'IMDB Puanı' },
  { value: 'rt', label: 'Rotten Tomatoes' },
  { value: 'lb', label: 'Letterboxd' },
  { value: 'year', label: 'Yıl (en yeni)' },
]

function cubuk(ek = {}) {
  const props = {
    genres: [], onGenresChange: vi.fn(),
    yearBuckets: [], selectedYears: [], onYearsChange: vi.fn(),
    platforms: [], platform: 'Tümü', onPlatformChange: vi.fn(),
    sortOptions: SORT_OPTIONS, sortBy: 'default', onSortChange: vi.fn(),
    mediaType: 'all', onMediaTypeChange: undefined,
    trOnly: false, onTrOnlyChange: vi.fn(), enriching: false,
    showAnimation: false, onShowAnimationChange: vi.fn(),
    hasActiveFilter: false, onClear: vi.fn(),
    ...ek,
  }
  return { props, ...render(<FilterBar {...props} />) }
}

describe('FilterBar — Animasyon aç/kapa (FR-3)', () => {
  it('kapalı görünür, tıklanınca tercihi tersine çevirir', () => {
    const { props, rerender } = cubuk()
    const btn = screen.getByRole('button', { name: 'Animasyon' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(btn).toHaveAttribute('title', 'Animasyon yapımlarını göster')
    expect(btn.className).not.toContain('ctl-on')
    fireEvent.click(btn)
    expect(props.onShowAnimationChange).toHaveBeenCalledWith(true)

    rerender(<FilterBar {...props} showAnimation />)
    const acik = screen.getByRole('button', { name: 'Animasyon' })
    expect(acik).toHaveAttribute('aria-pressed', 'true')
    expect(acik.className).toContain('ctl-on')
    fireEvent.click(acik)
    expect(props.onShowAnimationChange).toHaveBeenLastCalledWith(false)
  })

  it('tercih "Temizle" görünürlüğünü etkilemez', () => {
    cubuk({ showAnimation: true })
    expect(screen.queryByRole('button', { name: /Temizle/ })).toBeNull()
  })

  it('geri çağırım verilmezse düğme çizilmez', () => {
    cubuk({ onShowAnimationChange: undefined })
    expect(screen.queryByRole('button', { name: 'Animasyon' })).toBeNull()
  })
})

describe('FilterBar — Sırala seçenekleri (FR-9, AC-13)', () => {
  it('Rotten Tomatoes ve Letterboxd seçenekleri var, seçim iletilir', () => {
    const { props } = cubuk()
    fireEvent.click(screen.getByRole('button', { name: /Sırala/ }))
    const secenekler = screen.getAllByRole('option').map(o => o.textContent)
    expect(secenekler).toEqual(['IMDB Puanı', 'Rotten Tomatoes', 'Letterboxd', 'Yıl (en yeni)'])
    fireEvent.click(screen.getByRole('option', { name: 'Letterboxd' }))
    expect(props.onSortChange).toHaveBeenCalledWith('lb')
  })
})

// Tasarım cilası: kapalı düğme "seçilmemiş tür filtresi" gibi okunuyordu.
// Durum yalnız vurgu rengine bırakılmaz (simge değişir), title bir sonraki
// dokunuşun ne yapacağını söyler; erişilebilir ad sabit kalır.
describe('FilterBar — Animasyon düğmesinin durum okunurluğu', () => {
  it('durum simgesi ve title duruma göre değişir, ad sabit kalır', () => {
    const { props, rerender } = cubuk()
    const kapali = screen.getByRole('button', { name: 'Animasyon' })
    expect(kapali.querySelector('svg.ctl-icon')).not.toBeNull()
    expect(kapali.querySelector('svg.lucide-eye-off')).not.toBeNull()

    rerender(<FilterBar {...props} showAnimation />)
    const acik = screen.getByRole('button', { name: 'Animasyon' })
    expect(acik).toHaveAttribute('title', 'Animasyon yapımlarını gizle')
    expect(acik.querySelector('svg.lucide-eye')).not.toBeNull()
    expect(acik.querySelector('svg.lucide-eye-off')).toBeNull()
  })

  it('Bana Özel öbeği aynı düğmeyi kompakt ölçekte kullanır', () => {
    const onChange = vi.fn()
    render(<AnimationToggle compact on={false} onChange={onChange} />)
    const btn = screen.getByRole('button', { name: 'Animasyon' })
    expect(btn.className).toContain('ctl-compact')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(btn)
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

// Seçili sıralama tetikte yalnız değeriyle görünür ("Rotten Tomatoes"); ekran
// okuyucu ekseni de duymalı, yoksa bir platform/kaynak filtresi sanılır.
describe('FilterBar — Sırala tetiğinin erişilebilir adı', () => {
  it('seçim yokken "Sırala", seçimde "Sırala: <seçenek>"', () => {
    const { props, rerender } = cubuk()
    expect(screen.getByRole('button', { name: 'Sırala' })).toBeTruthy()
    rerender(<FilterBar {...props} sortBy="rt" />)
    const tetik = screen.getByRole('button', { name: 'Sırala: Rotten Tomatoes' })
    expect(tetik.textContent).toBe('Rotten Tomatoes')
    expect(tetik.querySelector('svg.dd-icon')).not.toBeNull()
  })
})
