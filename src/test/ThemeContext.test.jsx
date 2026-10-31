import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext.jsx'
import { THEMES, DEFAULT_THEME_ID, DEFAULT_DESIGN_ID } from '../constants/index.js'

// localStorage mock is provided by jsdom environment

const wrapper = ({ children }) => React.createElement(ThemeProvider, null, children)

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset CSS variable side effects
    document.documentElement.style.cssText = ''
    document.body.style.background = ''
  })

  it('defaults to DEFAULT_THEME_ID when localStorage is empty', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.themeId).toBe(DEFAULT_THEME_ID)
  })

  it('restores theme from localStorage on mount', () => {
    localStorage.setItem('streamtr-theme', 'ocean')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.themeId).toBe('ocean')
  })

  // Eski "Netflix" teması "Kırmızı" oldu; kayıtlı seçim kaybolmamalı.
  it('migrates the legacy netflix id to kirmizi', () => {
    localStorage.setItem('streamtr-theme', 'netflix')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.themeId).toBe('kirmizi')
    expect(localStorage.getItem('streamtr-theme')).toBe('kirmizi')
  })

  it('defaults design to DEFAULT_DESIGN_ID and persists a new choice', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.designId).toBe(DEFAULT_DESIGN_ID)
    act(() => { result.current.setDesignId('mercek') })
    expect(result.current.designId).toBe('mercek')
    expect(localStorage.getItem('streamtr-design')).toBe('mercek')
  })

  it('falls back to the first design for an unknown stored id', () => {
    localStorage.setItem('streamtr-design', 'yok-boyle')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.designId).toBe('katmanli')
  })

  it('exposes all themes via context', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.themes).toEqual(THEMES)
  })

  it('exposes active theme object', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    const expectedTheme = THEMES.find(t => t.id === DEFAULT_THEME_ID)
    expect(result.current.theme).toEqual(expectedTheme)
  })

  it('setThemeId updates themeId', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => { result.current.setThemeId('kirmizi') })

    expect(result.current.themeId).toBe('kirmizi')
  })

  it('persists theme choice to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => { result.current.setThemeId('ocean') })

    expect(localStorage.getItem('streamtr-theme')).toBe('ocean')
  })

  it('sets CSS variables on documentElement after theme change', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => { result.current.setThemeId('neon') })

    const neonTheme = THEMES.find(t => t.id === 'neon')
    const bgValue = document.documentElement.style.getPropertyValue('--bg')
    expect(bgValue).toBe(neonTheme.css['--bg'])
  })

  it('sets document.body background after theme change (jsdom normalizes hex to rgb)', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => { result.current.setThemeId('glass') })

    // jsdom may normalize hex colors to rgb(), so just verify background is set (non-empty)
    expect(document.body.style.background.length).toBeGreaterThan(0)
  })

  it('theme object matches the selected themeId', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => { result.current.setThemeId('ocean') })

    const oceanTheme = THEMES.find(t => t.id === 'ocean')
    expect(result.current.theme).toEqual(oceanTheme)
  })

  it('setThemeId to unknown id falls back to first theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => { result.current.setThemeId('nonexistent') })

    expect(result.current.theme).toEqual(THEMES[0])
  })
})

describe('theme-color (PWA / tarayıcı çubuğu)', () => {
  it('seçili temanın başlık rengini meta[name=theme-color] olarak yazar', async () => {
    const { applyThemeColor } = await import('../contexts/ThemeContext.jsx')
    document.querySelector('meta[name="theme-color"]')?.remove()
    applyThemeColor('#123456')
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#123456')
    applyThemeColor('#abcdef')
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#abcdef')
    applyThemeColor(null)
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#abcdef')
  })
})
