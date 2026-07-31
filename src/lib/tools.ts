import { greatestCommonDivisor } from "@/lib/calculator-engine"

function decimalPlaces(value: number): number {
  const [coefficient, exponentSource] = String(value).toLowerCase().split("e")
  const fractionLength = coefficient.split(".")[1]?.length ?? 0
  const exponent = Number(exponentSource ?? 0)
  return Math.max(0, Math.min(12, fractionLength - exponent))
}

export interface PercentResults {
  portion: number
  increased: number
  decreased: number
  originalBeforeIncrease: number
}

export function calculatePercent(
  percent: number,
  value: number,
): PercentResults {
  const rate = percent / 100
  return {
    portion: value * rate,
    increased: value * (1 + rate),
    decreased: value * (1 - rate),
    originalBeforeIncrease: 1 + rate === 0 ? Number.NaN : value / (1 + rate),
  }
}

export interface RatioResults {
  simplifiedLeft: number
  simplifiedRight: number
  scaledLeft: number
  scaledRight: number
  decimal: number
  gcd: number
  lcm: number
}

export function calculateRatio(
  left: number,
  right: number,
  scale: number,
): RatioResults {
  const multiplier =
    10 ** Math.max(decimalPlaces(left), decimalPlaces(right))
  const integerLeft = Math.round(left * multiplier)
  const integerRight = Math.round(right * multiplier)
  const integerGcd = greatestCommonDivisor(integerLeft, integerRight)
  const simplifier = integerGcd || 1
  const gcd = integerGcd / multiplier
  return {
    simplifiedLeft: integerLeft / simplifier,
    simplifiedRight: integerRight / simplifier,
    scaledLeft: left * scale,
    scaledRight: right * scale,
    decimal: right === 0 ? Number.NaN : left / right,
    gcd: integerGcd === 0 ? 0 : gcd,
    lcm:
      left === 0 || right === 0
        ? 0
        : Math.abs(left * right) / gcd,
  }
}

export interface CoordinateResults {
  distance: number
  midpoint: [number, number]
  slope: number | null
  intercept: number | null
}

export function calculateCoordinates(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): CoordinateResults {
  const dx = x2 - x1
  const dy = y2 - y1
  const slope = dx === 0 ? null : dy / dx
  return {
    distance: Math.hypot(dx, dy),
    midpoint: [(x1 + x2) / 2, (y1 + y2) / 2],
    slope,
    intercept: slope === null ? null : y1 - slope * x1,
  }
}

export interface ShapeResults {
  circleArea: number
  circumference: number
  triangleArea: number
  prismVolume: number
}

export function calculateShapes(
  radius: number,
  base: number,
  height: number,
  depth: number,
): ShapeResults {
  return {
    circleArea: Math.PI * radius ** 2,
    circumference: 2 * Math.PI * radius,
    triangleArea: (base * height) / 2,
    prismVolume: base * height * depth,
  }
}
