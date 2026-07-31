import { describe, expect, it } from "vitest"

import { CalculatorEngine } from "../calculator-engine"
import { compileGraphExpression, findExtrema, findIntersections, findRoots } from "../graphing"

describe("graphing utilities", () => {
  const engine = new CalculatorEngine({ variables: { a: 1 } })

  it("compiles explicit, implicit, point, and variable expressions", () => {
    const explicit = compileGraphExpression("y = a x² − 5x + 6", engine)
    const implicit = compileGraphExpression("x² + y² = 25", engine)
    const points = compileGraphExpression("(2,0), (3,0)", engine)
    const variable = compileGraphExpression("b = 4", engine)

    expect(explicit.kind).toBe("explicit")
    if (explicit.kind === "explicit") expect(explicit.evaluate(2)).toBe(0)
    const spacedVariable = compileGraphExpression("y = 2 x + 1", engine)
    expect(spacedVariable.kind).toBe("explicit")
    if (spacedVariable.kind === "explicit") {
      expect(spacedVariable.evaluate(2)).toBe(5)
    }
    expect(implicit.kind).toBe("implicit")
    if (implicit.kind === "implicit") expect(implicit.residual(3, 4)).toBe(0)
    expect(points.kind).toBe("points")
    if (points.kind === "points") expect(points.points).toHaveLength(2)
    expect(variable).toMatchObject({ kind: "variable", name: "b", value: 4 })
  })

  it("finds roots, extrema, and intersections", () => {
    const roots = findRoots((x) => x ** 2 - 5 * x + 6, -2, 8)
    const extrema = findExtrema((x) => x ** 2 - 4, -5, 5)
    const intersections = findIntersections(
      (x) => x,
      (x) => 2 - x,
      -5,
      5
    )

    expect(roots).toHaveLength(2)
    expect(roots[0]).toBeCloseTo(2, 3)
    expect(roots[1]).toBeCloseTo(3, 3)
    expect(extrema.some((point) => point.kind === "minimum")).toBe(true)
    expect(intersections[0]).toMatchObject({ x: expect.closeTo(1, 3) })
    expect(intersections[0].y).toBeCloseTo(1, 3)
  })

  it("rejects discontinuities as roots and detects touching roots", () => {
    const discontinuity = findRoots((x) => 1 / x, -1, 1)
    const touching = findRoots((x) => (x - Math.SQRT2) ** 2, 0, 3)

    expect(discontinuity).toEqual([])
    expect(touching).toHaveLength(1)
    expect(touching[0]).toBeCloseTo(Math.SQRT2, 7)
  })

  it("handles extreme finite graph ranges and bounds sampling work", () => {
    const roots = findRoots((x) => x, -1e308, 1e308, 100)

    expect(roots).toContain(0)
    expect(() => findRoots((x) => x, 1, 1)).toThrow(/less than/i)
    expect(() => findRoots((x) => x, 0, 1, 0)).toThrow(/samples/i)
    expect(() => findExtrema((x) => x, 0, 1, 100_001)).toThrow(/samples/i)
  })

  it("does not accept partial point-list matches", () => {
    expect(compileGraphExpression("(2,3), garbage", engine).kind).toBe("invalid")
    expect(compileGraphExpression(`y=${"1+".repeat(2050)}1`, engine).kind).toBe("invalid")
  })
})
