import type { NumberFormatOptions } from "./calculator-engine"
import type { GraphView } from "./graphing-view"

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
export const EMPTY_CALCULATOR_DEFINITIONS: ReadonlyArray<string> = []

/** Returns the supported extensions in their canonical display order. */
export function calculatorExtensions(): Array<CalculatorExtension> {
  return Object.values(CalculatorExtension)
}

/** Removes unsupported and duplicate extension values while preserving canonical input order. */
export function normalizeCalculatorExtensions(
  extensions: ReadonlyArray<CalculatorExtension> | undefined
): Array<CalculatorExtension> {
  const supported = calculatorExtensions()
  if (extensions === undefined || !Array.isArray(extensions)) {
    return supported
  }

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
  entries: ReadonlyArray<{ expression: string; value: number | undefined }>
): Record<string, number> {
  return Object.fromEntries(
    entries.flatMap(({ expression, value }) => {
      if (value === undefined) {
        return []
      }
      const name = expression.split("=")[0]?.trim().toLowerCase()
      return /^[a-z]$/.test(name) ? [[name, value]] : []
    })
  )
}
