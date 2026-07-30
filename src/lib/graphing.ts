import { CalculatorEngine } from "@/lib/calculator-engine"

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

function numeric(
  engine: CalculatorEngine,
  source: string,
  locals: Record<string, number>,
): number {
  const value = engine.evaluate(source, locals)
  if (typeof value !== "number") throw new Error("Expected a numeric result")
  return value
}

export function compileGraphExpression(
  source: string,
  engine: CalculatorEngine,
): CompiledGraphExpression {
  const trimmed = source.trim()
  if (!trimmed) {
    return { kind: "invalid", message: "Enter an expression", source }
  }

  const pointPattern = /\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)/g
  const pointMatches = [...trimmed.matchAll(pointPattern)]
  if (pointMatches.length > 0) {
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
  if (
    variableMatch &&
    left.toLowerCase() !== "x" &&
    left.toLowerCase() !== "y"
  ) {
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
  if (
    lowerLeft === "x" &&
    !/(^|[^a-z])x([^a-z]|$)/.test(lowerRight) &&
    /y/.test(lowerRight)
  ) {
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
    residual: (x, y) =>
      numeric(engine, left, { x, y }) - numeric(engine, right, { x, y }),
  }
}

function bisectRoot(
  fn: (x: number) => number,
  left: number,
  right: number,
): number {
  let low = left
  let high = right
  let lowValue = fn(low)

  for (let iteration = 0; iteration < 48; iteration += 1) {
    const midpoint = (low + high) / 2
    const midpointValue = fn(midpoint)
    if (!Number.isFinite(midpointValue)) return midpoint
    if (Math.abs(midpointValue) < 1e-10) return midpoint
    if (Math.sign(lowValue) === Math.sign(midpointValue)) {
      low = midpoint
      lowValue = midpointValue
    } else {
      high = midpoint
    }
  }

  return (low + high) / 2
}

function deduplicate(values: number[], tolerance: number): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.filter(
    (value, index) =>
      index === 0 || Math.abs(value - sorted[index - 1]) > tolerance,
  )
}

export function findRoots(
  fn: (x: number) => number,
  xmin: number,
  xmax: number,
  samples = 640,
): number[] {
  const roots: number[] = []
  const step = (xmax - xmin) / samples
  let previousX = xmin
  let previousValue = fn(previousX)

  for (let index = 1; index <= samples; index += 1) {
    const x = xmin + step * index
    const value = fn(x)
    if (Number.isFinite(value)) {
      if (Math.abs(value) < 1e-7) roots.push(x)
      if (
        Number.isFinite(previousValue) &&
        Math.sign(value) !== Math.sign(previousValue)
      ) {
        roots.push(bisectRoot(fn, previousX, x))
      }
    }
    previousX = x
    previousValue = value
  }

  return deduplicate(roots, Math.max(1e-5, step * 1.5))
}

export function findIntersections(
  left: (x: number) => number,
  right: (x: number) => number,
  xmin: number,
  xmax: number,
): GraphPoint[] {
  const roots = findRoots((x) => left(x) - right(x), xmin, xmax)
  return roots
    .map((x) => ({ x, y: left(x) }))
    .filter((point) => Number.isFinite(point.y))
}

export function findExtrema(
  fn: (x: number) => number,
  xmin: number,
  xmax: number,
  samples = 480,
): Array<GraphPoint & { kind: "maximum" | "minimum" }> {
  const step = (xmax - xmin) / samples
  const extrema: Array<GraphPoint & { kind: "maximum" | "minimum" }> = []
  let previousSlope: number | null = null

  for (let index = 1; index < samples; index += 1) {
    const x = xmin + index * step
    const before = fn(x - step)
    const value = fn(x)
    const after = fn(x + step)
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
    (point, index) =>
      index === 0 || Math.abs(point.x - extrema[index - 1].x) > step * 3,
  )
}
