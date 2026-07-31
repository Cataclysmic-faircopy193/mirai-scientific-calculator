export interface DescriptiveStatistics {
  n: number
  sum: number
  mean: number
  median: number
  mode: number | null
  modeFrequency: number
  min: number
  q1: number
  q3: number
  max: number
  range: number
  iqr: number
  populationVariance: number
  sampleVariance: number
  populationStandardDeviation: number
  sampleStandardDeviation: number
  sorted: number[]
}

export type RegressionModel =
  | "linear"
  | "quadratic"
  | "cubic"
  | "exponential"
  | "logarithmic"
  | "power"

export interface RegressionParameter {
  label: string
  value: number
}

export interface RegressionResult {
  ok: boolean
  label: string
  params: RegressionParameter[]
  r2: number
  residuals: number[]
  predict: (x: number) => number
  message: string
}

interface CompensatedAccumulator {
  sum: number
  correction: number
}

function addCompensated(accumulator: CompensatedAccumulator, value: number): void {
  const next = accumulator.sum + value
  accumulator.correction +=
    Math.abs(accumulator.sum) >= Math.abs(value)
      ? accumulator.sum - next + value
      : value - next + accumulator.sum
  accumulator.sum = next
}

function maximumAbsolute(values: readonly number[]): number {
  let maximum = 0
  for (const value of values) maximum = Math.max(maximum, Math.abs(value))
  return maximum
}

function compensatedSumCore(
  values: readonly number[],
  transform: (value: number, index: number) => number
): number {
  const accumulator: CompensatedAccumulator = { sum: 0, correction: 0 }
  values.forEach((value, index) => {
    addCompensated(accumulator, transform(value, index))
  })
  return accumulator.sum + accumulator.correction
}

function compensatedSum(
  values: readonly number[],
  transform: (value: number, index: number) => number = (value) => value
): number {
  const transformed = values.map(transform)
  const direct = compensatedSumCore(transformed, (value) => value)
  if (Number.isFinite(direct)) return direct

  const scale = maximumAbsolute(transformed)
  if (scale === 0) return direct
  return compensatedSumCore(transformed, (value) => value / scale) * scale
}

function stableMean(values: readonly number[]): number {
  const sum = compensatedSum(values)
  return Number.isFinite(sum)
    ? sum / values.length
    : compensatedSum(values, (value) => value / values.length)
}

/** Parses finite numeric values from whitespace-, comma-, or semicolon-delimited input. */
export function parseNumberList(source: string): number[] {
  return source
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite)
}

/** Creates a padded numeric extent suitable for plotting a list of values. */
export function calculateNumberExtent(values: readonly number[]): [number, number] {
  if (values.length === 0) return [0, 1]
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  if (minimum === maximum) return [minimum - 1, maximum + 1]
  const padding = (maximum - minimum) * 0.1
  return [minimum - padding, maximum + padding]
}

/** Serializes initial statistics values for a plain-text numeric input. */
export function serializeNumberList(values: readonly (number | string)[] | undefined): string {
  return values?.join(", ") ?? ""
}

/** Interpolates a percentile from an already sorted finite numeric list. */
export function quantile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) {
    throw new Error("Quantile needs at least one value")
  }
  if (!Number.isFinite(percentile) || percentile < 0 || percentile > 1) {
    throw new Error("Quantile percentile must be between 0 and 1")
  }

  const index = (sortedValues.length - 1) * percentile
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const fraction = index - lower

  if (fraction === 0) return sortedValues[lower]
  return compensatedSum([sortedValues[lower] * (1 - fraction), sortedValues[upper] * fraction])
}

