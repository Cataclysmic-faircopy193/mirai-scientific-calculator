import { CalculatorEngine } from "./calculator-engine"

export interface GraphView {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
}

export interface GraphPoint {
  x: number
  y: number
}

export type CompiledGraphExpression =
  | {
      kind: "explicit"
      axis: "x" | "y"
      evaluate: (input: number) => number
      source: string
    }
  | {
      kind: "implicit"
      residual: (x: number, y: number) => number
      source: string
    }
  | {
      kind: "points"
      points: GraphPoint[]
      source: string
    }
  | {
      kind: "variable"
      name: string
      value: number
      source: string
    }
  | {
      kind: "invalid"
      message: string
      source: string
    }

const MAX_GRAPH_SOURCE_LENGTH = 4096
const MAX_GRAPH_SAMPLES = 100_000

function stableMidpoint(left: number, right: number): number {
  const difference = right - left
  return Number.isFinite(difference) ? left + difference / 2 : left / 2 + right / 2
}

function validateSearchRange(xmin: number, xmax: number, samples: number): void {
  if (!Number.isFinite(xmin) || !Number.isFinite(xmax)) {
    throw new Error("Graph bounds must be finite")
  }
  if (xmin >= xmax) throw new Error("Graph minimum must be less than maximum")
  if (!Number.isInteger(samples) || samples < 2 || samples > MAX_GRAPH_SAMPLES) {
    throw new Error(`Graph samples must be a whole number from 2 to ${MAX_GRAPH_SAMPLES}`)
  }
}

function sampleStep(xmin: number, xmax: number, samples: number): number {
  const difference = xmax - xmin
  return Number.isFinite(difference) ? difference / samples : xmax / samples - xmin / samples
}

function sampleCoordinate(xmin: number, xmax: number, index: number, samples: number): number {
  const fraction = index / samples
  const difference = xmax - xmin
  return Number.isFinite(difference)
    ? xmin + difference * fraction
    : xmin * (1 - fraction) + xmax * fraction
}

function numeric(engine: CalculatorEngine, source: string, locals: Record<string, number>): number {
  const value = engine.evaluate(source, locals)
  if (typeof value !== "number") throw new Error("Expected a numeric result")
  return value
}

export function compileGraphExpression(
  source: string,
  engine: CalculatorEngine
): CompiledGraphExpression {
  const trimmed = source.trim()
  if (!trimmed) {
    return { kind: "invalid", message: "Enter an expression", source }
  }
  if (source.length > MAX_GRAPH_SOURCE_LENGTH) {
    return { kind: "invalid", message: "Expression is too long", source }
  }

  const pointPattern = /\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)/g
  const pointMatches = [...trimmed.matchAll(pointPattern)]
  if (pointMatches.length > 0) {
    const remainder = trimmed.replace(pointPattern, "").replace(/[\s,;]+/g, "")
    if (remainder) {
      return { kind: "invalid", message: "Invalid point list", source }
    }
    try {
      const points = pointMatches.map((match) => ({
        x: numeric(engine, match[1], {}),
        y: numeric(engine, match[2], {}),
      }))
      return { kind: "points", points, source }
    } catch (error) {
      return {
        kind: "invalid",
        message: error instanceof Error ? error.message : "Invalid point",
        source,
      }
    }
  }

  const equals = trimmed.indexOf("=")
  const left = equals >= 0 ? trimmed.slice(0, equals).trim() : "y"
  const right = equals >= 0 ? trimmed.slice(equals + 1).trim() : trimmed
  if (!right) {
    return { kind: "invalid", message: "Expression is incomplete", source }
  }

  const variableMatch = left.toLowerCase().match(/^[a-z]$/)
  if (variableMatch && left.toLowerCase() !== "x" && left.toLowerCase() !== "y") {
    try {
      return {
        kind: "variable",
        name: left.toLowerCase(),
        value: numeric(engine, right, {}),
        source,
      }
    } catch (error) {
      return {
        kind: "invalid",
        message: error instanceof Error ? error.message : "Invalid variable",
        source,
      }
    }
  }

  const lowerLeft = left.toLowerCase()
  const lowerRight = right.toLowerCase()
  if (lowerLeft === "y" && !/(^|[^a-z])y([^a-z]|$)/.test(lowerRight)) {
    return {
      kind: "explicit",
      axis: "y",
      source,
      evaluate: (x) => numeric(engine, right, { x }),
    }
  }
  if (lowerLeft === "x" && !/(^|[^a-z])x([^a-z]|$)/.test(lowerRight) && /y/.test(lowerRight)) {
    return {
      kind: "explicit",
      axis: "x",
      source,
      evaluate: (y) => numeric(engine, right, { y }),
    }
  }

  if (equals < 0) {
    return {
      kind: "explicit",
      axis: "y",
      source,
      evaluate: (x) => numeric(engine, trimmed, { x }),
    }
  }

  return {
    kind: "implicit",
    source,
    residual: (x, y) => numeric(engine, left, { x, y }) - numeric(engine, right, { x, y }),
  }
}

