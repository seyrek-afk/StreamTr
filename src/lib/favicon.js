// Sekme simgesi seçili tasarımı ve rengi izler. public/favicon.svg yalnızca
// JS yüklenene kadarki varsayılandır (Katmanlı Sinyal + Neon Siber).
//
// Geometri BrandMark.jsx ile aynıdır (64'lük kutu, yarıya ölçeklenir). Favicon
// boyunda görünmeyen ayrıntılar (gren, ışıma, hareket) bilinçli olarak yok;
// her tasarımın 16px'te ayırt edilen özü kalır. Karo temanın zemin rengindedir:
// açık sekme çubuğunda da okunsun diye.

const TRI  = 'M14 17.5v29a3 3 0 0 0 4.5 2.6l24.6-14.5a3 3 0 0 0 0-5.2L18.5 14.9A3 3 0 0 0 14 17.5z'
const ARC1 = 'M48.5 24.5a10.5 10.5 0 0 1 0 15'
const ARC2 = 'M54 19a18 18 0 0 1 0 26'

const GLOSS = '<linearGradient id="gl" x1="0" y1="14" x2="0" y2="34" gradientUnits="userSpaceOnUse">'
  + '<stop offset="0" stop-color="#fff" stop-opacity="0.6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>'
  + '</linearGradient>'

const arc = (d, stroke, extra = '') =>
  `<path d="${d}" stroke="${stroke}" stroke-width="5" stroke-linecap="round" fill="none"${extra}/>`

// 64'lük işareti 32'lik karonun ortasına yerleştirir.
const place = (inner) => `<g transform="translate(16 16) scale(0.5) translate(-30.8 -32)">${inner}</g>`

const tile = (fill) => `<rect width="32" height="32" rx="7" fill="${fill}"/>`

const DESIGNS = {
  sade: (bg) => ({
    defs: '',
    body: tile(bg) + place(
      `<g transform="translate(-4.5 0)"><path d="${TRI}" fill="url(#g)"/>`
      + arc(ARC1, 'url(#g)') + arc(ARC2, 'url(#g)', ' opacity="0.6"') + '</g>'
    ),
  }),

  katmanli: (bg) => ({
    defs: GLOSS,
    body: tile(bg) + place(
      '<g transform="translate(-2.5 0)">'
      + '<use href="#t" transform="translate(-7 0)" fill="url(#g)" opacity="0.25"/>'
      + '<use href="#t" transform="translate(-3.5 0)" fill="url(#g)" opacity="0.5"/>'
      + '<use href="#t" fill="url(#g)"/>'
      + '<use href="#t" fill="url(#gl)" opacity="0.55"/>'
      + arc(ARC1, 'url(#g)') + arc(ARC2, 'url(#g)', ' opacity="0.6"') + '</g>'
    ),
  }),

  // Diyafram halkası favicon boyunda az ve kalın dişle; içinde üçgen.
  mercek: (bg) => ({
    defs: GLOSS,
    body: tile(bg)
      + '<circle cx="16" cy="16" r="13" fill="none" stroke="url(#g)" stroke-width="2.4"'
      + ' stroke-dasharray="24 3 16 3 30 3 2.7 0" stroke-linecap="butt"/>'
      + '<g transform="translate(16 16) scale(0.36) translate(-28 -32)">'
      + '<use href="#t" fill="url(#g)"/><use href="#t" fill="url(#gl)" opacity="0.55"/></g>',
  }),

  // Fırçalanmış plaka karonun kendisi; işaret gölge + ışıkla kabartılır.
  metal: () => ({
    defs: '<linearGradient id="pl" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0" stop-color="#34344a"/><stop offset="1" stop-color="#0f0f18"/></linearGradient>',
    body: tile('url(#pl)')
      + '<rect x="0.5" y="0.5" width="31" height="31" rx="6.5" fill="none" stroke="#fff" stroke-opacity="0.16"/>'
      + place(
        '<g transform="translate(-2.5 0)">'
        + `<g transform="translate(0 2.4)" opacity="0.75"><use href="#t" fill="#000"/>${arc(ARC1, '#000')}${arc(ARC2, '#000')}</g>`
        + `<g transform="translate(0 -1.2)" opacity="0.45"><use href="#t" fill="#fff"/>${arc(ARC1, '#fff')}${arc(ARC2, '#fff')}</g>`
        + `<use href="#t" fill="url(#g)"/>${arc(ARC1, 'url(#g)')}${arc(ARC2, 'url(#g)', ' opacity="0.75"')}`
        + '</g>'
      ),
  }),
}

export function faviconSvg(designId, theme) {
  const css = theme.css
  const make = DESIGNS[designId] || DESIGNS.katmanli
  const { defs, body } = make(css['--bg'])
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs>'
    + '<linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">'
    + `<stop offset="0" stop-color="${css['--brand-from']}"/><stop offset="1" stop-color="${css['--brand-to']}"/>`
    + '</linearGradient>'
    + `<path id="t" d="${TRI}"/>${defs}</defs>${body}</svg>`
}

export function applyFavicon(designId, theme) {
  let link = document.querySelector('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/svg+xml'
  link.href = `data:image/svg+xml,${encodeURIComponent(faviconSvg(designId, theme))}`
}