/** Calculates descriptive statistics for a non-empty finite numeric sample. */
export function calculateStatistics(values: number[]): DescriptiveStatistics {
  if (values.length === 0) {
    throw new Error("At least one finite value is required")
  }
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("Statistics require finite values")
  }

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const sum = compensatedSum(values)
  const mean = stableMean(values)
  const median = quantile(sorted, 0.5)
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const scale = maximumAbsolute(sorted)
  const normalizedSquaredError =
    scale === 0 ? 0 : compensatedSum(sorted, (value) => (value / scale - mean / scale) ** 2)
  const populationVariance = scale === 0 ? 0 : (normalizedSquaredError / n) * scale * scale
  const sampleVariance = n > 1 ? (normalizedSquaredError / (n - 1)) * scale * scale : Number.NaN
  const populationStandardDeviation =
    scale === 0 ? 0 : Math.sqrt(normalizedSquaredError / n) * scale
  const sampleStandardDeviation =
    n > 1 ? Math.sqrt(normalizedSquaredError / (n - 1)) * scale : Number.NaN
  const frequencies = new Map<number, number>()

  for (const value of sorted) {
    const frequency = (frequencies.get(value) ?? 0) + 1
    frequencies.set(value, frequency)
  }

  let modeFrequency = 0
  for (const frequency of frequencies.values()) {
    modeFrequency = Math.max(modeFrequency, frequency)
  }
  const modes = [...frequencies.entries()]
    .filter(([, frequency]) => frequency === modeFrequency)
    .map(([value]) => value)
  const mode = modeFrequency > 1 && modes.length === 1 ? modes[0] : null

  return {
    n,
    sum,
    mean,
    median,
    mode,
    modeFrequency,
    min: sorted[0],
    q1,
    q3,
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
    iqr: q3 - q1,
    populationVariance,
    sampleVariance,
    populationStandardDeviation,
    sampleStandardDeviation,
    sorted,
  }
}

/** Calculates sample covariance for two paired finite lists. */
export function covariance(xValues: number[], yValues: number[]): number {
  if (xValues.length !== yValues.length) {
    throw new Error("Paired lists must have the same length")
  }
  if (
    xValues.some((value) => !Number.isFinite(value)) ||
    yValues.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Covariance requires finite values")
  }
  const pairCount = xValues.length
  if (pairCount < 2) throw new Error("At least two paired values are required")

  const xScale = maximumAbsolute(xValues)
  const yScale = maximumAbsolute(yValues)
  if (xScale === 0 || yScale === 0) return 0

  const normalizedXMean = stableMean(xValues.map((value) => value / xScale))
  const normalizedYMean = stableMean(yValues.map((value) => value / yScale))
  const cross: CompensatedAccumulator = { sum: 0, correction: 0 }

  for (let index = 0; index < pairCount; index += 1) {
    addCompensated(
      cross,
      (xValues[index] / xScale - normalizedXMean) * (yValues[index] / yScale - normalizedYMean)
    )
  }

  const normalizedCovariance = (cross.sum + cross.correction) / (pairCount - 1)
  return normalizedCovariance * xScale * yScale
}

/** Calculates the bounded Pearson correlation for two paired finite lists. */
export function correlation(xValues: number[], yValues: number[]): number {
  if (xValues.length !== yValues.length) {
    throw new Error("Paired lists must have the same length")
  }
  if (
    xValues.some((value) => !Number.isFinite(value)) ||
    yValues.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Correlation requires finite values")
  }
  const pairCount = xValues.length
  if (pairCount < 2) throw new Error("At least two paired values are required")

  const xScale = maximumAbsolute(xValues)
  const yScale = maximumAbsolute(yValues)
  if (xScale === 0 || yScale === 0) {
    throw new Error("Correlation is undefined for a constant list")
  }
  const xMean = stableMean(xValues.map((value) => value / xScale))
  const yMean = stableMean(yValues.map((value) => value / yScale))
  const cross: CompensatedAccumulator = { sum: 0, correction: 0 }
  const xSquares: CompensatedAccumulator = { sum: 0, correction: 0 }
  const ySquares: CompensatedAccumulator = { sum: 0, correction: 0 }

  for (let index = 0; index < pairCount; index += 1) {
    const xDelta = xValues[index] / xScale - xMean
    const yDelta = yValues[index] / yScale - yMean
    addCompensated(cross, xDelta * yDelta)
    addCompensated(xSquares, xDelta ** 2)
    addCompensated(ySquares, yDelta ** 2)
  }

  const crossTotal = cross.sum + cross.correction
  const xSquareTotal = xSquares.sum + xSquares.correction
  const ySquareTotal = ySquares.sum + ySquares.correction
  const denominator = Math.sqrt(xSquareTotal) * Math.sqrt(ySquareTotal)
  if (denominator === 0) {
    throw new Error("Correlation is undefined for a constant list")
  }
  return Math.max(-1, Math.min(1, crossTotal / denominator))
}

