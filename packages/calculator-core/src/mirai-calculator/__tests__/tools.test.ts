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

  it("calculates common shape measures", () => {
    const result = calculateShapes(5, 12, 7, 4)

    expect(result.circleArea).toBeCloseTo(25 * Math.PI)
    expect(result.circumference).toBeCloseTo(10 * Math.PI)
    expect(result.triangleArea).toBe(42)
    expect(result.prismVolume).toBe(336)
  })

  it("rejects non-finite helper inputs instead of returning misleading data", () => {
    expect(() => calculatePercent(Number.NaN, 10)).toThrow(/finite/i)
    expect(() => calculateRatio(1, Number.POSITIVE_INFINITY, 1)).toThrow(/finite/i)
    expect(() => calculateCoordinates(0, 0, Number.NaN, 1)).toThrow(/finite/i)
    expect(() => calculateShapes(1, 2, 3, Number.NEGATIVE_INFINITY)).toThrow(/finite/i)
  })
})
