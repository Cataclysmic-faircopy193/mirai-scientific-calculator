import { describe, expect, it } from "vitest"

import { CalculatorEngine } from "../calculator-engine"
import {
  clusterGraphPoints,
  compileGraphExpression,
  findExtrema,
  findIntersections,
  findRoots,
  graphGridStep,
  sampleExplicitGraphSegments,
  sampleImplicitContourSegments,
  shouldBreakGraphPath,
} from "../graphing"
import {
  fitGraphViewToAspect,
  graphPointToViewport,
  panGraphView,
  projectPointToGraphSegments,
  viewportPointToGraph,
  zoomGraphView,
} from "../graphing-view"

describe("graphing utilities", () => {
  const engine = new CalculatorEngine({ variables: { a: 1 } })

  it("compiles explicit, implicit, point, and variable expressions", () => {
    const explicit = compileGraphExpression("y = a x² − 5x + 6", engine)
    const implicit = compileGraphExpression("x² + y² = 25", engine)
    const points = compileGraphExpression("(2,0), (3,0)", engine)
    const variable = compileGraphExpression("b = 4", engine)

    expect(explicit.kind).toBe("explicit")
    if (explicit.kind === "explicit") {
      expect(explicit.evaluate(2)).toBe(0)
    }
    const spacedVariable = compileGraphExpression("y = 2 x + 1", engine)
    expect(spacedVariable.kind).toBe("explicit")
    if (spacedVariable.kind === "explicit") {
      expect(spacedVariable.evaluate(2)).toBe(5)
    }
    expect(implicit.kind).toBe("implicit")
    if (implicit.kind === "implicit") {
      expect(implicit.residual(3, 4)).toBe(0)
    }
    expect(points.kind).toBe("points")
    if (points.kind === "points") {
      expect(points.points).toHaveLength(2)
    }
    expect(variable).toMatchObject({ kind: "variable", name: "b", value: 4 })
  })

  it("finds roots, extrema, and intersections", () => {
    const roots = findRoots((x) => x ** 2 - 5 * x + 6, -2, 8)
    const extrema = findExtrema((x) => x ** 2 - 4, -5, 5)
    const maxima = findExtrema((x) => -(x ** 2), -5, 5)
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
    expect(maxima.some((point) => point.kind === "maximum")).toBe(true)
    expect(intersections[0]).toMatchObject({ x: expect.closeTo(1, 3) })
    expect(intersections[0].y).toBeCloseTo(1, 3)
  })

  it("treats coincident functions as one curve instead of infinite intersections", () => {
    expect(
      findIntersections(
        (x) => x,
        (x) => x,
        -5,
        5
      )
    ).toEqual([])
    expect(
      findIntersections(
        (x) => 2 * x + 2,
        (x) => 2 * (x + 1),
        -5,
        5
      )
    ).toEqual([])
    expect(
      findIntersections(
        (x) => x,
        (x) => x + 0.05,
        -5,
        5
      )
    ).toEqual([])
  })

  it("clusters exact and near-overlapping graph points without moving distinct points", () => {
    const clusters = clusterGraphPoints(
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0.004, y: 0 },
        { x: 2, y: 3 },
      ],
      0.005
    )

    expect(clusters).toHaveLength(2)
    expect(clusters[0].indexes).toEqual([0, 1, 2])
    expect(clusters[0].point).toEqual({ x: 0.004 / 3, y: 0 })
    expect(clusters[1]).toEqual({ indexes: [3], point: { x: 2, y: 3 } })
    expect(() => clusterGraphPoints([{ x: Number.NaN, y: 0 }], 1)).toThrow(/finite/i)
  })

  it("rejects discontinuities as roots and detects touching roots", () => {
    const discontinuity = findRoots((x) => 1 / x, -1, 1)
    const touching = findRoots((x) => (x - Math.SQRT2) ** 2, 0, 3)

    expect(discontinuity).toEqual([])
    expect(touching).toHaveLength(1)
    expect(touching[0]).toBeCloseTo(Math.SQRT2, 7)
  })

  it("abandons root refinements when the sampled function becomes non-finite", () => {
    const crossing = findRoots((x) => x - Math.SQRT2, 0, 2, 2)
    const invalidBisection = findRoots((x) => (Math.abs(x) < 1e-12 ? Number.NaN : x), -1, 1, 3)
    const invalidMinimum = findRoots(
      (x) => {
        if (Math.abs(x - 2 / 3) < Number.EPSILON || Math.abs(x - 4 / 3) < Number.EPSILON) {
          return Number.NaN
        }
        return (x - 1) ** 2 + 0.1
      },
      0,
      2,
      2
    )

    expect(crossing).toHaveLength(1)
    expect(crossing[0]).toBeCloseTo(Math.SQRT2, 12)
    expect(invalidBisection).toEqual([])
    expect(invalidMinimum).toEqual([])
  })

  it("handles extreme finite graph ranges and bounds sampling work", () => {
    const roots = findRoots((x) => x, -1e308, 1e308, 100)

    expect(roots).toContain(0)
    expect(() => findRoots((x) => x, 1, 1)).toThrow(/less than/i)
    expect(() => findRoots((x) => x, 0, 1, 0)).toThrow(/samples/i)
    expect(() => findExtrema((x) => x, 0, 1, 100_001)).toThrow(/samples/i)
  })

  it("does not accept partial point-list matches", () => {
    expect(compileGraphExpression("", engine)).toMatchObject({
      kind: "invalid",
      message: "Enter an expression",
    })
    expect(compileGraphExpression("y =", engine)).toMatchObject({
      kind: "invalid",
      message: "Expression is incomplete",
    })
    expect(compileGraphExpression("(2,3), garbage", engine).kind).toBe("invalid")
    expect(compileGraphExpression("(unknown,3)", engine).kind).toBe("invalid")
    expect(compileGraphExpression("b = unknown", engine).kind).toBe("invalid")
    expect(compileGraphExpression(`y=${"1+".repeat(2050)}1`, engine).kind).toBe("invalid")
  })

  it("compiles vertical explicit and fallback implicit expressions", () => {
    const vertical = compileGraphExpression("x = y²", engine)
    const implicit = compileGraphExpression("x = x + y", engine)
    const bare = compileGraphExpression("x²", engine)
    const bareWithY = compileGraphExpression("x + y", engine)

    expect(vertical.kind).toBe("explicit")
    if (vertical.kind === "explicit") {
      expect(vertical.axis).toBe("x")
      expect(vertical.evaluate(3)).toBe(9)
    }
    expect(implicit.kind).toBe("implicit")
    if (implicit.kind === "implicit") {
      expect(implicit.residual(2, 3)).toBe(-3)
    }
    expect(bare.kind).toBe("explicit")
    if (bare.kind === "explicit") {
      expect(bare.evaluate(-4)).toBe(16)
    }
    expect(bareWithY).toMatchObject({ kind: "explicit", axis: "y" })
    const boolean = compileGraphExpression("y = 1 < 2", engine)
    expect(boolean.kind).toBe("explicit")
    if (boolean.kind === "explicit") {
      expect(() => boolean.evaluate(0)).toThrow(/numeric result/i)
    }
  })

  it("fits a graph view to the canvas without cropping either axis", () => {
    const source = { xmin: -5, xmax: 5, ymin: -5, ymax: 5 }
    const fitted = fitGraphViewToAspect(source, 800, 400)

    expect(fitted).toEqual({ xmin: -10, xmax: 10, ymin: -5, ymax: 5 })
    expect((fitted.xmax - fitted.xmin) / 800).toBeCloseTo((fitted.ymax - fitted.ymin) / 400, 12)
    expect(fitted.xmin).toBeLessThanOrEqual(source.xmin)
    expect(fitted.xmax).toBeGreaterThanOrEqual(source.xmax)
    expect(fitted.ymin).toBeLessThanOrEqual(source.ymin)
    expect(fitted.ymax).toBeGreaterThanOrEqual(source.ymax)
    expect(graphGridStep(fitted.xmax - fitted.xmin)).toBe(2)
    expect(() => graphGridStep(0)).toThrow(/positive and finite/i)
  })

  it("fits tall, equal, and invalid graph view shapes deterministically", () => {
    const square = { xmin: -5, xmax: 5, ymin: -5, ymax: 5 }
    expect(fitGraphViewToAspect(square, 400, 800)).toEqual({
      xmin: -5,
      xmax: 5,
      ymin: -10,
      ymax: 10,
    })
    expect(fitGraphViewToAspect(square, 400, 400)).toBe(square)
    expect(fitGraphViewToAspect(square, 0, 400)).toBe(square)
    expect(fitGraphViewToAspect({ ...square, xmax: Number.NaN }, 400, 400).xmax).toBeNaN()
    expect(fitGraphViewToAspect(square, Number.POSITIVE_INFINITY, 400)).toBe(square)
  })

  it("selects every grid-step scale boundary", () => {
    expect(graphGridStep(10)).toBe(1)
    expect(graphGridStep(20)).toBe(2)
    expect(graphGridStep(50)).toBe(5)
    expect(graphGridStep(100)).toBe(10)
    expect(graphGridStep(0.1)).toBe(0.01)
    expect(() => graphGridStep(Number.NaN)).toThrow(/positive and finite/i)
  })

  it("projects pointer movement onto the nearest rendered curve geometry", () => {
    const view = { xmin: -6, xmax: 6, ymin: -6, ymax: 6 }
    const diagonal = projectPointToGraphSegments(
      [{ from: { x: -5, y: -5 }, to: { x: 5, y: 5 } }],
      { x: 3, y: 1 },
      view,
      600,
      600
    )
    const circle = sampleImplicitContourSegments((x, y) => x * x + y * y - 25, view, 120, 120)
    const circleProjection = projectPointToGraphSegments(circle, { x: 5.8, y: 0 }, view, 600, 600)

    expect(diagonal?.point.x).toBeCloseTo(2, 10)
    expect(diagonal?.point.y).toBeCloseTo(2, 10)
    expect(diagonal?.distance).toBeCloseTo(Math.SQRT2 * 50, 8)
    expect(circleProjection?.point.x).toBeCloseTo(5, 1)
    expect(circleProjection?.point.y).toBeCloseTo(0, 1)
    expect(circleProjection?.distance).toBeCloseTo(40, 0)
    expect(projectPointToGraphSegments([], { x: 0, y: 0 }, view, 600, 600)).toBeNull()
  })

  it("converts, zooms, and pans graph viewports without UI dependencies", () => {
    const view = { xmin: -8, xmax: 8, ymin: -5, ymax: 7 }
    const viewportPoint = graphPointToViewport({ x: 0, y: 1 }, view, 800, 600)

    expect(viewportPoint).toEqual({ x: 400, y: 300 })
    expect(viewportPointToGraph(viewportPoint!, view, 800, 600)).toEqual({ x: 0, y: 1 })
    expect(zoomGraphView(view, 0.5)).toEqual({ xmin: -4, xmax: 4, ymin: -2, ymax: 4 })
    expect(panGraphView(view, view, 80, -60, 800, 600)).toEqual({
      xmin: -9.6,
      xmax: 6.4,
      ymin: -6.2,
      ymax: 5.8,
    })
  })

  it("rejects invalid viewport transformations without mutating the requested view", () => {
    const view = { xmin: -1, xmax: 1, ymin: -1, ymax: 1 }

    expect(graphPointToViewport({ x: 0, y: 0 }, view, 0, 100)).toBeNull()
    expect(viewportPointToGraph({ x: 0, y: 0 }, view, 100, Number.NaN)).toBeNull()
    expect(zoomGraphView(view, 0)).toBe(view)
    expect(panGraphView(view, view, 1, 1, 0, 100)).toBe(view)
  })

  it("rejects invalid projections and skips non-finite or degenerate segments", () => {
    const view = { xmin: -1, xmax: 1, ymin: -1, ymax: 1 }
    const result = projectPointToGraphSegments(
      [
        { from: { x: Number.NaN, y: 0 }, to: { x: 1, y: 1 } },
        { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } },
      ],
      { x: 0.5, y: 0 },
      view,
      100,
      100
    )
    expect(result).toEqual({ point: { x: 0, y: 0 }, distance: 25 })
    expect(projectPointToGraphSegments([], { x: Number.NaN, y: 0 }, view, 100, 100)).toBeNull()
    expect(projectPointToGraphSegments([], { x: 0, y: 0 }, view, -1, 100)).toBeNull()
  })

  it("samples explicit curves for both solved axes without bridging asymptotes", () => {
    const view = { xmin: -5, xmax: 5, ymin: -5, ymax: 5 }
    const diagonal = sampleExplicitGraphSegments((x) => x, "y", view, 600, 400)
    const vertical = sampleExplicitGraphSegments((y) => y * y, "x", view, 600, 400)
    const reciprocal = sampleExplicitGraphSegments((x) => 1 / x, "y", view, 600, 400)

    expect(diagonal.length).toBeGreaterThan(500)
    expect(diagonal[0].from.y).toBeCloseTo(diagonal[0].from.x, 10)
    expect(vertical.length).toBeGreaterThan(300)
    expect(vertical.every(({ from }) => from.x >= 0)).toBe(true)
    expect(reciprocal.every(({ from, to }) => Math.sign(from.x) === Math.sign(to.x))).toBe(true)
  })

  it("bounds explicit sampling and resets paths after invalid evaluations", () => {
    const view = { xmin: -2, xmax: 2, ymin: -2, ymax: 2 }
    const segments = sampleExplicitGraphSegments(
      (x) => {
        if (x < -1) {
          throw new Error("outside domain")
        }
        if (x > 1) {
          return Number.NaN
        }
        return x
      },
      "y",
      view,
      10_000,
      200
    )

    expect(segments.length).toBeLessThanOrEqual(4096)
    expect(segments.every(({ from, to }) => from.x >= -1 && to.x <= 1)).toBe(true)
    expect(sampleExplicitGraphSegments((x) => x, "y", view, 0, 100)).toEqual([])
    expect(sampleExplicitGraphSegments((x) => x, "y", { ...view, xmin: 2 }, 100, 100)).toEqual([])
  })

  it("samples a circle as a closed contour in all four quadrants", () => {
    const segments = sampleImplicitContourSegments(
      (x, y) => x * x + y * y - 25,
      { xmin: -6, xmax: 6, ymin: -6, ymax: 6 },
      120,
      120
    )
    const points = segments.flatMap(({ from, to }) => [from, to])
    const radii = points.map(({ x, y }) => Math.hypot(x, y))

    expect(segments.length).toBeGreaterThan(300)
    expect(Math.min(...radii)).toBeGreaterThan(4.98)
    expect(Math.max(...radii)).toBeLessThan(5.02)
    expect(points.some(({ x, y }) => x > 0 && y > 0)).toBe(true)
    expect(points.some(({ x, y }) => x < 0 && y > 0)).toBe(true)
    expect(points.some(({ x, y }) => x < 0 && y < 0)).toBe(true)
    expect(points.some(({ x, y }) => x > 0 && y < 0)).toBe(true)
  })

  it("bounds implicit contour evaluations for interactive rendering", () => {
    let evaluations = 0
    const segments = sampleImplicitContourSegments(
      (x, y) => {
        evaluations += 1
        return x * x + y * y - 25
      },
      { xmin: -8, xmax: 8, ymin: -5, ymax: 7 },
      144,
      90
    )

    expect(segments.length).toBeGreaterThan(250)
    expect(evaluations).toBeLessThan(20_000)
  })

  it("rejects invalid implicit sampling dimensions and thrown residuals", () => {
    const view = { xmin: -1, xmax: 1, ymin: -1, ymax: 1 }
    expect(sampleImplicitContourSegments(() => 0, view, 0, 10)).toEqual([])
    expect(sampleImplicitContourSegments(() => 0, view, 513, 10)).toEqual([])
    expect(sampleImplicitContourSegments(() => 0, view, 1.5, 10)).toEqual([])
    expect(sampleImplicitContourSegments(() => 0, { ...view, ymax: -2 }, 10, 10)).toEqual([])
    expect(
      sampleImplicitContourSegments(
        () => {
          throw new Error("outside domain")
        },
        view,
        10,
        10
      )
    ).toEqual([])
  })

  it("keeps disconnected hyperbola branches separated across both axes", () => {
    const segments = sampleImplicitContourSegments(
      (x, y) => x * y - 1,
      { xmin: -5, xmax: 5, ymin: -5, ymax: 5 },
      140,
      140
    )

    expect(segments.length).toBeGreaterThan(100)
    for (const { from, to } of segments) {
      expect(from.x * from.y).toBeCloseTo(1, 1)
      expect(to.x * to.y).toBeCloseTo(1, 1)
      expect(Math.sign(from.x)).toBe(Math.sign(to.x))
      expect(Math.sign(from.y)).toBe(Math.sign(to.y))
    }
  })

  it("resolves a saddle crossing into both diagonal contours", () => {
    const segments = sampleImplicitContourSegments(
      (x, y) => x * x - y * y,
      { xmin: -4, xmax: 4, ymin: -4, ymax: 4 },
      80,
      80
    )
    const points = segments.flatMap(({ from, to }) => [from, to])

    expect(points.some(({ x, y }) => x > 1 && y > 1)).toBe(true)
    expect(points.some(({ x, y }) => x > 1 && y < -1)).toBe(true)
    expect(points.some(({ x, y }) => x < -1 && y > 1)).toBe(true)
    expect(points.some(({ x, y }) => x < -1 && y < -1)).toBe(true)
    expect(points.every(({ x, y }) => Math.abs(Math.abs(x) - Math.abs(y)) < 0.11)).toBe(true)
  })

  it("samples vertical implicit lines and isolated zeroes", () => {
    const vertical = sampleImplicitContourSegments(
      (x) => x - 2,
      { xmin: -5, xmax: 5, ymin: -5, ymax: 5 },
      100,
      100
    )
    const isolated = sampleImplicitContourSegments(
      (x, y) => x * x + y * y,
      { xmin: -1.03, xmax: 0.97, ymin: -0.91, ymax: 1.09 },
      37,
      41
    )

    expect(vertical.length).toBeGreaterThanOrEqual(100)
    expect(
      vertical.every(({ from, to }) => Math.abs(from.x - 2) < 1e-10 && Math.abs(to.x - 2) < 1e-10)
    ).toBe(true)
    expect(isolated.some(({ from, to }) => from.x === to.x && from.y === to.y)).toBe(true)
    expect(
      isolated.every(
        ({ from, to }) => Math.hypot(from.x, from.y) < 1e-5 && Math.hypot(to.x, to.y) < 1e-5
      )
    ).toBe(true)
  })

  it("skips non-finite contour cells instead of bridging an invalid domain", () => {
    const segments = sampleImplicitContourSegments(
      (x, y) => (x < 0 ? Number.NaN : y),
      { xmin: -2, xmax: 2, ymin: -2, ymax: 2 },
      80,
      80
    )

    expect(segments.length).toBeGreaterThan(20)
    expect(
      segments.every(
        ({ from, to }) =>
          from.x >= 0 && to.x >= 0 && Math.abs(from.y) < 1e-10 && Math.abs(to.y) < 1e-10
      )
    ).toBe(true)
  })

  it("breaks explicit paths at asymptotes without splitting normal samples", () => {
    expect(shouldBreakGraphPath({ x: 20, y: -900 }, { x: 21, y: 900 }, 1200, 800)).toBe(true)
    expect(shouldBreakGraphPath({ x: 20, y: 20 }, { x: 21, y: 24 }, 1200, 800)).toBe(false)
    expect(shouldBreakGraphPath({ x: 0, y: 0 }, { x: Number.NaN, y: 0 }, 100, 100)).toBe(true)
    expect(shouldBreakGraphPath({ x: 0, y: 0 }, { x: 50, y: 50 }, 100, 100)).toBe(false)
    expect(shouldBreakGraphPath({ x: 0, y: 0 }, { x: 51, y: 50 }, 100, 100)).toBe(true)
  })

  it("validates search bounds and ignores non-finite extrema/intersections", () => {
    expect(() => findRoots((x) => x, Number.NaN, 1)).toThrow(/finite/i)
    expect(() => findRoots((x) => x, 0, 1, 2.5)).toThrow(/whole number/i)
    expect(findRoots(() => Number.NaN, -1, 1, 10)).toEqual([])
    expect(findExtrema(() => Number.NaN, -1, 1, 10)).toEqual([])
    expect(
      findIntersections(
        () => Number.NaN,
        () => Number.NaN,
        -1,
        1
      )
    ).toEqual([])
    expect(
      findIntersections(
        (x) => x,
        () => Number.NaN,
        -1,
        1
      )
    ).toEqual([])
  })

  it("validates clustering tolerances and joins transitive overlaps", () => {
    expect(clusterGraphPoints([], 0)).toEqual([])
    expect(() => clusterGraphPoints([], -1)).toThrow(/non-negative/i)
    expect(() => clusterGraphPoints([], Number.NaN)).toThrow(/finite/i)
    expect(
      clusterGraphPoints(
        [
          { x: 0, y: 0 },
          { x: 0.9, y: 0 },
          { x: 1.8, y: 0 },
        ],
        1
      )[0].indexes
    ).toEqual([0, 1, 2])
  })
})
