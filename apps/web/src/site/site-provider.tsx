import { useEffect, useMemo, useState } from "react"

import { SiteContext } from "@/site/site-context"
import type { SiteContextValue, SiteTheme } from "@/site/site-context"
import { THEME_STORAGE_KEY } from "@/site/constants/site"

function readInitialTheme(): SiteTheme {
  if (typeof document === "undefined") {
    return "dark"
  }
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

/** Provides shared showcase state for theme and command-palette behavior. */
export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const value = useMemo<SiteContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme]
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}
