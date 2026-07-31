import { describe, expect, it } from "vitest"

import {
  calculateStatistics,
  correlation,
  covariance,
  fitRegression,
  parseNumberList,
  quantile,
} from "@/lib/statistics"

describe("statistics utilities", () => {
  it("parses flexible list input", () => {
    expect(parseNumberList("1, 2\n3; invalid 4")).toEqual([1, 2, 3, 4])
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
    expect(() => calculateStatistics([1, Number.NaN])).toThrow(/finite/i)
    expect(() => quantile([1, 2, 3], -0.1)).toThrow(/between 0 and 1/i)
    expect(() => covariance([1, 2], [1])).toThrow(/same length/i)
    expect(() => correlation([1, 1], [2, 3])).toThrow(/constant/i)
  })

  it("fits linear and polynomial regression models", () => {
    const x = [0, 1, 2, 3, 4]
    const linear = fitRegression(
      x,
      x.map((value) => 2 + 3 * value),
      "linear",
    )
    const quadratic = fitRegression(
      x,
      x.map((value) => 1 + 2 * value + 4 * value ** 2),
      "quadratic",
    )

    expect(linear.ok).toBe(true)
    expect(linear.r2).toBeCloseTo(1)
    expect(linear.predict(8)).toBeCloseTo(26)
    expect(quadratic.ok).toBe(true)
    expect(quadratic.predict(5)).toBeCloseTo(111)
  })

  it("fits transformed models and rejects invalid data", () => {
    const exponential = fitRegression(
      [0, 1, 2, 3],
      [2, 4, 8, 16],
      "exponential",
    )
    const invalid = fitRegression([1], [2], "linear")

    expect(exponential.ok).toBe(true)
    expect(exponential.predict(4)).toBeCloseTo(32)
    expect(invalid.ok).toBe(false)
  })

  it("does not silently discard invalid or unpaired regression values", () => {
    expect(fitRegression([1, 2], [3], "linear").ok).toBe(false)
    expect(fitRegression([1, 2], [2, -1], "exponential").ok).toBe(false)
    expect(fitRegression([1, 0], [2, 3], "logarithmic").ok).toBe(false)
    expect(fitRegression([1, 2], [2, Number.NaN], "power").ok).toBe(false)
  })
})
