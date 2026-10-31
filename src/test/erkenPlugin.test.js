import { describe, it, expect } from 'vitest'
import erkenBetik, { ERKEN_KAYNAK, ERKEN_CIKTI } from '../../vite.erken.js'

// Erken veri betiği ana paketten AYRI bir giriş olmalı ve HTML'de ana
// betikten ÖNCE durmalı: modül betikleri belge sırasıyla çalışır. Aynı
// HTML'e ikinci <script> yazınca Vite ikisini tek girişte birleştiriyordu.
describe('vite eklentisi — erken veri betiği', () => {
  it('üretimde ayrı giriş ve hash\'siz çıktı adı tanımlar', () => {
    const p = erkenBetik()
    const cfg = p.config({}, { command: 'build' })
    expect(cfg.build.rollupOptions.input.erken).toBe('src/erken.js')
    expect(cfg.build.rollupOptions.input.main).toBe('index.html')
    const ad = cfg.build.rollupOptions.output.entryFileNames
    expect(ad({ name: 'erken' })).toBe(ERKEN_CIKTI)
    expect(ad({ name: 'main' })).toMatch(/^assets\/\[name\]-\[hash\]\.js$/)
  })

  it('geliştirmede yapılandırmaya dokunmaz, kaynak dosyayı bağlar', () => {
    const p = erkenBetik()
    expect(p.config({}, { command: 'serve' })).toBeUndefined()
    const [tag] = p.transformIndexHtml('<html><head></head></html>')
    expect(tag.attrs.src).toBe(ERKEN_KAYNAK)
    expect(tag.attrs.type).toBe('module')
    expect(tag.injectTo).toBe('head-prepend')
  })

  it('üretimde çıktı dosyasını head başına ekler', () => {
    const p = erkenBetik()
    p.config({}, { command: 'build' })
    const [tag] = p.transformIndexHtml('<html><head></head></html>')
    expect(tag.attrs.src).toBe(`/${ERKEN_CIKTI}`)
    expect(tag.injectTo).toBe('head-prepend')
  })
})
