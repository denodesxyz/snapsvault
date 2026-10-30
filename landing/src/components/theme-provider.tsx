'use client'

import * as React from 'react'
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes'

// The theme-color metas from layout.tsx follow the system scheme; this keeps
// them on the resolved theme after a manual toggle, so Safari's bar matches.
const ThemeColor = () => {
  const { resolvedTheme } = useTheme()
  React.useEffect(() => {
    if (!resolvedTheme) return
    const color = resolvedTheme === 'dark' ? '#0C0C0D' : '#ffffff'
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color))
  }, [resolvedTheme])
  return null
}

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemeProvider>) {
  return (
    <NextThemeProvider {...props}>
      <ThemeColor />
      {children}
    </NextThemeProvider>
  )
}
