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

export function parseNumberList(source: string): number[] {
  return source
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite)
}

export function quantile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return Number.NaN

  const clamped = Math.min(1, Math.max(0, percentile))
  const index = (sortedValues.length - 1) * clamped
  const lower = Math.floor(index)
  const upper = Math.ceil(index)

  return (
    sortedValues[lower] +
    (sortedValues[upper] - sortedValues[lower]) * (index - lower)
  )
}

export function calculateStatistics(values: number[]): DescriptiveStatistics {
  if (values.length === 0) {
    throw new Error("At least one finite value is required")
  }

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const sum = sorted.reduce((total, value) => total + value, 0)
  const mean = sum / n
  const median = quantile(sorted, 0.5)
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const squaredError = sorted.reduce(
    (total, value) => total + (value - mean) ** 2,
    0,
  )
  const frequencies = new Map<number, number>()
  let mode: number | null = null
  let modeFrequency = 0

  for (const value of sorted) {
    const frequency = (frequencies.get(value) ?? 0) + 1
    frequencies.set(value, frequency)
    if (frequency > modeFrequency) {
      mode = value
      modeFrequency = frequency
    }
  }

  if (modeFrequency === 1) mode = null

  const populationVariance = squaredError / n
  const sampleVariance = n > 1 ? squaredError / (n - 1) : Number.NaN

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
    populationStandardDeviation: Math.sqrt(populationVariance),
    sampleStandardDeviation: Math.sqrt(sampleVariance),
    sorted,
  }
}

export function covariance(xValues: number[], yValues: number[]): number {
  const pairCount = Math.min(xValues.length, yValues.length)
  if (pairCount < 2) throw new Error("At least two paired values are required")

  const xs = xValues.slice(0, pairCount)
  const ys = yValues.slice(0, pairCount)
  const xMean = xs.reduce((sum, value) => sum + value, 0) / pairCount
  const yMean = ys.reduce((sum, value) => sum + value, 0) / pairCount

  return (
    xs.reduce(
      (sum, value, index) =>
        sum + (value - xMean) * (ys[index] - yMean),
      0,
    ) /
    (pairCount - 1)
  )
}

export function correlation(xValues: number[], yValues: number[]): number {
  const pairCount = Math.min(xValues.length, yValues.length)
  if (pairCount < 2) throw new Error("At least two paired values are required")

  const xs = xValues.slice(0, pairCount)
  const ys = yValues.slice(0, pairCount)
  const xMean = xs.reduce((sum, value) => sum + value, 0) / pairCount
  const yMean = ys.reduce((sum, value) => sum + value, 0) / pairCount
  let cross = 0
  let xSquares = 0
  let ySquares = 0

  for (let index = 0; index < pairCount; index += 1) {
    const xDelta = xs[index] - xMean
    const yDelta = ys[index] - yMean
    cross += xDelta * yDelta
    xSquares += xDelta ** 2
    ySquares += yDelta ** 2
  }

  const denominator = Math.sqrt(xSquares * ySquares)
  return denominator === 0 ? Number.NaN : cross / denominator
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const size = vector.length
  const augmented = matrix.map((row, index) => [...row, vector[index]])

  for (let column = 0; column < size; column += 1) {
    let pivot = column
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row
      }
    }

    if (Math.abs(augmented[pivot][column]) < 1e-12) return null
    ;[augmented[column], augmented[pivot]] = [
      augmented[pivot],
      augmented[column],
    ]

    const divisor = augmented[column][column]
    for (let entry = column; entry <= size; entry += 1) {
      augmented[column][entry] /= divisor
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue
      const factor = augmented[row][column]
      for (let entry = column; entry <= size; entry += 1) {
        augmented[row][entry] -= factor * augmented[column][entry]
      }
    }
  }

  return augmented.map((row) => row[size])
}

function polynomialCoefficients(
  xValues: number[],
  yValues: number[],
  degree: number,
): number[] | null {
  const size = degree + 1
  const matrix = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) =>
      xValues.reduce(
        (sum, value) => sum + value ** (row + column),
        0,
      ),
    ),
  )
  const vector = Array.from({ length: size }, (_, power) =>
    xValues.reduce(
      (sum, value, index) => sum + yValues[index] * value ** power,
      0,
    ),
  )

  return solveLinearSystem(matrix, vector)
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
  predict: (x: number) => number,
): RegressionResult {
  const predictions = xValues.map(predict)
  if (predictions.some((value) => !Number.isFinite(value))) {
    return failedRegression("The selected model is not defined for this data.")
  }

  const mean = yValues.reduce((sum, value) => sum + value, 0) / yValues.length
  const residuals = yValues.map((value, index) => value - predictions[index])
  const residualSquares = residuals.reduce(
    (sum, residual) => sum + residual ** 2,
    0,
  )
  const totalSquares = yValues.reduce(
    (sum, value) => sum + (value - mean) ** 2,
    0,
  )

  return {
    ok: true,
    label,
    params,
    r2: totalSquares === 0 ? 1 : 1 - residualSquares / totalSquares,
    residuals,
    predict,
    message: `${xValues.length} paired values`,
  }
}