function bisectRoot(fn: (x: number) => number, left: number, right: number): number | null {
  let low = left
  let high = right
  let lowValue = fn(low)
  const highValue = fn(high)
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue)) return null
  let bestX = Math.abs(lowValue) <= Math.abs(highValue) ? low : right
  let bestMagnitude = Math.min(Math.abs(lowValue), Math.abs(highValue))
  const initialMagnitude = bestMagnitude

  for (let iteration = 0; iteration < 64; iteration += 1) {
    const midpoint = stableMidpoint(low, high)
    const midpointValue = fn(midpoint)
    if (!Number.isFinite(midpointValue)) return null
    const magnitude = Math.abs(midpointValue)
    if (magnitude < bestMagnitude) {
      bestMagnitude = magnitude
      bestX = midpoint
    }
    if (midpointValue === 0) return midpoint
    if (Math.sign(lowValue) === Math.sign(midpointValue)) {
      low = midpoint
      lowValue = midpointValue
    } else {
      high = midpoint
    }
  }

  return bestMagnitude <= initialMagnitude * 1e-8 ? bestX : null
}

function minimizeAbsolute(fn: (x: number) => number, left: number, right: number): number | null {
  let low = left
  let high = right
  for (let iteration = 0; iteration < 64; iteration += 1) {
    const first = low + (high - low) / 3
    const second = high - (high - low) / 3
    const firstValue = fn(first)
    const secondValue = fn(second)
    if (!Number.isFinite(firstValue) || !Number.isFinite(secondValue)) {
      return null
    }
    if (Math.abs(firstValue) <= Math.abs(secondValue)) high = second
    else low = first
  }
  return stableMidpoint(low, high)
}

function deduplicate(values: number[], tolerance: number): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.filter(
    (value, index) => index === 0 || Math.abs(value - sorted[index - 1]) > tolerance
  )
}

export function findRoots(
  fn: (x: number) => number,
  xmin: number,
  xmax: number,
  samples = 640
): number[] {
  validateSearchRange(xmin, xmax, samples)
  const roots: number[] = []
  const step = sampleStep(xmin, xmax, samples)
  const xValues: number[] = []
  const yValues: number[] = []

  for (let index = 0; index <= samples; index += 1) {
    const x = sampleCoordinate(xmin, xmax, index, samples)
    const value = fn(x)
    xValues.push(x)
    yValues.push(value)
    if (Number.isFinite(value) && value === 0) roots.push(x)
    if (index > 0 && Number.isFinite(value)) {
      const previousValue = yValues[index - 1]
      if (
        Number.isFinite(previousValue) &&
        previousValue !== 0 &&
        Math.sign(value) !== Math.sign(previousValue)
      ) {
        const root = bisectRoot(fn, xValues[index - 1], x)
        if (root !== null) roots.push(root)
      }
    }
  }

  for (let index = 1; index < samples; index += 1) {
    const before = yValues[index - 1]
    const value = yValues[index]
    const after = yValues[index + 1]
    if (![before, value, after].every(Number.isFinite)) continue
    if (value === 0) continue
    if (Math.abs(value) < Math.abs(before) && Math.abs(value) <= Math.abs(after)) {
      const candidate = minimizeAbsolute(fn, xValues[index - 1], xValues[index + 1])
      if (candidate === null) continue
      const candidateValue = fn(candidate)
      const neighborMagnitude = Math.min(Math.abs(before), Math.abs(after))
      if (
        Number.isFinite(candidateValue) &&
        (candidateValue === 0 ||
          Math.abs(candidateValue) <= 1e-10 ||
          Math.abs(candidateValue) <= neighborMagnitude * 1e-8)
      ) {
        roots.push(candidate)
      }
    }
  }

  return deduplicate(roots, Math.max(1e-5, step * 1.5))
}

export function findIntersections(
  left: (x: number) => number,
  right: (x: number) => number,
  xmin: number,
  xmax: number
): GraphPoint[] {
  const roots = findRoots((x) => left(x) - right(x), xmin, xmax)
  return roots.map((x) => ({ x, y: left(x) })).filter((point) => Number.isFinite(point.y))
}

export function findExtrema(
  fn: (x: number) => number,
  xmin: number,
  xmax: number,
  samples = 480
): Array<GraphPoint & { kind: "maximum" | "minimum" }> {
  validateSearchRange(xmin, xmax, samples)
  const step = sampleStep(xmin, xmax, samples)
  const extrema: Array<GraphPoint & { kind: "maximum" | "minimum" }> = []
  let previousSlope: number | null = null

  for (let index = 1; index < samples; index += 1) {
    const x = sampleCoordinate(xmin, xmax, index, samples)
    const before = fn(sampleCoordinate(xmin, xmax, index - 1, samples))
    const value = fn(x)
    const after = fn(sampleCoordinate(xmin, xmax, index + 1, samples))
    if (![before, value, after].every(Number.isFinite)) continue
    const slope = after - value
    if (previousSlope !== null) {
      if (previousSlope > 0 && slope < 0) {
        extrema.push({ x, y: value, kind: "maximum" })
      } else if (previousSlope < 0 && slope > 0) {
        extrema.push({ x, y: value, kind: "minimum" })
      }
    }
    previousSlope = slope
  }

  return extrema.filter(
    (point, index) => index === 0 || Math.abs(point.x - extrema[index - 1].x) > step * 3
  )
}
