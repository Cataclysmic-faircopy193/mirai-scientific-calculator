import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { calculateStatistics, correlation, fitRegression, quantile } from "../statistics"

describe("statistics property checks", () => {
  it("fits generated translated linear models", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        fc.integer({ min: -1_000, max: 1_000 }).filter((value) => value !== 0),
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        (offset, slope, intercept) => {
          const xValues = [-2, -1, 0, 1, 2].map((delta) => offset + delta)
          const yValues = [-2, -1, 0, 1, 2].map((delta) => intercept + slope * delta)
          const fit = fitRegression(xValues, yValues, "linear")

          expect(fit.ok).toBe(true)
          expect(fit.predict(offset + 3)).toBeCloseTo(intercept + 3 * slope, 7)
          expect(fit.r2).toBeCloseTo(1, 10)
        }
      ),
      { numRuns: 500, seed: 20_260_742 }
    )
  })

  it("fits generated quadratic models across very large and small scales", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 100 }), (exponent) => {
        const scale = 10 ** exponent
        const xValues = [1, 2, 3, 4, 5].map((value) => value * scale)
        const yValues = [1, 4, 9, 16, 25]
        const fit = fitRegression(xValues, yValues, "quadratic")

        expect(fit.ok).toBe(true)
        expect(fit.predict(6 * scale)).toBeCloseTo(36, 7)
        expect(fit.r2).toBeCloseTo(1, 10)
      }),
      { numRuns: 300, seed: 20_260_743 }
    )
  })

  it("keeps quantiles ordered and means inside generated finite samples", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.double({
            min: -1e200,
            max: 1e200,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (values) => {
          const result = calculateStatistics(values)
          expect(result.mean).toBeGreaterThanOrEqual(result.min)
          expect(result.mean).toBeLessThanOrEqual(result.max)
          expect(quantile(result.sorted, 0.25)).toBeLessThanOrEqual(quantile(result.sorted, 0.5))
          expect(quantile(result.sorted, 0.5)).toBeLessThanOrEqual(quantile(result.sorted, 0.75))
          expect(result.populationStandardDeviation).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 500, seed: 20_260_744 }
    )
  })

  it("preserves correlation under positive affine scaling", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.integer({ min: -1_000_000, max: 1_000_000 }), { minLength: 3, maxLength: 50 })
          .filter((values) => new Set(values).size > 1),
        fc.integer({ min: 1, max: 1_000 }),
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        (values, scale, offset) => {
          const transformed = values.map((value) => value * scale + offset)
          expect(correlation(values, transformed)).toBeCloseTo(1, 10)
        }
      ),
      { numRuns: 500, seed: 20_260_745 }
    )
  })
})
