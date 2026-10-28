import { useId } from 'react'

// Marka simgesi — "yayın sinyali" (oynat üçgeni + dalgalar) dört tasarımda.
// Tasarımlar 2026-10 prova sayfasında beş temada karşılaştırılarak seçildi;
// hepsi aynı geometriden türer, tanınırlık tasarım değişse de korunur.
//
// Renkler tema tokenlarından gelir (.brand-from / .brand-to → --brand-from/-to):
// stop-color özniteliği var() kabul etmediği için sınıfla verilir.
//
// Hareket (index.css, .bm-*): açılışta iki tur oynar, sonra durur. Veri
// yüklenirken (busy) ve fare üzerindeyken sürekli oynar — sürekli dönen bir
// başlık simgesi göz yoruyordu, yükleme anında ise bir anlam taşıyor.
// still: menü önizlemeleri gibi yerlerde hiç oynamaz.

// Ortak geometri, 64'lük kutu.
const TRI  = 'M14 17.5v29a3 3 0 0 0 4.5 2.6l24.6-14.5a3 3 0 0 0 0-5.2L18.5 14.9A3 3 0 0 0 14 17.5z'
const ARC1 = 'M48.5 24.5a10.5 10.5 0 0 1 0 15'
const ARC2 = 'M54 19a18 18 0 0 1 0 26'
const ARC3 = 'M58.9 14a25 25 0 0 1 0 36'

function Grad({ id }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" className="brand-from" />
      <stop offset="1" className="brand-to" />
    </linearGradient>
  )
}

