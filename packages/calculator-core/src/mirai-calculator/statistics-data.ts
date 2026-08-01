/** Initial values supplied by a consumer to the statistics workspace. */
export interface StatisticsInitialData {
  xValues?: ReadonlyArray<number | string>
  yValues?: ReadonlyArray<number | string>
}

/** A pair of equally sized numeric series. */
export interface PairedNumberSeries {
  x: Array<number>
  y: Array<number>
}

/** A histogram bin covering a half-open numeric interval, except for the final inclusive bin. */
export interface HistogramBin {
  minimum: number
  maximum: number
  count: number
}

/** A numeric value and the number of times it occurs in a series. */
export interface NumberFrequency {
  value: number
  count: number
}

/** A sampled point from a regression predictor. */
export interface RegressionSample {
  x: number
  y: number
}

/** Parses finite numeric values from whitespace-, comma-, or semicolon-delimited input. */
export function parseNumberList(source: string): Array<number> {
  return source
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite)
}

/** Creates a padded numeric extent suitable for plotting a list of values. */
export function calculateNumberExtent(values: ReadonlyArray<number>): [number, number] {
  if (values.length === 0) {
    return [0, 1]
  }
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  if (minimum === maximum) {
    return [minimum - 1, maximum + 1]
  }
  const padding = (maximum - minimum) * 0.1
  return [minimum - padding, maximum + padding]
}

/** Serializes initial statistics values for a plain-text numeric input. */
export function serializeNumberList(values: ReadonlyArray<number | string> | undefined): string {
  return values?.join(", ") ?? ""
}

/** Pairs numeric series explicitly by truncating both to the shorter input length. */
export function pairNumberSeries(
  xValues: ReadonlyArray<number>,
  yValues: ReadonlyArray<number>
): PairedNumberSeries {
  const pairCount = Math.min(xValues.length, yValues.length)
  return {
    x: xValues.slice(0, pairCount),
    y: yValues.slice(0, pairCount),
  }
}

/** Builds square-root-sized histogram bins over the padded extent of a numeric series. */
export function buildHistogram(values: ReadonlyArray<number>): Array<HistogramBin> {
  const finiteValues = values.filter(Number.isFinite)
  if (finiteValues.length === 0) {
    return []
  }
  const [minimum, maximum] = calculateNumberExtent(finiteValues)
  const binCount = Math.max(4, Math.ceil(Math.sqrt(finiteValues.length)))
  const binWidth = (maximum - minimum) / binCount
  const counts = Array.from({ length: binCount }, () => 0)

  for (const value of finiteValues) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - minimum) / binWidth)))
    counts[index] += 1
  }

  return counts.map((count, index) => ({
    minimum: minimum + index * binWidth,
    maximum: minimum + (index + 1) * binWidth,
    count,
  }))
}

/** Counts finite numeric values while preserving first-occurrence order. */
export function countNumberFrequencies(values: ReadonlyArray<number>): Array<NumberFrequency> {
  const frequencies = new Map<number, number>()
  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue
    }
    frequencies.set(value, (frequencies.get(value) ?? 0) + 1)
  }
  return [...frequencies].map(([value, count]) => ({ value, count }))
}

/** Samples finite points from a predictor across an inclusive numeric interval. */
export function sampleRegression(
  predict: (x: number) => number,
  xmin: number,
  xmax: number,
  sampleCount = 240
): Array<RegressionSample> {
  if (
    !Number.isFinite(xmin) ||
    !Number.isFinite(xmax) ||
    xmin >= xmax ||
    !Number.isInteger(sampleCount) ||
    sampleCount < 1
  ) {
    return []
  }

  const samples: Array<RegressionSample> = []
  for (let index = 0; index <= sampleCount; index += 1) {
    const x = xmin + (index / sampleCount) * (xmax - xmin)
    const y = predict(x)
    if (Number.isFinite(y)) {
      samples.push({ x, y })
    }
  }
  return samples
}
