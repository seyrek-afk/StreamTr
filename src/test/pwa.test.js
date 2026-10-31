import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// PWA sözleşmesi dosya düzeyinde doğrulanır: manifest geçerli, ikonlar yerinde,
// index.html manifest'e ve apple-touch-icon'a bağlı. Tarayıcı "ana ekrana ekle"
// koşullarını sessizce reddeder; eksik bir ikon ancak telefonda fark edilirdi.
const ROOT = path.resolve(__dirname, '../..')
const pub = (f) => path.join(ROOT, 'public', f)

describe('PWA — manifest ve ikonlar', () => {
  const manifest = JSON.parse(fs.readFileSync(pub('manifest.webmanifest'), 'utf8'))

  it('manifest zorunlu alanları taşır', () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name.length).toBeLessThanOrEqual(12)
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.lang).toBe('tr')
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('192 ve 512 boyutlarında any + maskable PNG ikonlar var ve dosyalar mevcut', () => {
    const png = manifest.icons.filter(i => i.type === 'image/png')
    for (const purpose of ['any', 'maskable']) {
      for (const size of ['192x192', '512x512']) {
        expect(png.some(i => i.sizes === size && i.purpose === purpose)).toBe(true)
      }
    }
    for (const i of manifest.icons) {
      const f = pub(i.src.replace(/^\//, ''))
      expect(fs.existsSync(f), `${i.src} eksik`).toBe(true)
      if (i.type === 'image/png') {
        // PNG imzası: dosya gerçekten PNG, boş ya da HTML hata sayfası değil.
        const head = fs.readFileSync(f).subarray(0, 8)
        expect(head.toString('hex')).toBe('89504e470d0a1a0a')
      }
    }
  })

  it('index.html manifest, theme-color ve apple-touch-icon bağlar', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('name="theme-color"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('viewport-fit=cover')
    expect(fs.existsSync(pub('apple-touch-icon.png'))).toBe(true)
  })
})
