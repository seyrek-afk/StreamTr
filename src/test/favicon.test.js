import { describe, it, expect, beforeEach } from 'vitest'
import { faviconSvg, applyFavicon } from '../lib/favicon.js'
import { THEMES, DESIGNS } from '../constants/index.js'

const theme = id => THEMES.find(t => t.id === id)

describe('faviconSvg', () => {
  it('uses the theme brand colors and background', () => {
    const t = theme('kirmizi')
    const svg = faviconSvg('katmanli', t)
    expect(svg).toContain(t.css['--brand-from'])
    expect(svg).toContain(t.css['--brand-to'])
    expect(svg).toContain(`fill="${t.css['--bg']}"`)
  })

  it('produces a distinct icon for every design', () => {
    const t = theme('neon')
    const svgs = DESIGNS.map(d => faviconSvg(d.id, t))
    expect(new Set(svgs).size).toBe(DESIGNS.length)
    svgs.forEach(svg => {
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
    })
  })

  it('falls back to Katmanlı Sinyal for an unknown design', () => {
    const t = theme('neon')
    expect(faviconSvg('yok', t)).toBe(faviconSvg('katmanli', t))
  })
})

describe('applyFavicon', () => {
  beforeEach(() => { document.head.innerHTML = '' })

  it('updates the existing icon link with a data URL', () => {
    document.head.innerHTML = '<link rel="icon" type="image/svg+xml" href="/favicon.svg">'
    applyFavicon('mercek', theme('ocean'))
    const links = document.querySelectorAll('link[rel="icon"]')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toMatch(/^data:image\/svg\+xml,/)
    expect(decodeURIComponent(links[0].getAttribute('href'))).toContain('#009fd4')
  })

  it('creates the icon link when missing', () => {
    applyFavicon('sade', theme('neon'))
    expect(document.querySelector('link[rel="icon"]')).not.toBeNull()
  })
})
