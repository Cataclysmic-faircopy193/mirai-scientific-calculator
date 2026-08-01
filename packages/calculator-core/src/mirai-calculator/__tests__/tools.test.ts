import { describe, expect, it } from "vitest"

import {
  calculateCoordinates,
  calculatePercent,
  calculateRatio,
  calculateShapes,
  parseToolNumber,
  serializeToolValue,
} from "../tools"

describe("calculator tools", () => {
  it("parses formatted tool values with a caller-selected fallback", () => {
    expect(parseToolNumber("1,234.5")).toBe(1234.5)
    expect(parseToolNumber("not a number", 2)).toBe(2)
    expect(parseToolNumber("")).toBe(0)
    expect(parseToolNumber("  -1,000e-2  ")).toBe(-10)
  })

  it("keeps registry tool inputs empty unless the host supplies a value", () => {
    expect(serializeToolValue(undefined)).toBe("")
    expect(serializeToolValue(0)).toBe("0")
    expect(serializeToolValue("3.5")).toBe("3.5")
  })

  it("calculates percentages", () => {
    expect(calculatePercent(15, 240)).toEqual({
      portion: 36,
      increased: 276,
      decreased: 204,
      originalBeforeIncrease: 240 / 1.15,
    })
    expect(calculatePercent(-100, 240)).toMatchObject({
      portion: -240,
      increased: 0,
      decreased: 480,
      originalBeforeIncrease: Number.NaN,
    })
    expect(calculatePercent(0, -5)).toEqual({
      portion: -0,
      increased: -5,
      decreased: -5,
      originalBeforeIncrease: -5,
    })
  })

  it("simplifies and scales ratios", () => {
    expect(calculateRatio(18, 24, 3)).toEqual({
      simplifiedLeft: 3,
      simplifiedRight: 4,
      scaledLeft: 54,
      scaledRight: 72,
      decimal: 0.75,
      gcd: 6,
      lcm: 72,
    })
  })

  it("simplifies decimal ratios without rounding them to whole inputs", () => {
    expect(calculateRatio(1.5, 2.25, 2)).toEqual({
      simplifiedLeft: 2,
      simplifiedRight: 3,
      scaledLeft: 3,
      scaledRight: 4.5,
      decimal: 2 / 3,
      gcd: 0.75,
      lcm: 4.5,
    })
  })

  it("simplifies tiny and extreme decimal ratios exactly", () => {
    expect(calculateRatio(1e-13, 2e-13, 1)).toMatchObject({
      simplifiedLeft: 1,
      simplifiedRight: 2,
      gcd: 1e-13,
      lcm: 2e-13,
    })
    expect(calculateRatio(Number.MIN_VALUE, 2 * Number.MIN_VALUE, 1)).toMatchObject({
      simplifiedLeft: 1,
      simplifiedRight: 2,
      gcd: Number.MIN_VALUE,
      lcm: 2 * Number.MIN_VALUE,
    })
  })

  it("defines zero and signed ratio edge cases", () => {
    expect(calculateRatio(0, 5, 0)).toEqual({
      simplifiedLeft: 0,
      simplifiedRight: 1,
      scaledLeft: 0,
      scaledRight: 0,
      decimal: 0,
      gcd: 5,
      lcm: 0,
    })
    expect(calculateRatio(5, 0, -2)).toMatchObject({
      simplifiedLeft: 1,
      simplifiedRight: 0,
      scaledLeft: -10,
      scaledRight: -0,
      decimal: Number.NaN,
      gcd: 5,
      lcm: 0,
    })
    expect(calculateRatio(-6, 8, 1)).toMatchObject({
      simplifiedLeft: -3,
      simplifiedRight: 4,
      decimal: -0.75,
      gcd: 2,
      lcm: 24,
    })
    expect(calculateRatio(0, 0, 1)).toMatchObject({
      simplifiedLeft: 0,
      simplifiedRight: 0,
      decimal: Number.NaN,
      gcd: 0,
      lcm: 0,
    })
  })

  it("calculates coordinate geometry", () => {
    const result = calculateCoordinates(-2, 1, 4, 9)

    expect(result.distance).toBe(10)
    expect(result.midpoint).toEqual([1, 5])
    expect(result.slope).toBeCloseTo(4 / 3)
    expect(result.intercept).toBeCloseTo(11 / 3)
  })

  it("keeps extreme coordinate midpoints and slopes numerically stable", () => {
    const identical = calculateCoordinates(1e308, 1e308, 1e308, 1e308)
    const opposite = calculateCoordinates(-1e308, -1e308, 1e308, 1e308)

    expect(identical.midpoint).toEqual([1e308, 1e308])
    expect(identical.distance).toBe(0)
    expect(identical.slope).toBeNull()
    expect(opposite.midpoint).toEqual([0, 0])
    expect(opposite.slope).toBe(1)
    expect(opposite.distance).toBe(Number.POSITIVE_INFINITY)
  })

  it("handles vertical and horizontal coordinate pairs", () => {
    expect(calculateCoordinates(2, -3, 2, 7)).toEqual({
      distance: 10,
      midpoint: [2, 2],
      slope: null,
      intercept: null,
    })
    expect(calculateCoordinates(-4, 5, 8, 5)).toEqual({
      distance: 12,
      midpoint: [2, 5],
      slope: 0,
      intercept: 5,
    })
    expect(calculateCoordinates(0, 0, 0, 0)).toEqual({
      distance: 0,
      midpoint: [0, 0],
      slope: null,
      intercept: null,
    })
  })

  it("calculates common shape measures", () => {
    const result = calculateShapes(5, 12, 7, 4)

    expect(result.circleArea).toBeCloseTo(25 * Math.PI)
    expect(result.circumference).toBeCloseTo(10 * Math.PI)
    expect(result.triangleArea).toBe(42)
    expect(result.prismVolume).toBe(336)
  })

  it("preserves signed geometric dimensions without hiding invalid domain input", () => {
    expect(calculateShapes(-2, -3, 4, -5)).toEqual({
      circleArea: 4 * Math.PI,
      circumference: -4 * Math.PI,
      triangleArea: -6,
      prismVolume: 60,
    })
  })

  it("rejects non-finite helper inputs instead of returning misleading data", () => {
    expect(() => calculatePercent(Number.NaN, 10)).toThrow(/finite/i)
    expect(() => calculateRatio(1, Number.POSITIVE_INFINITY, 1)).toThrow(/finite/i)
    expect(() => calculateCoordinates(0, 0, Number.NaN, 1)).toThrow(/finite/i)
    expect(() => calculateShapes(1, 2, 3, Number.NEGATIVE_INFINITY)).toThrow(/finite/i)
  })
})
