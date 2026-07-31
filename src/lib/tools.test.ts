import { describe, expect, it } from "vitest"

import {
  calculateCoordinates,
  calculatePercent,
  calculateRatio,
  calculateShapes,
} from "@/lib/tools"

describe("calculator tools", () => {
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

  it("calculates coordinate geometry", () => {
    const result = calculateCoordinates(-2, 1, 4, 9)

    expect(result.distance).toBe(10)
    expect(result.midpoint).toEqual([1, 5])
    expect(result.slope).toBeCloseTo(4 / 3)
    expect(result.intercept).toBeCloseTo(11 / 3)
  })

  it("calculates common shape measures", () => {
    const result = calculateShapes(5, 12, 7, 4)

    expect(result.circleArea).toBeCloseTo(25 * Math.PI)
    expect(result.circumference).toBeCloseTo(10 * Math.PI)
    expect(result.triangleArea).toBe(42)
    expect(result.prismVolume).toBe(336)
  })
})
