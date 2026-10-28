import { createContext, useContext, useState, useEffect } from 'react'
import {
  THEMES, DEFAULT_THEME_ID, LEGACY_THEME_IDS, DESIGNS, DEFAULT_DESIGN_ID,
} from '../constants/index.js'

const ThemeContext = createContext(null)

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
  }, [theme, themeId])

  useEffect(() => {
    localStorage.setItem('streamtr-design', designId)
  }, [designId])

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