// Film greni: gürültünün kırmızı kanalı alfaya çevrilir, şeklin içine kırpılır.
function Grain({ id, freq = 1.5, cut = -0.45 }) {
  return (
    <filter id={id} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 ${cut}`} />
      <feComposite in2="SourceGraphic" operator="in" />
    </filter>
  )
}

const arc = (d, stroke, extra = {}) => (
  <path d={d} stroke={stroke} strokeWidth="4.4" strokeLinecap="round" fill="none" {...extra} />
)

function Sade({ u }) {
  return (
    <>
      <defs><Grad id={`${u}g`} /></defs>
      <g transform="translate(-4.5 0)">
        <path d={TRI} fill={`url(#${u}g)`} />
        {arc(ARC1, `url(#${u}g)`)}
        {arc(ARC2, `url(#${u}g)`, { opacity: 0.6 })}
      </g>
    </>
  )
}

// Arkada iki soluk "akış izi" kopyası, önde parlak üst yüz; dalgalar ışır ve
// sırayla yayın yapar.
function Katmanli({ u }) {
  const g = `url(#${u}g)`
  return (
    <>
      <defs>
        <Grad id={`${u}g`} />
        <linearGradient id={`${u}gl`} x1="0" y1="14" x2="0" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${u}glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <Grain id={`${u}n`} freq={1.6} cut={-0.5} />
      </defs>
      <g transform="translate(-2.5 0)">
        <path className="bm-l1" d={TRI} fill={g} opacity="0.2" />
        <path className="bm-l2" d={TRI} fill={g} opacity="0.42" />
        <path d={TRI} fill={g} />
        <path d={TRI} fill="#fff" filter={`url(#${u}n)`} opacity="0.14" />
        <path d={TRI} fill={`url(#${u}gl)`} opacity="0.55" />
        <path d={TRI} fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="0.9" />
        <g filter={`url(#${u}glow)`} opacity="0.75">
          {arc(ARC1, g, { className: 'bm-a1' })}
          {arc(ARC2, g, { className: 'bm-a2' })}
        </g>
        {arc(ARC1, g, { className: 'bm-a1' })}
        {arc(ARC2, g, { className: 'bm-a2' })}
        {arc(ARC3, g, { className: 'bm-a3', strokeWidth: 3.6 })}
      </g>
    </>
  )
}

// Projektör objektifi: dalgaların yerini dönen diyafram halkası alır.
function Mercek({ u }) {
  const g = `url(#${u}g)`
  return (
    <>
      <defs>
        <Grad id={`${u}g`} />
        <radialGradient id={`${u}lens`} cx="30" cy="28" r="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" className="brand-from" stopOpacity="0.32" />
          <stop offset="0.7" className="brand-to" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id={`${u}glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${u}soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        <clipPath id={`${u}c`}><circle cx="32" cy="32" r="26" /></clipPath>
        <Grain id={`${u}n`} />
      </defs>
      <circle cx="32" cy="32" r="30" fill="#000" opacity="0.35" />
      <circle
        className="bm-ring" cx="32" cy="32" r="28" fill="none" stroke={g}
        strokeWidth="3.4" strokeDasharray="30 5 14 5 44 5 18 5" strokeLinecap="round"
      />
      <g clipPath={`url(#${u}c)`}>
        <circle cx="32" cy="32" r="26" fill={`url(#${u}lens)`} />
        <circle cx="32" cy="32" r="26" fill="#fff" filter={`url(#${u}n)`} opacity="0.12" />
        <g transform="translate(32 32) scale(0.64) translate(-28 -32)">
          <path className="bm-glow" d={TRI} fill={g} filter={`url(#${u}glow)`} />
          <path d={TRI} fill={g} />
        </g>
        <ellipse
          cx="21" cy="18.5" rx="8" ry="3.4" transform="rotate(-35 21 18.5)"
          fill="#fff" opacity="0.32" filter={`url(#${u}soft)`}
        />
      </g>
      <circle cx="32" cy="32" r="25.6" fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="0.8" />
    </>
  )
}

// Fırçalanmış koyu plakaya basılmış sinyal. Parıltı şeklin maskesi içinde
// kayan bir ışık bandıdır (SMIL değil): CSS ile durdurulabilsin diye.
function Metal({ u }) {
  const g = `url(#${u}g)`
  const shape = (fill) => (
    <>
      <path d={TRI} fill={fill} />
      {arc(ARC1, fill, { strokeWidth: 4.6 })}
      {arc(ARC2, fill, { strokeWidth: 4.6 })}
    </>
  )
  const place = 'translate(-3.5 0) scale(0.86) translate(5.5 5.2)'
  return (
    <>
      <defs>
        <Grad id={`${u}g`} />
        <linearGradient id={`${u}plate`} x1="0" y1="4" x2="0" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2e2e3e" />
          <stop offset="1" stopColor="#0f0f18" />
        </linearGradient>
        <linearGradient id={`${u}sh`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <pattern id={`${u}brush`} width="64" height="1.6" patternUnits="userSpaceOnUse">
          <rect width="64" height="0.6" fill="#fff" opacity="0.05" />
        </pattern>
        <filter id={`${u}sd`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
        <clipPath id={`${u}c`}><rect x="4" y="4" width="56" height="56" rx="15" /></clipPath>
        <mask id={`${u}m`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <g transform={place}>{shape('#fff')}</g>
        </mask>
      </defs>
      <g clipPath={`url(#${u}c)`}>
        <rect x="4" y="4" width="56" height="56" fill={`url(#${u}plate)`} />
        <rect x="4" y="4" width="56" height="56" fill={`url(#${u}brush)`} />
        <g transform={place}>
          <g transform="translate(0 1.8)" filter={`url(#${u}sd)`} opacity="0.7">{shape('#000')}</g>
          <g transform="translate(0 -0.7)" opacity="0.5">{shape('#fff')}</g>
          <path d={TRI} fill={g} />
          {arc(ARC1, g, { strokeWidth: 4.6 })}
          {arc(ARC2, g, { strokeWidth: 4.6, opacity: 0.7 })}
        </g>
        <g mask={`url(#${u}m)`}>
          <g transform="rotate(22 32 32)">
            <rect className="bm-sheen" x="0" y="-20" width="14" height="104" fill={`url(#${u}sh)`} />
          </g>
        </g>
      </g>
      <rect x="4.5" y="4.5" width="55" height="55" rx="14.5" fill="none" stroke="#fff" strokeOpacity="0.12" />
    </>
  )
}

const DESIGNS = { sade: Sade, katmanli: Katmanli, mercek: Mercek, metal: Metal }

export default function BrandMark({ design = 'katmanli', size = 30, busy = false, still = false }) {
  // useId ":r0:" üretir; iki nokta url(#…) referanslarında sorun çıkarabildiği
  // için atılır. Her örnek kendi kimliğini taşır: menüdeki önizlemeler başlıktaki
  // simgenin gradyanını/filtresini ezmesin.
  const u = `bm${useId().replace(/:/g, '')}`
  const Design = DESIGNS[design] || Katmanli
  const cls = ['brand-mark', 'bm', `bm-${design}`, busy && 'bm-busy', still && 'bm-still']
    .filter(Boolean).join(' ')
  return (
    <svg className={cls} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <Design u={u} />
    </svg>
  )
}
