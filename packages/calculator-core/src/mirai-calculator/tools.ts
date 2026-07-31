function requireFinite(values: number[]): void {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("Tool inputs must be finite numbers")
  }
}

interface DecimalInteger {
  coefficient: bigint
  decimalPlaces: number
}

function decimalInteger(value: number): DecimalInteger {
  const [coefficientSource, exponentSource = "0"] = String(value).toLowerCase().split("e")
  const negative = coefficientSource.startsWith("-")
  const unsigned = coefficientSource.replace(/^[+-]/, "")
  const [whole, fraction = ""] = unsigned.split(".")
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "") || "0"
  return {
    coefficient: BigInt(`${negative ? "-" : ""}${digits}`),
    decimalPlaces: fraction.length - Number(exponentSource),
  }
}

function bigintGcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left
  let b = right < 0n ? -right : right
  while (b !== 0n) {
    ;[a, b] = [b, a % b]
  }
  return a
}

function scaledBigint(value: bigint, decimalPlaces: number): number {
  return Number(`${value}e${-decimalPlaces}`)
}

function stableMidpoint(left: number, right: number): number {
  const sum = left + right
  return Number.isFinite(sum) ? sum / 2 : left / 2 + right / 2
}

/** Parses a calculator tool input while tolerating visual thousands separators. */
export function parseToolNumber(value: string, fallback = 0): number {
  const result = Number(value.replace(/,/g, ""))
  return Number.isFinite(result) ? result : fallback
}

/** Initial editable values for the math-tools workspace. */
export interface ToolsInitialData {
  percent?: number | string
  percentOf?: number | string
  ratioLeft?: number | string
  ratioRight?: number | string
  ratioScale?: number | string
  x1?: number | string
  y1?: number | string
  x2?: number | string
  y2?: number | string
  radius?: number | string
  base?: number | string
  height?: number | string
  depth?: number | string
}

/** Serializes an optional initial tool value for an editable input. */
export function serializeToolValue(value: number | string | undefined): string {
  return value === undefined ? "" : String(value)
}

export interface PercentResults {
  portion: number
  increased: number
  decreased: number
  originalBeforeIncrease: number
}

/** Calculates common percentage transformations for a finite percentage and value. */
export function calculatePercent(percent: number, value: number): PercentResults {
  requireFinite([percent, value])
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

/** Reduces a ratio and scales both sides by a finite multiplier. */
export function calculateRatio(left: number, right: number, scale: number): RatioResults {
  requireFinite([left, right, scale])
  const leftDecimal = decimalInteger(left)
  const rightDecimal = decimalInteger(right)
  const decimalPlaces = Math.max(0, leftDecimal.decimalPlaces, rightDecimal.decimalPlaces)
  const integerLeft =
    leftDecimal.coefficient * 10n ** BigInt(decimalPlaces - leftDecimal.decimalPlaces)
  const integerRight =
    rightDecimal.coefficient * 10n ** BigInt(decimalPlaces - rightDecimal.decimalPlaces)
  const integerGcd = bigintGcd(integerLeft, integerRight)
  const simplifier = integerGcd || 1n
  const gcd = scaledBigint(integerGcd, decimalPlaces)
  const integerLcm =
    integerGcd === 0n
      ? 0n
      : ((integerLeft < 0n ? -integerLeft : integerLeft) / integerGcd) *
        (integerRight < 0n ? -integerRight : integerRight)
  return {
    simplifiedLeft: Number(integerLeft / simplifier),
    simplifiedRight: Number(integerRight / simplifier),
    scaledLeft: left * scale,
    scaledRight: right * scale,
    decimal: right === 0 ? Number.NaN : left / right,
    gcd,
    lcm: scaledBigint(integerLcm, decimalPlaces),
  }
}

export interface CoordinateResults {
  distance: number
  midpoint: [number, number]
  slope: number | null
  intercept: number | null
}

/** Calculates distance, midpoint, and slope for two Cartesian points. */
export function calculateCoordinates(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): CoordinateResults {
  requireFinite([x1, y1, x2, y2])
  const coordinateScale = Math.max(Math.abs(x1), Math.abs(y1), Math.abs(x2), Math.abs(y2))
  const normalizedDx = coordinateScale === 0 ? 0 : x2 / coordinateScale - x1 / coordinateScale
  const normalizedDy = coordinateScale === 0 ? 0 : y2 / coordinateScale - y1 / coordinateScale
  const dx = x2 - x1
  const dy = y2 - y1
  const slope =
    normalizedDx === 0
      ? null
      : Number.isFinite(dx) && Number.isFinite(dy)
        ? dy / dx
        : normalizedDy / normalizedDx
  return {
    distance:
      coordinateScale === 0
        ? 0
        : Number.isFinite(dx) && Number.isFinite(dy)
          ? Math.hypot(dx, dy)
          : Math.hypot(normalizedDx, normalizedDy) * coordinateScale,
    midpoint: [stableMidpoint(x1, x2), stableMidpoint(y1, y2)],
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

/** Calculates area, circumference, and volume measurements for supported shapes. */
export function calculateShapes(
  radius: number,
  base: number,
  height: number,
  depth: number
): ShapeResults {
  requireFinite([radius, base, height, depth])
  return {
    circleArea: Math.PI * radius ** 2,
    circumference: 2 * Math.PI * radius,
    triangleArea: (base * height) / 2,
    prismVolume: base * height * depth,
  }
}
