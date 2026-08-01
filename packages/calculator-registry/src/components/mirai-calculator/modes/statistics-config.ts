import type { RegressionModel } from "@openmirai/calculator-core/statistics"

/** Chart variants available in the statistics workspace. */
export type StatisticsChartType = "scatter" | "histogram" | "box" | "dot" | "residual"

/** User-facing statistics chart options. */
export const STATISTICS_CHART_OPTIONS: Array<{
  value: StatisticsChartType
  label: string
}> = [
  { value: "scatter", label: "Scatter" },
  { value: "histogram", label: "Histogram" },
  { value: "box", label: "Box plot" },
  { value: "dot", label: "Dot plot" },
  { value: "residual", label: "Residuals" },
]

/** User-facing regression model options. */
export const STATISTICS_REGRESSION_OPTIONS: Array<{
  value: RegressionModel
  label: string
}> = [
  { value: "linear", label: "Linear" },
  { value: "quadratic", label: "Quadratic" },
  { value: "cubic", label: "Cubic" },
  { value: "exponential", label: "Exponential" },
  { value: "logarithmic", label: "Logarithmic" },
  { value: "power", label: "Power" },
]
