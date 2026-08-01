export const SITE_NAME = "OpenMirai Calculator"
export const SITE_DESCRIPTION =
  "An editable scientific, graphing, statistics, and math tools calculator installed through shadcn, backed by a dependency-free core."
export const GITHUB_URL = "https://github.com/openmirai/mirai-scientific-calculator"
export const CORE_PACKAGE_NAME = "@openmirai/calculator-core"
export const CORE_PACKAGE_VERSION = "0.2.0"
export const CORE_PACKAGE_URL = `https://www.npmjs.com/package/${CORE_PACKAGE_NAME}`
export const CURRENT_RELEASE = `v${CORE_PACKAGE_VERSION}`
export const CURRENT_RELEASE_URL = `${GITHUB_URL}/releases/tag/${CURRENT_RELEASE}`
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