function solveLeastSquares(inputMatrix: number[][], inputVector: number[]): number[] | null {
  const rowCount = inputMatrix.length
  const columnCount = inputMatrix[0]?.length ?? 0
  if (rowCount < columnCount || columnCount === 0) return null

  const matrix = inputMatrix.map((row) => [...row])
  const vector = [...inputVector]

  for (let column = 0; column < columnCount; column += 1) {
    let norm = 0
    for (let row = column; row < rowCount; row += 1) {
      norm = Math.hypot(norm, matrix[row][column])
    }
    if (norm <= Number.EPSILON * rowCount * 16) return null

    const alpha = matrix[column][column] >= 0 ? -norm : norm
    const householder = Array<number>(rowCount - column)
    householder[0] = matrix[column][column] - alpha
    let vectorNormSquared = householder[0] ** 2
    for (let row = column + 1; row < rowCount; row += 1) {
      householder[row - column] = matrix[row][column]
      vectorNormSquared += householder[row - column] ** 2
    }
    if (vectorNormSquared === 0) return null

    for (let target = column; target < columnCount; target += 1) {
      let dot = householder[0] * matrix[column][target]
      for (let row = column + 1; row < rowCount; row += 1) {
        dot += householder[row - column] * matrix[row][target]
      }
      const factor = (2 * dot) / vectorNormSquared
      matrix[column][target] -= factor * householder[0]
      for (let row = column + 1; row < rowCount; row += 1) {
        matrix[row][target] -= factor * householder[row - column]
      }
    }

    let vectorDot = householder[0] * vector[column]
    for (let row = column + 1; row < rowCount; row += 1) {
      vectorDot += householder[row - column] * vector[row]
    }
    const vectorFactor = (2 * vectorDot) / vectorNormSquared
    vector[column] -= vectorFactor * householder[0]
    for (let row = column + 1; row < rowCount; row += 1) {
      vector[row] -= vectorFactor * householder[row - column]
    }
  }

  const solution = Array<number>(columnCount).fill(0)
  for (let row = columnCount - 1; row >= 0; row -= 1) {
    const diagonal = matrix[row][row]
    if (Math.abs(diagonal) <= Number.EPSILON * rowCount * 16) return null
    let remainder = vector[row]
    for (let column = row + 1; column < columnCount; column += 1) {
      remainder -= matrix[row][column] * solution[column]
    }
    solution[row] = remainder / diagonal
  }
  return solution
}

interface PolynomialFit {
  coefficients: number[]
  predict: (x: number) => number
}

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  if (n === 2) return 2
  if (n === 3) return k === 1 || k === 2 ? 3 : 1
  return 1
}

