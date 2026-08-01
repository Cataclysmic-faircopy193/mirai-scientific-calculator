import { describe, expect, it } from "vitest"

import {
  calculateStatistics,
  correlation,
  covariance,
  fitRegression,
  quantile,
} from "../statistics"
import {
  buildHistogram,
  calculateNumberExtent,
  countNumberFrequencies,
  pairNumberSeries,
  parseNumberList,
  sampleRegression,
  serializeNumberList,
} from "../statistics-data"

describe("statistics utilities", () => {
  it("prepares numeric input and padded plot extents", () => {
    expect(serializeNumberList([2, "4", 8])).toBe("2, 4, 8")
    expect(serializeNumberList(undefined)).toBe("")
    expect(calculateNumberExtent([])).toEqual([0, 1])
    expect(calculateNumberExtent([3])).toEqual([2, 4])
    expect(calculateNumberExtent([0, 10])).toEqual([-1, 11])
    expect(calculateNumberExtent([-10, -5])).toEqual([-10.5, -4.5])
  })

  it("builds reusable chart datasets outside the registry UI", () => {
    expect(pairNumberSeries([1, 2, 3], [4, 5])).toEqual({ x: [1, 2], y: [4, 5] })
    expect(countNumberFrequencies([2, 4, 2, Number.NaN, 4, 2])).toEqual([
      { value: 2, count: 3 },
      { value: 4, count: 2 },
    ])

    const histogram = buildHistogram([1, 2, 3, 4])
    expect(histogram).toHaveLength(4)
    expect(histogram.reduce((total, bin) => total + bin.count, 0)).toBe(4)
    expect(buildHistogram([1, Number.NaN, 2]).reduce((total, bin) => total + bin.count, 0)).toBe(2)

    expect(sampleRegression((x) => x * 2, 0, 2, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ])
  })

  it("returns empty chart datasets for invalid domains", () => {
    expect(buildHistogram([])).toEqual([])
    expect(sampleRegression((x) => x, 1, 1)).toEqual([])
    expect(sampleRegression((x) => x, 0, 1, 0)).toEqual([])
    expect(sampleRegression(() => Number.NaN, 0, 1, 2)).toEqual([])
  })

  it("parses flexible list input", () => {
    expect(parseNumberList("1, 2\n3; invalid 4")).toEqual([1, 2, 3, 4])
    expect(parseNumberList("  -1e2 +3.5 Infinity NaN  ")).toEqual([-100, 3.5])
    expect(parseNumberList(" , ; \n ")).toEqual([])
  })

  it("calculates descriptive statistics", () => {
    const result = calculateStatistics([1, 2, 2, 4, 5])

    expect(result.n).toBe(5)
    expect(result.sum).toBe(14)
    expect(result.mean).toBe(2.8)
    expect(result.median).toBe(2)
    expect(result.mode).toBe(2)
    expect(result.range).toBe(4)
    expect(result.populationVariance).toBeCloseTo(2.16)
    expect(quantile(result.sorted, 0.75)).toBe(4)
  })

  it("calculates paired correlation and covariance", () => {
    const x = [1, 2, 3, 4]
    const y = [3, 5, 7, 9]

    expect(correlation(x, y)).toBeCloseTo(1)
    expect(covariance(x, y)).toBeCloseTo(10 / 3)
  })

  it("rejects invalid statistical domains instead of truncating or clamping", () => {
    expect(() => calculateStatistics([])).toThrow(/at least one/i)
    expect(() => calculateStatistics([1, Number.NaN])).toThrow(/finite/i)
    expect(() => quantile([], 0.5)).toThrow(/at least one/i)
    expect(() => quantile([1, 2, 3], -0.1)).toThrow(/between 0 and 1/i)
    expect(() => quantile([1, 2, 3], Number.NaN)).toThrow(/between 0 and 1/i)
    expect(() => covariance([1, 2], [1])).toThrow(/same length/i)
    expect(() => covariance([1], [1])).toThrow(/at least two/i)
    expect(() => covariance([1, Number.NaN], [1, 2])).toThrow(/finite/i)
    expect(() => correlation([1], [1])).toThrow(/at least two/i)
    expect(() => correlation([1, 2], [1])).toThrow(/same length/i)
    expect(() => correlation([1, 2], [1, Number.POSITIVE_INFINITY])).toThrow(/finite/i)
    expect(() => correlation([1, 1], [2, 3])).toThrow(/constant/i)
  })

  it("covers quantile boundaries and zero-valued paired samples", () => {
    expect(quantile([1, 3, 8, 10], 0)).toBe(1)
    expect(quantile([1, 3, 8, 10], 1)).toBe(10)
    expect(quantile([1, 3, 8, 10], 0.5)).toBe(5.5)
    expect(covariance([0, 0], [3, 4])).toBe(0)
    expect(covariance([3, 4], [0, 0])).toBe(0)
    expect(() => correlation([0, 0], [0, 0])).toThrow(/constant/i)
  })

  it("uses stable arithmetic for cancellation and extreme quantiles", () => {
    const cancelled = calculateStatistics([1e16, 1, -1e16])
    const extreme = calculateStatistics([-1e308, 1e308])
    const overflowThenCancellation = calculateStatistics([1e308, 1e308, -1e308])

    expect(cancelled.sum).toBe(1)
    expect(overflowThenCancellation.sum).toBe(1e308)
    expect(extreme.mean).toBe(0)
    expect(extreme.median).toBe(0)
    expect(quantile(extreme.sorted, 0.5)).toBe(0)
    expect(extreme.populationStandardDeviation).toBe(1e308)
  })

  it("reports no unique mode when several values share the highest frequency", () => {
    const result = calculateStatistics([1, 1, 2, 2, 3])

    expect(result.mode).toBeNull()
    expect(result.modeFrequency).toBe(2)
  })

  it("computes correlation without overflowing intermediate squares", () => {
    expect(correlation([1e200, 2e200, 3e200], [2e200, 4e200, 6e200])).toBeCloseTo(1)
    expect(covariance([1e200, 2e200, 3e200], [1e-200, 2e-200, 3e-200])).toBeCloseTo(1)
  })

  it("fits linear and polynomial regression models", () => {
    const x = [0, 1, 2, 3, 4]
    const linear = fitRegression(
      x,
      x.map((value) => 2 + 3 * value),
      "linear"
    )
    const quadratic = fitRegression(
      x,
      x.map((value) => 1 + 2 * value + 4 * value ** 2),
      "quadratic"
    )
    const cubic = fitRegression(
      x,
      x.map((value) => 1 - 2 * value + 3 * value ** 2 - 4 * value ** 3),
      "cubic"
    )

    expect(linear.ok).toBe(true)
    expect(linear.r2).toBeCloseTo(1)
    expect(linear.predict(8)).toBeCloseTo(26)
    expect(quadratic.ok).toBe(true)
    expect(quadratic.predict(5)).toBeCloseTo(111)
    expect(cubic.ok).toBe(true)
    expect(cubic.predict(5)).toBeCloseTo(-434)
  })

  it("fits translated and extreme-scale polynomial data without overflow", () => {
    const translatedX = [1e12, 1e12 + 1, 1e12 + 2, 1e12 + 3]
    const translated = fitRegression(translatedX, [3, 5, 7, 9], "linear")
    const scaledLinear = fitRegression([1e200, 2e200, 3e200, 4e200], [2, 4, 6, 8], "linear")
    const scaledQuadratic = fitRegression([1e100, 2e100, 3e100, 4e100], [1, 4, 9, 16], "quadratic")
    const minimum = Number.MIN_VALUE
    const subnormal = fitRegression(
      [minimum, 2 * minimum, 3 * minimum, 4 * minimum],
      [minimum, 2 * minimum, 3 * minimum, 4 * minimum],
      "linear"
    )

    expect(translated.ok).toBe(true)
    expect(translated.predict(1e12 + 4)).toBeCloseTo(11)
    expect(translated.r2).toBeCloseTo(1)
    expect(scaledLinear.ok).toBe(true)
    expect(scaledLinear.predict(5e200)).toBeCloseTo(10)
    expect(scaledLinear.r2).toBeCloseTo(1)
    expect(scaledQuadratic.ok).toBe(true)
    expect(scaledQuadratic.predict(5e100)).toBeCloseTo(25)
    expect(scaledQuadratic.r2).toBeCloseTo(1)
    expect(subnormal.ok).toBe(true)
    expect(subnormal.predict(4 * minimum)).toBe(4 * minimum)
  })

  it("fits transformed models and rejects invalid data", () => {
    const exponential = fitRegression([0, 1, 2, 3], [2, 4, 8, 16], "exponential")
    const logarithmic = fitRegression(
      [1, Math.E, Math.E ** 2, Math.E ** 3],
      [2, 5, 8, 11],
      "logarithmic"
    )
    const power = fitRegression([1, 2, 3, 4], [3, 12, 27, 48], "power")
    const invalid = fitRegression([1], [2], "linear")

    expect(exponential.ok).toBe(true)
    expect(exponential.predict(4)).toBeCloseTo(32)
    expect(logarithmic.ok).toBe(true)
    expect(logarithmic.predict(Math.E ** 4)).toBeCloseTo(14)
    expect(power.ok).toBe(true)
    expect(power.predict(5)).toBeCloseTo(75)
    expect(invalid.ok).toBe(false)
    expect(invalid.predict(10)).toBeNaN()
    const constant = fitRegression([1, 2, 3], [4, 4, 4], "linear")
    expect(constant.ok).toBe(true)
    expect(constant.r2).toBe(1)
  })

  it("does not silently discard invalid or unpaired regression values", () => {
    expect(fitRegression([1, 2], [3], "linear").ok).toBe(false)
    expect(fitRegression([1, 2], [2, -1], "exponential").ok).toBe(false)
    expect(fitRegression([1, 0], [2, 3], "logarithmic").ok).toBe(false)
    expect(fitRegression([1, 2], [2, Number.NaN], "power").ok).toBe(false)
    expect(fitRegression([1, 2], [0, 2], "power").ok).toBe(false)
    expect(fitRegression([1, 1], [2, 3], "linear").ok).toBe(false)
    expect(fitRegression([1, 1], [2, 4], "exponential").ok).toBe(false)
    expect(fitRegression([1, 1], [2, 3], "logarithmic").ok).toBe(false)
    expect(fitRegression([1, 1], [2, 3], "power").ok).toBe(false)
    expect(fitRegression([0, 0], [2, 3], "linear").ok).toBe(false)
    expect(fitRegression([0, 1, 1], [1, 2, 3], "quadratic").ok).toBe(false)
    expect(fitRegression([0, 1], [Number.MIN_VALUE, Number.MAX_VALUE], "exponential").ok).toBe(
      false
    )
    expect(fitRegression([1, 2], [2, 3], "quadratic").message).toMatch(/at least 3 points/i)
    expect(fitRegression([1, 2, 3], [2, 3, 4], "cubic").message).toMatch(/at least 4 points/i)
  })
})
