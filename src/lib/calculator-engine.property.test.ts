import fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  CalculatorEngine,
  evaluateExpression,
  factorial,
  greatestCommonDivisor,
} from "@/lib/calculator-engine"

const finiteNumber = fc.double({
  min: -1_000_000,
  max: 1_000_000,
  noNaN: true,
  noDefaultInfinity: true,
})

function expectRelativelyClose(
  actual: number,
  expected: number,
  tolerance = 1e-10,
) {
  expect(Number.isFinite(actual)).toBe(true)
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance * Math.max(1, Math.abs(expected)),
  )
}

function referenceGcd(left: number, right: number) {
  let a = Math.abs(left)
  let b = Math.abs(right)
  while (b !== 0) {
    ;[a, b] = [b, a % b]
  }
  return a
}

describe("CalculatorEngine property checks", () => {
  it("matches reference arithmetic across generated finite values", () => {
    fc.assert(
      fc.property(
        finiteNumber,
        finiteNumber.filter((value) => Math.abs(value) > 1e-9),
        (left, right) => {
          const sum = evaluateExpression(`(${left})+(${right})`) as number
          const difference = evaluateExpression(
            `(${left})−(${right})`,
          ) as number
          const product = evaluateExpression(`(${left})×(${right})`) as number
          const quotient = evaluateExpression(`(${left})÷(${right})`) as number

          expectRelativelyClose(sum, left + right)
          expectRelativelyClose(difference, left - right)
          expectRelativelyClose(product, left * right)
          expectRelativelyClose(quotient, left / right)
        },
      ),
      { numRuns: 500, seed: 20_260_731 },
    )
  })

  it("preserves absolute-value and square-root invariants", () => {
    fc.assert(
      fc.property(finiteNumber, (value) => {
        expect(evaluateExpression(`|${value}|`)).toBe(Math.abs(value))
        expectRelativelyClose(
          evaluateExpression(`sqrt((${value})²)`) as number,
          Math.abs(value),
        )
      }),
      { numRuns: 500, seed: 20_260_732 },
    )
  })

  it("preserves trigonometric identities for very large degree angles", () => {
    const engine = new CalculatorEngine({ angleMode: "degrees" })
    fc.assert(
      fc.property(
        fc.double({
          min: -1e16,
          max: 1e16,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (angle) => {
          const sine = engine.evaluate(`sin(${angle})`) as number
          const cosine = engine.evaluate(`cos(${angle})`) as number
          expectRelativelyClose(sine ** 2 + cosine ** 2, 1, 2e-12)
        },
      ),
      { numRuns: 500, seed: 20_260_733 },
    )
  })

  it("matches an independent Euclidean GCD implementation", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        (left, right) => {
          expect(greatestCommonDivisor(left, right)).toBe(
            referenceGcd(left, right),
          )
        },
      ),
      { numRuns: 1_000, seed: 20_260_734 },
    )
  })

  it("preserves nCr symmetry for generated valid inputs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 60 }),
        fc.integer({ min: 0, max: 60 }),
        (n, candidate) => {
          const r = candidate % (n + 1)
          expect(evaluateExpression(`ncr(${n},${r})`)).toBe(
            evaluateExpression(`ncr(${n},${n - r})`),
          )
        },
      ),
      { numRuns: 500, seed: 20_260_735 },
    )
  })

  it("preserves factorial and combinatoric identities", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        (n, candidate) => {
          const r = candidate % (n + 1)
          expectRelativelyClose(
            factorial(r) *
              (evaluateExpression(`ncr(${n},${r})`) as number),
            evaluateExpression(`npr(${n},${r})`) as number,
            2e-12,
          )
          if (r < 30) {
            expect(factorial(r + 1)).toBe((r + 1) * factorial(r))
          }
        },
      ),
      { numRuns: 500, seed: 20_260_737 },
    )
  })

  it("preserves logarithm, exponential, and root identities", () => {
    fc.assert(
      fc.property(
        fc.double({
          min: -300,
          max: 300,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (value) => {
          expectRelativelyClose(
            evaluateExpression(`ln(exp(${value}))`) as number,
            value,
            2e-12,
          )
          expectRelativelyClose(
            evaluateExpression(`cbrt((${value})³)`) as number,
            value,
            2e-12,
          )
        },
      ),
      { numRuns: 500, seed: 20_260_738 },
    )
  })

  it("keeps inverse trigonometric functions consistent in both angle modes", () => {
    fc.assert(
      fc.property(
        fc.double({
          min: -1,
          max: 1,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (value) => {
          const degrees = new CalculatorEngine({ angleMode: "degrees" })
          const radians = new CalculatorEngine({ angleMode: "radians" })
          expectRelativelyClose(
            degrees.evaluate(`sin(asin(${value}))`) as number,
            value,
            2e-12,
          )
          expectRelativelyClose(
            radians.evaluate(`cos(acos(${value}))`) as number,
            value,
            2e-12,
          )
        },
      ),
      { numRuns: 500, seed: 20_260_739 },
    )
  })

  it("keeps Euclidean modulo in range and reconstructs integer dividends", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        fc.integer({ min: 1, max: 10_000 }),
        (dividend, divisor) => {
          const remainder = evaluateExpression(
            `mod(${dividend},${divisor})`,
          ) as number
          expect(remainder).toBeGreaterThanOrEqual(0)
          expect(remainder).toBeLessThan(divisor)
          expect(Number.isInteger((dividend - remainder) / divisor)).toBe(true)
        },
      ),
      { numRuns: 1_000, seed: 20_260_740 },
    )
  })

  it("makes decimal rounding idempotent across generated precisions", () => {
    fc.assert(
      fc.property(
        finiteNumber,
        fc.integer({ min: -6, max: 6 }),
        (value, precision) => {
          const once = evaluateExpression(
            `round(${value},${precision})`,
          ) as number
          const twice = evaluateExpression(
            `round(${once},${precision})`,
          ) as number
          expect(twice).toBe(once)
        },
      ),
      { numRuns: 1_000, seed: 20_260_741 },
    )
  })

  it("terminates safely for generated malformed and unusual Unicode input", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (source) => {
        try {
          evaluateExpression(source)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      }),
      { numRuns: 2_000, seed: 20_260_736 },
    )
  })
})
