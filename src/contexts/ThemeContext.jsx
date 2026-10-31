import { createContext, useContext, useState, useEffect } from 'react'
import {
  THEMES, DEFAULT_THEME_ID, LEGACY_THEME_IDS, DESIGNS, DEFAULT_DESIGN_ID,
} from '../constants/index.js'
import { applyFavicon } from '../lib/favicon.js'

const ThemeContext = createContext(null)

export function applyThemeColor(color) {
  if (!color || typeof document === 'undefined') return
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = color
}

// Görünüm iki bağımsız eksen: renk (tema) ve tasarım (marka simgesinin
// işçiliği). İkisi de cihaz tercihidir, hesaba bağlı değildir.
function initialThemeId() {
  const saved = localStorage.getItem('streamtr-theme')
  return LEGACY_THEME_IDS[saved] || saved || DEFAULT_THEME_ID
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(initialThemeId)
  const [designId, setDesignId] = useState(
    () => localStorage.getItem('streamtr-design') || DEFAULT_DESIGN_ID
  )

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]
  const design = DESIGNS.find(d => d.id === designId) || DESIGNS[0]

  useEffect(() => {
    const root = document.documentElement
    Object.entries(theme.css).forEach(([key, val]) => {
      root.style.setProperty(key, val)
    })
    document.body.style.background = theme.css['--bg']
    localStorage.setItem('streamtr-theme', themeId)
    // Tarayıcı çubuğu / PWA durum çubuğu başlık bandının rengini alır:
    // uygulama ile tarayıcı kromu arasında renk kesintisi olmaz.
    applyThemeColor(theme.css['--bg-header'])
  }, [theme, themeId])

  useEffect(() => {
    localStorage.setItem('streamtr-design', designId)
  }, [designId])

  // Sekme simgesi de seçili tasarım + rengi izler.
  useEffect(() => {
    applyFavicon(design.id, theme)
  }, [design.id, theme])

  return (
    <ThemeContext.Provider value={{
      themeId, setThemeId, theme, themes: THEMES,
      designId: design.id, setDesignId, designs: DESIGNS,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
