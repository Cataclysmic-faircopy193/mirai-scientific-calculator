const THEME_STORAGE_KEY = "mirai-calculator-site-theme"
const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
let theme
switch (storedTheme) {
  case "light":
  case "dark":
    theme = storedTheme
    break
  default:
    theme = prefersDark ? "dark" : "light"
}

document.documentElement.classList.toggle("dark", theme === "dark")
document.documentElement.dataset.theme = theme
