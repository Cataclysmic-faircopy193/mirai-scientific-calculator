export const SITE_NAME = "OpenMirai Calculator"
export const SITE_DESCRIPTION =
  "An editable shadcn calculator interface powered by a dependency-free mathematical core."
export const SITE_DOMAIN = "calculator.openmirai.dev"
export const SITE_URL = `https://${SITE_DOMAIN}`
export const GITHUB_URL = "https://github.com/openmirai/mirai-scientific-calculator"
export const THEME_STORAGE_KEY = "mirai-calculator-site-theme"
export const COMMAND_MENU_GROUPS = ["Explore", "Extensions", "Docs"] as const

export const PRIMARY_NAVIGATION = [
  { label: "Playground", to: "/playground" },
  { label: "Extensions", to: "/extensions" },
  { label: "Docs", to: "/docs/installation" },
] as const

export const MOBILE_NAVIGATION = [
  ...PRIMARY_NAVIGATION,
  { label: "Headless core", to: "/docs/core" },
] as const

export const FOOTER_NAVIGATION = [
  { label: "Extensions", to: "/extensions" },
  { label: "Installation", to: "/docs/installation" },
  { label: "Core API", to: "/docs/core" },
] as const

export const PAGE_TITLES: Readonly<Record<string, string>> = {
  "/": "Overview",
  "/playground": "Playground",
  "/extensions": "Extensions",
  "/docs/installation": "Installation",
  "/docs/core": "Headless core",
}