export function fitRegression(
  xInput: number[],
  yInput: number[],
  model: RegressionModel,
): RegressionResult {
  const pairCount = Math.min(xInput.length, yInput.length)
  if (pairCount < 2) {
    return failedRegression("Enter at least two paired x and y values.")
  }

  let xValues = xInput.slice(0, pairCount)
  let yValues = yInput.slice(0, pairCount)

  if (model === "exponential") {
    const pairs = xValues
      .map((x, index) => [x, yValues[index]] as const)
      .filter((pair) => pair[1] > 0)
    if (pairs.length < 2) {
      return failedRegression("Exponential regression needs positive y values.")
    }
    xValues = pairs.map((pair) => pair[0])
    yValues = pairs.map((pair) => pair[1])
    const transformed = yValues.map(Math.log)
    const coefficients = polynomialCoefficients(xValues, transformed, 1)
    if (!coefficients) return failedRegression("The data cannot be fitted.")
    const a = Math.exp(coefficients[0])
    const b = Math.exp(coefficients[1])
    return finalizeRegression(
      "y = a · bˣ",
      [
        { label: "a", value: a },
        { label: "b", value: b },
      ],
      xValues,
      yValues,
      (x) => a * b ** x,
    )
  }

  if (model === "logarithmic") {
    const pairs = xValues
      .map((x, index) => [x, yValues[index]] as const)
      .filter((pair) => pair[0] > 0)
    if (pairs.length < 2) {
      return failedRegression("Logarithmic regression needs positive x values.")
    }
    xValues = pairs.map((pair) => pair[0])
    yValues = pairs.map((pair) => pair[1])
    const loggedX = xValues.map(Math.log)
    const coefficients = polynomialCoefficients(loggedX, yValues, 1)
    if (!coefficients) return failedRegression("The data cannot be fitted.")
    const [a, b] = coefficients
    return finalizeRegression(
      "y = a + b ln(x)",
      [
        { label: "a", value: a },
        { label: "b", value: b },
      ],
      xValues,
      yValues,
      (x) => a + b * Math.log(x),
    )
  }

  if (model === "power") {
    const pairs = xValues
      .map((x, index) => [x, yValues[index]] as const)
      .filter((pair) => pair[0] > 0 && pair[1] > 0)
    if (pairs.length < 2) {
      return failedRegression("Power regression needs positive x and y values.")
    }
    xValues = pairs.map((pair) => pair[0])
    yValues = pairs.map((pair) => pair[1])
    const coefficients = polynomialCoefficients(
      xValues.map(Math.log),
      yValues.map(Math.log),
      1,
    )
    if (!coefficients) return failedRegression("The data cannot be fitted.")
    const a = Math.exp(coefficients[0])
    const b = coefficients[1]
    return finalizeRegression(
      "y = a · xᵇ",
      [
        { label: "a", value: a },
        { label: "b", value: b },
      ],
      xValues,
      yValues,
      (x) => a * x ** b,
    )
  }

  const degree = model === "cubic" ? 3 : model === "quadratic" ? 2 : 1
  if (pairCount < degree + 1) {
    return failedRegression(
      `${model[0].toUpperCase()}${model.slice(1)} regression needs at least ${degree + 1} points.`,
    )
  }

  const coefficients = polynomialCoefficients(xValues, yValues, degree)
  if (!coefficients) return failedRegression("The data cannot be fitted.")

  const predict = (x: number) =>
    coefficients.reduce(
      (sum, coefficient, power) => sum + coefficient * x ** power,
      0,
    )
  const labels = ["a", "b", "c", "d"]
  const params = coefficients.map((value, index) => ({
    label: labels[index],
    value,
  }))
  const label =
    degree === 1 ? "y = a + bx" : degree === 2 ? "y = a + bx + cx²" : "y = a + bx + cx² + dx³"

  return finalizeRegression(label, params, xValues, yValues, predict)
}
