import { useSyncExternalStore } from "react"

function subscribeToSystemTheme(onStoreChange: () => void): () => void {
  const query = window.matchMedia("(prefers-color-scheme: dark)")
  query.addEventListener("change", onStoreChange)
  return () => query.removeEventListener("change", onStoreChange)
}

function getSystemThemeSnapshot(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function getServerSystemThemeSnapshot(): boolean {
  return false
}

/** Returns whether the operating system currently prefers a dark color scheme. */
export function useSystemTheme(): boolean {
  return useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    getServerSystemThemeSnapshot
  )
}
