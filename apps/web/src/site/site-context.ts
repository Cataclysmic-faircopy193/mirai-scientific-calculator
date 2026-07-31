import { createContext } from "react"

export type SiteTheme = "light" | "dark"

export interface SiteContextValue {
  theme: SiteTheme
  setTheme: (theme: SiteTheme) => void
  toggleTheme: () => void
}

export const SiteContext = createContext<SiteContextValue | null>(null)