function fitPolynomial(xValues: number[], yValues: number[], degree: number): PolynomialFit | null {
  const xScale = maximumAbsolute(xValues)
  const yScale = maximumAbsolute(yValues) || 1
  if (xScale === 0) return null

  const normalizedX = xValues.map((value) => value / xScale)
  const normalizedCenter = stableMean(normalizedX)
  const normalizedSpread = maximumAbsolute(normalizedX.map((value) => value - normalizedCenter))
  if (normalizedSpread === 0) return null

  const directCenter = stableMean(xValues)
  const directDeviations = xValues.map((value) => value - directCenter)
  const directSpread = maximumAbsolute(directDeviations)
  const useDirectCentering =
    xScale >= 2.2250738585072014e-308 && Number.isFinite(directSpread) && directSpread > 0
  const center = useDirectCentering ? directCenter : normalizedCenter
  const spread = useDirectCentering ? directSpread : normalizedSpread
  const transformedX = useDirectCentering
    ? directDeviations.map((value) => value / spread)
    : normalizedX.map((value) => (value - center) / spread)
  const transform = (value: number) => {
    if (!useDirectCentering) return (value / xScale - center) / spread
    const delta = value - center
    return Number.isFinite(delta) ? delta / spread : value / spread - center / spread
  }
  const logAlpha = useDirectCentering ? -Math.log(spread) : -Math.log(xScale) - Math.log(spread)
  const beta = -center / spread
  const matrix = transformedX.map((value) =>
    Array.from({ length: degree + 1 }, (_, power) => value ** power)
  )
  const normalizedCoefficients = solveLeastSquares(
    matrix,
    yValues.map((value) => value / yScale)
  )
  if (!normalizedCoefficients) return null

  const predict = (x: number) => {
    const transformed = transform(x)
    let result = 0
    for (let power = degree; power >= 0; power -= 1) {
      result = result * transformed + normalizedCoefficients[power]
    }
    return result * yScale
  }

  const coefficients = Array<number>(degree + 1).fill(0)
  for (let outputPower = 0; outputPower <= degree; outputPower += 1) {
    const terms: number[] = []
    for (let normalizedPower = outputPower; normalizedPower <= degree; normalizedPower += 1) {
      const normalizedCoefficient = normalizedCoefficients[normalizedPower]
      const betaPower = normalizedPower - outputPower
      if (normalizedCoefficient === 0 || (beta === 0 && betaPower > 0)) {
        terms.push(0)
        continue
      }
      const sign = Math.sign(normalizedCoefficient) * (beta < 0 && betaPower % 2 === 1 ? -1 : 1)
      const logMagnitude =
        Math.log(Math.abs(normalizedCoefficient)) +
        Math.log(yScale) +
        Math.log(binomial(normalizedPower, outputPower)) +
        outputPower * logAlpha +
        (betaPower === 0 ? 0 : betaPower * Math.log(Math.abs(beta)))
      terms.push(sign * Math.exp(logMagnitude))
    }
    coefficients[outputPower] = compensatedSum(terms)
  }

  return { coefficients, predict }
}

function failedRegression(message: string): RegressionResult {
  return {
    ok: false,
    label: "No model",
    params: [],
    r2: Number.NaN,
    residuals: [],
    predict: () => Number.NaN,
    message,
  }
}

function finalizeRegression(
  label: string,
  params: RegressionParameter[],
  xValues: number[],
  yValues: number[],
  predict: (x: number) => number
): RegressionResult {
  const predictions = xValues.map(predict)
  if (
    predictions.some((value) => !Number.isFinite(value)) ||
    params.some((parameter) => !Number.isFinite(parameter.value))
  ) {
    return failedRegression("The selected model is not defined for this data.")
  }

  const mean = stableMean(yValues)
  const residuals = yValues.map((value, index) => value - predictions[index])
  if (residuals.some((value) => !Number.isFinite(value))) {
    return failedRegression("The regression residuals exceed the numeric range.")
  }
  const deviations = yValues.map((value) => value - mean)
  const residualScale = maximumAbsolute(residuals)
  const totalScale = maximumAbsolute(deviations)
  const residualSquares =
    residualScale === 0
      ? 0
      : compensatedSum(residuals, (residual) => (residual / residualScale) ** 2)
  const totalSquares =
    totalScale === 0 ? 0 : compensatedSum(deviations, (deviation) => (deviation / totalScale) ** 2)
  const errorRatio =
    totalScale === 0
      ? residualScale === 0
        ? 0
        : 1
      : (residualSquares / totalSquares) * (residualScale / totalScale) ** 2

  return {
    ok: true,
    label,
    params,
    r2: 1 - errorRatio,
    residuals,
    predict,
    message: `${xValues.length} paired values`,
  }
}

