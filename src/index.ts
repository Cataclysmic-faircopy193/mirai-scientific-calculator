import "@/styles.css"

export {
  MiraiCalculator,
  type CalculatorMode,
  type CalculatorTheme,
  type MiraiCalculatorProps,
} from "@/components/mirai-calculator"
export {
  CalculatorEngine,
  evaluateExpression,
  factorial,
  greatestCommonDivisor,
  type AngleMode,
  type CalculatorEngineOptions,
  type CalculatorValue,
  type NumberFormatOptions,
} from "@/lib/calculator-engine"
export {
  compileGraphExpression,
  findExtrema,
  findIntersections,
  findRoots,
  type CompiledGraphExpression,
  type GraphPoint,
  type GraphView,
} from "@/lib/graphing"
export {
  calculateStatistics,
  correlation,
  covariance,
  fitRegression,
  parseNumberList,
  quantile,
  type DescriptiveStatistics,
  type RegressionModel,
  type RegressionParameter,
  type RegressionResult,
} from "@/lib/statistics"
export {
  calculateCoordinates,
  calculatePercent,
  calculateRatio,
  calculateShapes,
  type CoordinateResults,
  type PercentResults,
  type RatioResults,
  type ShapeResults,
} from "@/lib/tools"
