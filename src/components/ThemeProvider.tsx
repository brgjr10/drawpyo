import React, { createContext, useContext, ReactNode } from 'react'
import { useAppStore } from '../store'
import { ThemeName } from '../types'

interface ThemeContextValue {
  theme: ReturnType<typeof useAppStore.getState>['theme']
  currentTheme: ThemeName
  setTheme: (theme: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const theme = useAppStore((s) => s.theme)
  const currentTheme = useAppStore((s) => s.currentTheme)
  const setTheme = useAppStore((s) => s.setTheme)

  const style: React.CSSProperties = {
    '--bg': theme.background,
    '--canvas': theme.canvas,
    '--card': theme.card,
    '--card-border': theme.cardBorder,
    '--text-primary': theme.textPrimary,
    '--text-secondary': theme.textSecondary,
    '--primary': theme.primary,
    '--success': theme.success,
    '--warning': theme.warning,
    '--danger': theme.danger,
    '--font': theme.fontFamily,
  } as React.CSSProperties & Record<string, string>

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, setTheme }}>
      <div className="app" style={style}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
