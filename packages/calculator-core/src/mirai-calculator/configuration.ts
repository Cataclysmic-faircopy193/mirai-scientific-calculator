import type { NumberFormatOptions } from "./calculator-engine"
import type { GraphView } from "./graphing"

/** Identifies an installable calculator workspace. */
export const CalculatorExtension = {
  SCIENTIFIC: "scientific",
  GRAPHING: "graphing",
  STATISTICS: "statistics",
  TOOLS: "tools",
} as const

/** A supported calculator workspace identifier. */
export type CalculatorExtension = (typeof CalculatorExtension)[keyof typeof CalculatorExtension]

/** The active calculator workspace. */
export type CalculatorMode = CalculatorExtension

/** A calculator color-scheme preference. */
export type CalculatorTheme = "light" | "dark" | "system"

/** Display settings shared by calculator interfaces. */
export interface CalculatorDisplaySettings {
  notation: "auto" | "scientific"
  decimals: number | "auto"
  significantFigures: number
  thousandsSeparator: boolean
}

/** Supported decimal-place options for calculator settings controls. */
export const DECIMAL_OPTIONS = [0, 1, 2, 3, 4, 6] as const

/** Graph viewport properties that can be edited as numeric boundaries. */
export const GRAPH_BOUNDARY_KEYS = ["xmin", "xmax", "ymin", "ymax"] as const

/** Human-readable angle-mode labels. */
export const ANGLE_MODE_LABELS = {
  degrees: "Degrees",
  radians: "Radians",
} as const

/** Human-readable number-notation labels. */
export const NOTATION_LABELS = {
  auto: "Automatic",
  scientific: "Scientific",
} as const

/** Human-readable calculator theme labels. */
export const THEME_LABELS = {
  dark: "Dark",
  light: "Light",
  system: "System",
} as const

/** Semantic shadcn chart tokens used by calculator visualizations. */
export const CALCULATOR_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

/** Default result formatting used when the host does not provide settings UI. */
export const DEFAULT_DISPLAY_SETTINGS: Readonly<CalculatorDisplaySettings> = {
  notation: "auto",
  decimals: "auto",
  significantFigures: 12,
  thousandsSeparator: true,
}

/** Default graph viewport used by graph-capable calculator interfaces. */
export const DEFAULT_GRAPH_VIEW: Readonly<GraphView> = {
  xmin: -8,
  xmax: 8,
  ymin: -5,
  ymax: 7,
}

/** Empty reusable-definition collection for headless calculator defaults. */
export const EMPTY_CALCULATOR_DEFINITIONS: readonly string[] = []

/** Returns the supported extensions in their canonical display order. */
export function calculatorExtensions(): CalculatorExtension[] {
  return Object.values(CalculatorExtension)
}

/** Removes unsupported and duplicate extension values while preserving canonical input order. */
export function normalizeCalculatorExtensions(
  extensions: readonly CalculatorExtension[] | undefined
): CalculatorExtension[] {
  const supported = calculatorExtensions()
  if (extensions === undefined || !Array.isArray(extensions)) return supported

  const supportedExtensions = new Set<unknown>(supported)
  return [...new Set(extensions.filter((extension) => supportedExtensions.has(extension)))]
}

/** Converts display settings into calculator-engine formatting options. */
export function calculatorNumberFormatOptions(
  settings: CalculatorDisplaySettings
): NumberFormatOptions {
  return {
    notation: settings.notation,
    decimals: settings.decimals,
    significantFigures: settings.significantFigures,
    thousandsSeparator: settings.thousandsSeparator,
  }
}

/** Collects single-letter calculator variables from slider-backed expressions. */
export function collectSliderVariables(
  entries: readonly { expression: string; value: number | undefined }[]
): Record<string, number> {
  return Object.fromEntries(
    entries.flatMap(({ expression, value }) => {
      if (value === undefined) return []
      const name = expression.split("=")[0]?.trim().toLowerCase()
      return /^[a-z]$/.test(name) ? [[name, value]] : []
    })
  )
}

/** Resolves a CSS custom-property token to a canvas-compatible color. */
export function resolveCssColorToken(
  token: string,
  customProperties: Readonly<Record<string, string>>,
  fallback: string
): string {
  const match = /^var\((--[^)]+)\)$/.exec(token.trim())
  if (!match) return token || fallback
  return customProperties[match[1]]?.trim() || fallback
}
