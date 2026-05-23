import { createContext, useContext, useState, useEffect } from 'react'
import { THEMES, DEFAULT_THEME_ID } from '../constants/index.js'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(
    () => localStorage.getItem('streamtr-theme') || DEFAULT_THEME_ID
  )

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]

  useEffect(() => {
    const root = document.documentElement
    Object.entries(theme.css).forEach(([key, val]) => {
      root.style.setProperty(key, val)
    })
    document.body.style.background = theme.css['--bg']
    localStorage.setItem('streamtr-theme', themeId)
  }, [theme, themeId])

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, theme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
