import { useSyncExternalStore } from "react"

import type { CalculatorTheme } from "@openmirai/calculator-core/configuration"

/** Subscribes to changes in the browser's preferred color scheme. */
function subscribeToSystemTheme(onStoreChange: () => void): () => void {
  const query = window.matchMedia("(prefers-color-scheme: dark)")
  query.addEventListener("change", onStoreChange)
  return () => query.removeEventListener("change", onStoreChange)
}

/** Reads whether the browser currently prefers a dark color scheme. */
function getSystemThemeSnapshot(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

/** Supplies the deterministic light-mode server snapshot. */
function getServerSystemThemeSnapshot(): boolean {
  return false
}

/** Returns whether the host system currently prefers a dark color scheme. */
export function useSystemDarkMode(): boolean {
  return useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    getServerSystemThemeSnapshot
  )
}

/** Resolves the configured calculator theme against the current system preference. */
export function resolveCalculatorTheme(
  theme: CalculatorTheme,
  systemDark: boolean
): "light" | "dark" {
  switch (theme) {
    case "system":
      return systemDark ? "dark" : "light"
    case "light":
    case "dark":
      return theme
  }
}
