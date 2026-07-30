import { describe, expect, it } from "vitest"

import {
  CalculatorEngine,
  evaluateExpression,
  factorial,
} from "@/lib/calculator-engine"

describe("CalculatorEngine", () => {
  it("evaluates arithmetic, unicode operators, and implicit multiplication", () => {
    const engine = new CalculatorEngine()

    expect(engine.evaluate("2 + 3 × 4")).toBe(14)
    expect(engine.evaluate("2(3+4)")).toBe(14)
    expect(engine.evaluate("√(81) + ∛(27)")).toBe(12)
    expect(engine.evaluate("−3^2")).toBe(-9)
  })

  it("supports degrees and radians", () => {
    const degrees = new CalculatorEngine({ angleMode: "degrees" })
    const radians = new CalculatorEngine({ angleMode: "radians" })

    expect(degrees.evaluate("sin(30)")).toBeCloseTo(0.5)
    expect(degrees.evaluate("cos(60)")).toBeCloseTo(0.5)
    expect(radians.evaluate("sin(π÷2)")).toBeCloseTo(1)
  })

  it("supports combinatorics, logarithms, and list statistics", () => {
    const engine = new CalculatorEngine()

    expect(engine.evaluate("10ncr3")).toBe(120)
    expect(engine.evaluate("npr(10,3)")).toBe(720)
    expect(engine.evaluate("logb(2,32)")).toBe(5)
    expect(engine.evaluate("mean([2,4,6,8])")).toBe(5)
    expect(engine.evaluate("stdevp([2,4,6,8])")).toBeCloseTo(
      Math.sqrt(5),
    )
  })

  it("evaluates reusable variables and functions", () => {
    const engine = new CalculatorEngine({
      definitions: ["a = 3", "f(x) = ax² + 2"],
    })

    expect(engine.evaluate("f(4)")).toBe(50)
    expect(engine.evaluate("{x<0:−1,x>0:1,0}", { x: -4 })).toBe(-1)
    expect(engine.evaluate("{x<0:−1,x>0:1,0}", { x: 0 })).toBe(0)
  })

  it("uses the previous answer and reports invalid domains", () => {
    const engine = new CalculatorEngine({ ans: 12 })

    expect(engine.evaluate("Ans÷3")).toBe(4)
    expect(() => engine.evaluate("1÷0")).toThrow(/division by zero/i)
    expect(() => engine.evaluate("√(−1)")).toThrow(/real number/i)
    expect(() => factorial(2.5)).toThrow(/whole number/i)
  })

  it("formats values and creates exact fractions", () => {
    const engine = new CalculatorEngine()

    expect(engine.toFraction(5 / 6)).toBe("5/6")
    expect(
      engine.format(12345.678, {
        decimals: 2,
        thousandsSeparator: true,
      }),
    ).toBe("12,345.68")
    expect(
      engine.format(1200, {
        notation: "scientific",
        significantFigures: 4,
      }),
    ).toBe("1.2 × 10^3")
  })

  it("exposes a one-shot evaluate helper", () => {
    expect(evaluateExpression("gcd(24,18)")).toBe(6)
  })
})
