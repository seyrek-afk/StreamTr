// Vite eklentisi: erken veri betiğini (src/erken.js) ana paketten AYRI tutar.
//
// index.html'e ikinci bir <script type="module"> yazmak işe yaramaz: Vite bir
// HTML'deki tüm modül betiklerini TEK giriş modülünde birleştirir, erken betik
// ana paketin içine gömülür ve "ana JS inmeden istek at" amacı boşa düşer
// (ölçüldü: top_rated isteği yine ana JS'ten sonra başlıyordu).
//
// Burada betik ayrı bir Rollup girişi olur (assets/erken.js, hash'siz —
// Render zaten max-age=0 verir), HTML'e <head> başına eklenir: modül betikleri
// belge sırasıyla çalışır, ana betikten önce durmalı. Geliştirmede kaynak
// dosya doğrudan bağlanır. Betik hiçbir modül import etmediği için paylaşılan
// parça oluşmaz, polyfill de HTML girişine özgü kaldığı için eklenmez.
export const ERKEN_KAYNAK = '/src/erken.js'
export const ERKEN_CIKTI = 'assets/erken.js'

export default function erkenBetik() {
  let uretim = false
  return {
    name: 'streamtr-erken-veri',
    config(_, { command }) {
      uretim = command === 'build'
      if (!uretim) return
      return {
        build: {
          rollupOptions: {
            input: { main: 'index.html', erken: 'src/erken.js' },
            output: {
              entryFileNames: (c) => (c.name === 'erken' ? ERKEN_CIKTI : 'assets/[name]-[hash].js'),
            },
          },
        },
      }
    },
    transformIndexHtml() {
      return [{
        tag: 'script',
        attrs: { type: 'module', src: uretim ? `/${ERKEN_CIKTI}` : ERKEN_KAYNAK },
        injectTo: 'head-prepend',
      }]
    },
  }
}