/** Fits a supported regression model to paired finite x and y observations. */
export function fitRegression(
  xInput: number[],
  yInput: number[],
  model: RegressionModel
): RegressionResult {
  if (xInput.length !== yInput.length) {
    return failedRegression("X and Y lists must have the same length.")
  }
  if (
    xInput.some((value) => !Number.isFinite(value)) ||
    yInput.some((value) => !Number.isFinite(value))
  ) {
    return failedRegression("Regression needs finite X and Y values.")
  }
  const pairCount = xInput.length
  if (pairCount < 2) {
    return failedRegression("Enter at least two paired x and y values.")
  }

  const xValues = [...xInput]
  const yValues = [...yInput]

  if (model === "exponential") {
    if (yValues.some((value) => value <= 0)) {
      return failedRegression("Exponential regression needs positive y values.")
    }
    const transformed = yValues.map(Math.log)
    const fit = fitPolynomial(xValues, transformed, 1)
    if (!fit) return failedRegression("The data cannot be fitted.")
    const a = Math.exp(fit.coefficients[0])
    const b = Math.exp(fit.coefficients[1])
    return finalizeRegression(
      "y = a · bˣ",
      [
        { label: "a", value: a },
        { label: "b", value: b },
      ],
      xValues,
      yValues,
      (x) => Math.exp(fit.predict(x))
    )
  }

  if (model === "logarithmic") {
    if (xValues.some((value) => value <= 0)) {
      return failedRegression("Logarithmic regression needs positive x values.")
    }
    const loggedX = xValues.map(Math.log)
    const fit = fitPolynomial(loggedX, yValues, 1)
    if (!fit) return failedRegression("The data cannot be fitted.")
    const [a, b] = fit.coefficients
    return finalizeRegression(
      "y = a + b ln(x)",
      [
        { label: "a", value: a },
        { label: "b", value: b },
      ],
      xValues,
      yValues,
      (x) => fit.predict(Math.log(x))
    )
  }

  if (model === "power") {
    if (xValues.some((value) => value <= 0) || yValues.some((value) => value <= 0)) {
      return failedRegression("Power regression needs positive x and y values.")
    }
    const fit = fitPolynomial(xValues.map(Math.log), yValues.map(Math.log), 1)
    if (!fit) return failedRegression("The data cannot be fitted.")
    const a = Math.exp(fit.coefficients[0])
    const b = fit.coefficients[1]
    return finalizeRegression(
      "y = a · xᵇ",
      [
        { label: "a", value: a },
        { label: "b", value: b },
      ],
      xValues,
      yValues,
      (x) => Math.exp(fit.predict(Math.log(x)))
    )
  }

  const degree = model === "cubic" ? 3 : model === "quadratic" ? 2 : 1
  if (pairCount < degree + 1) {
    return failedRegression(
      `${model[0].toUpperCase()}${model.slice(1)} regression needs at least ${degree + 1} points.`
    )
  }

  const fit = fitPolynomial(xValues, yValues, degree)
  if (!fit) return failedRegression("The data cannot be fitted.")

  const { coefficients, predict } = fit
  const labels = ["a", "b", "c", "d"]
  const params = coefficients.map((value, index) => ({
    label: labels[index],
    value,
  }))
  const label =
    degree === 1 ? "y = a + bx" : degree === 2 ? "y = a + bx + cx²" : "y = a + bx + cx² + dx³"

  return finalizeRegression(label, params, xValues, yValues, predict)
}
