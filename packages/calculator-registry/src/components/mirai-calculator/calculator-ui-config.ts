/** Supported decimal-place options displayed by calculator settings. */
export const CALCULATOR_DECIMAL_OPTIONS = [0, 1, 2, 3, 4, 6] as const

/** Graph viewport properties exposed by calculator settings. */
export const CALCULATOR_GRAPH_BOUNDARY_KEYS = ["xmin", "xmax", "ymin", "ymax"] as const

/** Human-readable angle-mode labels. */
export const CALCULATOR_ANGLE_MODE_LABELS = {
  degrees: "Degrees",
  radians: "Radians",
} as const

/** Human-readable number-notation labels. */
export const CALCULATOR_NOTATION_LABELS = {
  auto: "Automatic",
  scientific: "Scientific",
} as const

/** Human-readable calculator theme labels. */
export const CALCULATOR_THEME_LABELS = {
  dark: "Dark",
  light: "Light",
  system: "System",
} as const

/** Semantic shadcn chart tokens used by calculator visualizations. */
export const CALCULATOR_CHART_TOKENS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const
