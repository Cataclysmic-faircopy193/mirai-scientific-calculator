import { describe, expect, it } from "vitest"

import { CalculatorEngine } from "@/lib/calculator-engine"
import {
  compileGraphExpression,
  findExtrema,
  findIntersections,
  findRoots,
} from "@/lib/graphing"

describe("graphing utilities", () => {
  const engine = new CalculatorEngine({ variables: { a: 1 } })

  it("compiles explicit, implicit, point, and variable expressions", () => {
    const explicit = compileGraphExpression("y = a x² − 5x + 6", engine)
    const implicit = compileGraphExpression("x² + y² = 25", engine)
    const points = compileGraphExpression("(2,0), (3,0)", engine)
    const variable = compileGraphExpression("b = 4", engine)

    expect(explicit.kind).toBe("explicit")
    if (explicit.kind === "explicit") expect(explicit.evaluate(2)).toBe(0)
    expect(implicit.kind).toBe("implicit")
    if (implicit.kind === "implicit") expect(implicit.residual(3, 4)).toBe(0)
    expect(points.kind).toBe("points")
    if (points.kind === "points") expect(points.points).toHaveLength(2)
    expect(variable).toMatchObject({ kind: "variable", name: "b", value: 4 })
  })

  it("finds roots, extrema, and intersections", () => {
    const roots = findRoots((x) => x ** 2 - 5 * x + 6, -2, 8)
    const extrema = findExtrema((x) => x ** 2 - 4, -5, 5)
    const intersections = findIntersections((x) => x, (x) => 2 - x, -5, 5)

    expect(roots).toHaveLength(2)
    expect(roots[0]).toBeCloseTo(2, 3)
    expect(roots[1]).toBeCloseTo(3, 3)
    expect(extrema.some((point) => point.kind === "minimum")).toBe(true)
    expect(intersections[0]).toMatchObject({ x: expect.closeTo(1, 3) })
    expect(intersections[0].y).toBeCloseTo(1, 3)
  })
})
