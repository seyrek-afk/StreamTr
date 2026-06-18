import { describe, it, expect } from 'vitest'
import { GENRES, PLATFORMS, THEMES, TABS, POSTER_GRADIENTS, DEFAULT_THEME_ID } from '../constants/index.js'

describe('GENRES', () => {
  it('should have exactly 12 genres', () => {
    expect(GENRES).toHaveLength(12)
  })

  it('should contain all expected genres', () => {
    expect(GENRES).toContain('Aksiyon')
    expect(GENRES).toContain('Dram')
    expect(GENRES).toContain('Komedi')
    expect(GENRES).toContain('Bilim Kurgu')
    expect(GENRES).toContain('Gerilim')
    expect(GENRES).toContain('Suç')
    expect(GENRES).toContain('Belgesel')
    expect(GENRES).toContain('Animasyon')
    expect(GENRES).toContain('Fantezi')
    expect(GENRES).toContain('Korku')
    expect(GENRES).toContain('Romantik')
    expect(GENRES).toContain('Tarih')
  })

  it('should not have duplicate genres', () => {
    const unique = new Set(GENRES)
    expect(unique.size).toBe(GENRES.length)
  })
})

describe('PLATFORMS', () => {
  it('should have 6 platforms', () => {
    expect(PLATFORMS).toHaveLength(6)
  })

  it('every platform should have required fields', () => {
    PLATFORMS.forEach(p => {
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('label')
      expect(p).toHaveProperty('color')
      expect(p).toHaveProperty('badge')
      expect(typeof p.id).toBe('string')
      expect(typeof p.color).toBe('string')
    })
  })

  it('every platform color should be a valid hex color', () => {
    const hexPattern = /^#[0-9A-Fa-f]{3,6}$/
    PLATFORMS.forEach(p => {
      expect(p.color).toMatch(hexPattern)
    })
  })

  it('should include Netflix and Amazon Prime', () => {
    const ids = PLATFORMS.map(p => p.id)
    expect(ids).toContain('Netflix')
    expect(ids).toContain('Amazon Prime')
    expect(ids).toContain('Disney+')
    expect(ids).toContain('Apple TV+')
  })
})

describe('THEMES', () => {
  const REQUIRED_CSS_VARS = [
    '--bg', '--bg-card', '--bg-header', '--accent', '--accent2',
    '--accent-rgb', '--border', '--text', '--text-muted', '--text-faint',
    '--tab-active', '--hover-border', '--trend-bar', '--logo-grad',
  ]

  it('should have 5 themes', () => {
    expect(THEMES).toHaveLength(5)
  })

  it('every theme should have required fields', () => {
    THEMES.forEach(theme => {
      expect(theme).toHaveProperty('id')
      expect(theme).toHaveProperty('label')
      expect(theme).toHaveProperty('emoji')
      expect(theme).toHaveProperty('desc')
      expect(theme).toHaveProperty('preview')
      expect(theme).toHaveProperty('css')
      expect(Array.isArray(theme.preview)).toBe(true)
      expect(theme.preview).toHaveLength(3)
    })
  })

  it('every theme should have all required CSS variables', () => {
    THEMES.forEach(theme => {
      REQUIRED_CSS_VARS.forEach(cssVar => {
        expect(theme.css).toHaveProperty(cssVar)
      })
    })
  })

  it('theme IDs should be unique', () => {
    const ids = THEMES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('DEFAULT_THEME_ID should exist in THEMES', () => {
    const ids = THEMES.map(t => t.id)
    expect(ids).toContain(DEFAULT_THEME_ID)
  })

  it('cinema theme should have gold accent', () => {
    const cinema = THEMES.find(t => t.id === 'cinema')
    expect(cinema).toBeDefined()
    expect(cinema.css['--accent']).toBe('#F5C518')
  })

  it('netflix theme should have red accent', () => {
    const netflix = THEMES.find(t => t.id === 'netflix')
    expect(netflix).toBeDefined()
    expect(netflix.css['--accent']).toBe('#E50914')
  })
})

describe('TABS', () => {
  it('should have 4 tabs', () => {
    expect(TABS).toHaveLength(4)
  })

  it('every tab should have id, emoji, label', () => {
    TABS.forEach(tab => {
      expect(tab).toHaveProperty('id')
      expect(tab).toHaveProperty('emoji')
      expect(tab).toHaveProperty('label')
    })
  })

  it('should contain diziler, filmler, trend, sanaozel tabs', () => {
    const ids = TABS.map(t => t.id)
    expect(ids).toContain('diziler')
    expect(ids).toContain('filmler')
    expect(ids).toContain('trend')
    expect(ids).toContain('sanaozel')
  })
})

describe('POSTER_GRADIENTS', () => {
  it('should have 9 gradients', () => {
    expect(POSTER_GRADIENTS).toHaveLength(9)
  })

  it('every gradient should be an array of 2 hex colors', () => {
    const hexPattern = /^#[0-9A-Fa-f]{3,6}$/
    POSTER_GRADIENTS.forEach(grad => {
      expect(Array.isArray(grad)).toBe(true)
      expect(grad).toHaveLength(2)
      grad.forEach(color => {
        expect(color).toMatch(hexPattern)
      })
    })
  })
})
