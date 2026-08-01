import { describe, expect, it } from "vitest"

import {
  CalculatorEngine,
  completeExpression,
  evaluateExpression,
  factorial,
  formatExpressionInput,
} from "../calculator-engine"

describe("CalculatorEngine", () => {
  it("evaluates arithmetic, unicode operators, and implicit multiplication", () => {
    const engine = new CalculatorEngine()

    expect(engine.evaluate("2 + 3 × 4")).toBe(14)
    expect(engine.evaluate("6 x abs(6)")).toBe(36)
    expect(engine.evaluate("2(3+4)")).toBe(14)
    expect(engine.evaluate("√(81) + ∛(27)")).toBe(12)
    expect(engine.evaluate("−3^2")).toBe(-9)
  })

  it("completes omitted closing parentheses at an explicit evaluation boundary", () => {
    const engine = new CalculatorEngine()

    expect(completeExpression("sqrt(2")).toBe("sqrt(2)")
    expect(completeExpression("2×(3+(4")).toBe("2×(3+(4))")
    expect(completeExpression("2+3)")).toBe("2+3)")
    expect(completeExpression("")).toBe("")
    expect(completeExpression("((1)+2")).toBe("((1)+2)")
    expect(completeExpression("(1))+(")).toBe("(1))+(")
    expect(engine.evaluate(completeExpression("sqrt(2"))).toBeCloseTo(Math.SQRT2)
  })

  it("formats keyboard aliases as calculator notation without changing their value", () => {
    const engine = new CalculatorEngine()

    expect(formatExpressionInput("x^2")).toBe("x²")
    expect(formatExpressionInput("sqrt(2^10*pi-1")).toBe("√(2¹⁰×π−1")
    expect(formatExpressionInput("cbrt(8)>=2")).toBe("∛(8)≥2")
    expect(formatExpressionInput("2²3")).toBe("2²³")
    expect(formatExpressionInput("x^−2")).toBe("x⁻²")
    expect(formatExpressionInput("x^-12")).toBe("x⁻¹²")
    expect(formatExpressionInput("x^001")).toBe("x⁰⁰¹")
    expect(formatExpressionInput("x¹²34")).toBe("x¹²³⁴")
    expect(formatExpressionInput("x^2.5")).toBe("x^2.5")
    expect(formatExpressionInput("x².")).toBe("x^2.")
    expect(formatExpressionInput("x⁻².")).toBe("x^−2.")
    expect(formatExpressionInput("SqRt(4)+CBRT(8)+PI")).toBe("√(4)+∛(8)+π")
    expect(formatExpressionInput("1<=2 != 3>=2")).toBe("1≤2 ≠ 3≥2")
    expect(formatExpressionInput("2*3/4-5")).toBe("2×3÷4−5")
    const formatted = formatExpressionInput("sqrt(2^10*pi-1")
    expect(formatExpressionInput(formatted)).toBe(formatted)
    expect(engine.evaluate(formatExpressionInput("2^10"))).toBe(1024)
    expect(engine.evaluate(formatExpressionInput("2^-3"))).toBe(0.125)
    expect(engine.evaluate(completeExpression(formatExpressionInput("sqrt(9")))).toBe(3)
  })

  it("supports degrees and radians", () => {
    const degrees = new CalculatorEngine({ angleMode: "degrees" })
    const radians = new CalculatorEngine({ angleMode: "radians" })

    expect(degrees.evaluate("sin(30)")).toBeCloseTo(0.5)
    expect(degrees.evaluate("cos(60)")).toBeCloseTo(0.5)
    expect(radians.evaluate("sin(π÷2)")).toBeCloseTo(1)
    expect(radians.evaluate("asin(1)")).toBeCloseTo(Math.PI / 2)
  })

  it("supports combinatorics, logarithms, and list statistics", () => {
    const engine = new CalculatorEngine()

    expect(engine.evaluate("10ncr3")).toBe(120)
    expect(engine.evaluate("npr(10,3)")).toBe(720)
    expect(engine.evaluate("logb(2,32)")).toBe(5)
    expect(engine.evaluate("mean([2,4,6,8])")).toBe(5)
    expect(engine.evaluate("stdevp([2,4,6,8])")).toBeCloseTo(Math.sqrt(5))
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
      })
    ).toBe("12,345.68")
    expect(
      engine.format(1200, {
        notation: "scientific",
        significantFigures: 4,
      })
    ).toBe("1.2 × 10^3")
    expect(engine.format(true)).toBe("true")
    expect(engine.format(false)).toBe("false")
    expect(engine.format([1, 2, 3])).toBe("[1, 2, 3]")
    expect(engine.format(Array.from({ length: 13 }, (_, index) => index))).toMatch(/, …\]$/)
    expect(engine.format(Number.NaN)).toBe("—")
    expect(engine.format(0)).toBe("0")
    expect(engine.format(1234.5, { thousandsSeparator: false })).toBe("1234.5")
    expect(engine.toFraction(4)).toBe("4")
    expect(engine.toFraction(-0.5)).toBe("-1/2")
    expect(engine.toFraction(Number.NaN)).toBeNull()
    expect(engine.toFraction(Math.PI, 10)).toBeNull()
  })

  it("rounds decimal ties consistently away from zero", () => {
    expect(evaluateExpression("round(1.005,2)")).toBe(1.01)
    expect(evaluateExpression("round(2.675,2)")).toBe(2.68)
    expect(evaluateExpression("round(−1.005,2)")).toBe(-1.01)
    expect(evaluateExpression("round(−1.5)")).toBe(-2)
  })

  it("stays numerically stable for cancellation and extreme finite values", () => {
    expect(evaluateExpression("sum([10000000000000000,1,−10000000000000000])")).toBe(1)
    expect(evaluateExpression("mean([1e308,1e308])")).toBe(1e308)
    expect(evaluateExpression("median([−1e308,1e308])")).toBe(0)
    expect(evaluateExpression("quantile([−1e308,1e308],0.5)")).toBe(0)
  })

  it("reduces huge angles before evaluating trigonometric functions", () => {
    const engine = new CalculatorEngine({ angleMode: "degrees" })

    expect(engine.evaluate("sin(1e16)")).toBeCloseTo(engine.evaluate("sin(280)") as number, 12)
    expect(engine.evaluate("cos(−1e16)")).toBeCloseTo(engine.evaluate("cos(−280)") as number, 12)
  })

  it("preserves tiny valid trigonometric values near singularities", () => {
    const degrees = new CalculatorEngine({ angleMode: "degrees" })
    const radians = new CalculatorEngine({ angleMode: "radians" })

    expect(degrees.evaluate("sin(1e−14)")).toBeCloseTo((1e-14 * Math.PI) / 180, 28)
    expect(degrees.evaluate("csc(1e−14)")).toBeCloseTo(1 / Math.sin((1e-14 * Math.PI) / 180), 0)
    expect(radians.evaluate("tan(π÷2+1e−12)")).toBeCloseTo(Math.tan(Math.PI / 2 + 1e-12), 0)
    expect(radians.evaluate("csc(1e−20)")).toBeCloseTo(1e20, -5)
  })

  it("uses scale-aware equality without treating tiny nonzero values as zero", () => {
    expect(evaluateExpression("0.1+0.2=0.3")).toBe(true)
    expect(evaluateExpression("0=1e−13")).toBe(false)
    expect(evaluateExpression("1e12=1000000000000.01")).toBe(false)
    expect(evaluateExpression("1e12≠1000000000000.01")).toBe(true)
  })

  it("rejects oversized and excessively complex expressions safely", () => {
    expect(() => evaluateExpression(`${"1+".repeat(2050)}1`)).toThrow(/too long/i)
    expect(() => evaluateExpression(`${"1+".repeat(300)}1`)).toThrow(/too complex/i)
    expect(() => evaluateExpression(`${"(".repeat(300)}1${")".repeat(300)}`)).toThrow(
      /too complex/i
    )
  })

  it("bounds cached expressions and rejects unsafe runtime configuration", () => {
    const engine = new CalculatorEngine()
    for (let value = 1; value <= 300; value += 1) {
      engine.evaluate(`${value}+1`)
    }
    const cache = (engine as unknown as { astCache: Map<string, unknown> }).astCache

    expect(cache.size).toBeLessThanOrEqual(256)
    expect(() => engine.setAns(Number.NaN)).toThrow(/finite/i)
    expect(() => engine.setVariables({ x: Number.POSITIVE_INFINITY })).toThrow(/finite/i)
    expect(() => engine.setAngleMode("gradians" as "degrees")).toThrow(/angle mode/i)
    expect(() => engine.setVariables({ speed: 1 })).toThrow(/single letters/i)
    expect(() => engine.evaluate("x", { speed: 1 })).toThrow(/single letters/i)
    expect(() =>
      engine.setVariables(
        Object.fromEntries(Array.from({ length: 129 }, (_, index) => [`v${index}`, index]))
      )
    ).toThrow(/too many/i)
    expect(
      () =>
        new CalculatorEngine({
          definitions: Array.from({ length: 129 }, (_, index) => `a=${index}`),
        })
    ).toThrow(/too many definitions/i)
    expect(() => engine.setDefinitions([`a=${"1".repeat(4097)}`])).toThrow(/too long/i)
  })

  it("exposes a one-shot evaluate helper", () => {
    expect(evaluateExpression("gcd(24,18)")).toBe(6)
  })

  it.each([
    ["2 + 3 × 4", 14],
    ["(2 + 3) × 4", 20],
    ["−3^2", -9],
    ["(−3)^2", 9],
    ["2^3^2", 512],
    ["2^3!", 64],
    ["2!^3", 8],
    ["5!", 120],
    ["200 × 10%", 20],
    ["1e3 + 2.5e−2", 1000.025],
    [".5 + .25", 0.75],
  ])("follows operator precedence for %s", (expression, expected) => {
    expect(evaluateExpression(expression)).toBeCloseTo(expected)
  })

  it.each([
    ["|−6|", 6],
    ["6|6|", 36],
    ["6 × |−6|", 36],
    ["|2||3|", 6],
    ["2|3|4", 24],
    ["||−4||", 4],
    ["|2−5|", 3],
  ])("evaluates absolute-value expression %s", (expression, expected) => {
    expect(evaluateExpression(expression)).toBe(expected)
  })

  it.each([
    ["sin(30)", 0.5],
    ["cos(60)", 0.5],
    ["tan(45)", 1],
    ["sec(60)", 2],
    ["csc(30)", 2],
    ["cot(45)", 1],
    ["asin(0.5)", 30],
    ["acos(0.5)", 60],
    ["atan(1)", 45],
    ["asec(2)", 60],
    ["acsc(2)", 30],
    ["acot(1)", 45],
    ["arcsin(0.5)", 30],
    ["arccos(0.5)", 60],
    ["arctan(1)", 45],
    ["arcsec(2)", 60],
    ["arccsc(2)", 30],
    ["arccot(1)", 45],
    ["sinh(0)", 0],
    ["cosh(0)", 1],
    ["tanh(0)", 0],
    ["sqrt(81)", 9],
    ["cbrt(−27)", -3],
    ["nthroot(3,−8)", -2],
    ["nthroot(−3,8)", 0.5],
    ["log(1000)", 3],
    ["ln(e)", 1],
    ["logb(2,32)", 5],
    ["exp(0)", 1],
    ["abs(−12)", 12],
    ["floor(2.9)", 2],
    ["ceil(2.1)", 3],
    ["round(12.345,2)", 12.35],
    ["round(1234,−2)", 1200],
    ["sign(−9)", -1],
    ["gcd(54,24)", 6],
    ["lcm(12,18)", 36],
    ["lcm(0,18)", 0],
    ["mod(−7,4)", 1],
    ["ncr(52,5)", 2598960],
    ["npr(10,3)", 720],
  ])("evaluates mathematical function %s", (expression, expected) => {
    expect(evaluateExpression(expression)).toBeCloseTo(expected, 10)
  })

  it("supports implicit multiplication around constants and functions", () => {
    const engine = new CalculatorEngine({ ans: 5 })

    expect(engine.evaluate("2π")).toBeCloseTo(2 * Math.PI)
    expect(engine.evaluate("2 x + 1", { x: 3 })).toBe(7)
    expect(engine.evaluate("(2)(3)")).toBe(6)
    expect(engine.evaluate("3√(9)")).toBe(9)
    expect(engine.evaluate("2Ans")).toBe(10)
  })

  it("evaluates list arithmetic and the complete statistics function set", () => {
    const engine = new CalculatorEngine()

    expect(engine.evaluate("[1,2,3]+2")).toEqual([3, 4, 5])
    expect(engine.evaluate("[1,2]×[3,4]")).toEqual([3, 8])
    expect(engine.evaluate("count([1,2,3])")).toBe(3)
    expect(engine.evaluate("length([1,2,3])")).toBe(3)
    expect(engine.evaluate("total([1,2,3])")).toBe(6)
    expect(engine.evaluate("sum([1,2,3])")).toBe(6)
    expect(engine.evaluate("mean([1,2,3])")).toBe(2)
    expect(engine.evaluate("median([1,4,2,3])")).toBe(2.5)
    expect(engine.evaluate("mode([1,2,2,3])")).toBe(2)
    expect(engine.evaluate("min([1,−2,3])")).toBe(-2)
    expect(engine.evaluate("max([1,−2,3])")).toBe(3)
    expect(engine.evaluate("range([1,4,9])")).toBe(8)
    expect(engine.evaluate("quartile([0,10,20,30,40],1)")).toBe(10)
    expect(engine.evaluate("quartile([0,10,20,30,40],3)")).toBe(30)
    expect(engine.evaluate("quantile([0,10,20,30,40],0.5)")).toBe(20)
    expect(engine.evaluate("iqr([0,10,20,30,40])")).toBe(20)
    expect(engine.evaluate("var([1,2,3])")).toBe(1)
    expect(engine.evaluate("varp([1,2,3])")).toBeCloseTo(2 / 3)
    expect(engine.evaluate("stdev([1,2,3])")).toBe(1)
    expect(engine.evaluate("stdevp([1,2,3])")).toBeCloseTo(Math.sqrt(2 / 3))
    expect(engine.evaluate("sort([3,1,2])")).toEqual([1, 2, 3])
    expect(engine.evaluate("corr([1,2,3],[2,4,6])")).toBeCloseTo(1)
    expect(engine.evaluate("cov([1,2,3],[2,4,6])")).toBeCloseTo(2)
    expect(engine.evaluate("abs([−1,2,−3])")).toEqual([1, 2, 3])
    expect(engine.evaluate("logb([2,10],[8,100])")).toEqual([3, 2])
  })

  it("rejects invalid scalar and list combinations", () => {
    expect(() => evaluateExpression("sin(1<2)")).toThrow(/numeric value/i)
    expect(() => evaluateExpression("[1,2]<[2,3]")).toThrow(/boolean list/i)
    expect(() => evaluateExpression("abs([1,infinity])")).toThrow(/finite|numeric range/i)
    expect(() => evaluateExpression("logb([2,3],[8])")).toThrow(/same length/i)
    expect(() => evaluateExpression("corr(1,2)")).toThrow(/two lists/i)
    expect(() => evaluateExpression("quantile(1,0.5)")).toThrow(/list and a percentile/i)
    expect(() => evaluateExpression("quantile([],0.5)")).toThrow(/not enough data/i)
    expect(() => evaluateExpression("quartile([1,2,3])")).not.toThrow()
    expect(evaluateExpression("quartile(1,2,3,4)")).toBe(1.75)
    expect(() => evaluateExpression("quartile([1,2],2,[3,4])")).toThrow(/one list/i)
    expect(() => evaluateExpression("sum([])")).toThrow(/not enough data/i)
  })

  it("uses definition caches and ignores malformed definitions", () => {
    const engine = new CalculatorEngine({
      definitions: ["ignored", "a = 5", "also ignored = 9"],
      variables: { x: 2 },
    })

    expect(engine.evaluate("a+a+x")).toBe(12)
    expect(engine.evaluate("pi")).toBeCloseTo(Math.PI)
  })

  it("supports comparisons, piecewise expressions, and exact function arity", () => {
    const engine = new CalculatorEngine({
      definitions: ["h(x,y) = x² + y", "a = 4", "b = a + 2"],
    })

    expect(engine.evaluate("2≤3")).toBe(true)
    expect(engine.evaluate("2≠3")).toBe(true)
    expect(engine.evaluate("h(3,4)")).toBe(13)
    expect(engine.evaluate("2b")).toBe(12)
    expect(engine.evaluate("{x<0:−1,x=0:0,1}", { x: 5 })).toBe(1)
    expect(() => engine.evaluate("h(3)")).toThrow(/needs 2 values/i)
  })

  it.each([
    ["", /enter an expression/i],
    ["2+", /incomplete/i],
    ["(2+3", /closing parenthesis/i],
    ["2+3)", /unexpected symbol/i],
    ["|3", /closing absolute-value bar/i],
    ["3|", /incomplete|closing absolute-value bar/i],
    ["[1,2", /closing bracket/i],
    ["1..2", /invalid number/i],
    ["2**3", /unexpected symbol/i],
    ["5!!", /repeated factorial/i],
    ["50%%", /repeated percent/i],
    ["sqrt()", /needs 1 value/i],
    ["sin(infinity)", /finite|numeric range/i],
    ["sin(1,2)", /needs 1 value/i],
    ["round(1,2,3)", /needs 1 or 2 values/i],
    ["round(1,1.5)", /precision must be a whole number/i],
    ["round(1,101)", /−100 to 100/i],
    ["1÷0", /division by zero/i],
    ["mod(5,0)", /modulo by zero/i],
    ["0^0", /zero to the zero power/i],
    ["0^−1", /zero to a negative power/i],
    ["(−2)^0.5", /not a real number/i],
    ["sqrt(−1)", /not a real number/i],
    ["nthroot(2,−4)", /not a real number/i],
    ["nthroot(0,4)", /degree cannot be zero/i],
    ["log(0)", /positive value/i],
    ["ln(0)", /positive value/i],
    ["logb(1,10)", /base or value/i],
    ["tan(90)", /tangent is not defined/i],
    ["sec(90)", /secant is not defined/i],
    ["csc(0)", /cosecant is not defined/i],
    ["cot(0)", /cotangent is not defined/i],
    ["asin(2)", /not a real number/i],
    ["acos(2)", /not a real number/i],
    ["asec(0.5)", /not a real number/i],
    ["acsc(0.5)", /not a real number/i],
    ["(−1)!", /non-negative whole number/i],
    ["2.5!", /non-negative whole number/i],
    ["171!", /too large/i],
    ["gcd(2.5,5)", /whole numbers/i],
    ["lcm(2.5,5)", /whole numbers/i],
    ["ncr(5,6)", /0 ≤ r ≤ n/i],
    ["npr(5,−1)", /0 ≤ r ≤ n/i],
    ["[1,2]+[1]", /same length/i],
    ["corr([1,2],[1])", /same length/i],
    ["corr([1,1],[2,3])", /constant list/i],
    ["quantile([1,2,3],1.1)", /between 0 and 1/i],
    ["quartile([1,2,3],5)", /0 to 4/i],
    ["stdev([1])", /at least two values/i],
    ["var([1])", /at least two values/i],
    ["mode([1,2,3])", /no mode/i],
    ["mode([1,1,2,2])", /no mode/i],
    ["sum([1],1<2)", /numeric values/i],
    ["{1<0:2}", /no piecewise condition/i],
    ["range([−1e308,1e308])", /numeric range/i],
    ["10^1000", /numeric range/i],
    ["exp(1000)", /numeric range/i],
    ["unknown", /unknown variable/i],
    ["2@", /unexpected character/i],
  ])("rejects invalid or undefined expression %s", (expression, message) => {
    expect(() => evaluateExpression(expression)).toThrow(message)
  })

  it("rejects circular definitions", () => {
    const engine = new CalculatorEngine({
      definitions: ["a = b + 1", "b = a + 1"],
    })

    expect(() => engine.evaluate("a")).toThrow(/circular definition/i)
  })
})
