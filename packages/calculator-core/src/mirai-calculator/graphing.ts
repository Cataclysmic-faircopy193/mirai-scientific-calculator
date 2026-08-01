import type { CalculatorEngine } from "./calculator-engine"
import { isValidGraphView } from "./graphing-view"
import type { GraphPoint, GraphSegment, GraphView } from "./graphing-view"

export interface GraphPointCluster {
  point: GraphPoint
  indexes: Array<number>
}

interface ContourSample extends GraphPoint {
  value: number
}

/** Samples an explicit x- or y-axis function into discontinuity-safe graph segments. */
export function sampleExplicitGraphSegments(
  evaluate: (input: number) => number,
  axis: "x" | "y",
  view: GraphView,
  width: number,
  height: number
): Array<GraphSegment> {
  if (
    !isValidGraphView(view) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return []
  }

  const sampleCount = Math.max(2, Math.min(4096, Math.ceil(axis === "y" ? width : height)))
  const minimum = axis === "y" ? view.xmin : view.ymin
  const maximum = axis === "y" ? view.xmax : view.ymax
  const xToCanvas = (x: number) => ((x - view.xmin) / (view.xmax - view.xmin)) * width
  const yToCanvas = (y: number) => height - ((y - view.ymin) / (view.ymax - view.ymin)) * height
  const segments: Array<GraphSegment> = []
  let previousGraphPoint: GraphPoint | null = null
  let previousCanvasPoint: GraphPoint | null = null

  for (let index = 0; index <= sampleCount; index += 1) {
    const input = minimum + ((maximum - minimum) * index) / sampleCount
    try {
      const output = evaluate(input)
      if (!Number.isFinite(output)) {
        previousGraphPoint = null
        previousCanvasPoint = null
        continue
      }
      const graphPoint = axis === "y" ? { x: input, y: output } : { x: output, y: input }
      const canvasPoint = { x: xToCanvas(graphPoint.x), y: yToCanvas(graphPoint.y) }
      const visible =
        canvasPoint.x > -height * 3 &&
        canvasPoint.x < width + height * 3 &&
        canvasPoint.y > -height * 3 &&
        canvasPoint.y < height * 4

      if (!visible) {
        previousGraphPoint = null
        previousCanvasPoint = null
        continue
      }
      if (
        previousGraphPoint &&
        previousCanvasPoint &&
        !shouldBreakGraphPath(previousCanvasPoint, canvasPoint, width, height)
      ) {
        segments.push({ from: previousGraphPoint, to: graphPoint })
      }
      previousGraphPoint = graphPoint
      previousCanvasPoint = canvasPoint
    } catch {
      previousGraphPoint = null
      previousCanvasPoint = null
    }
  }

  return segments
}

/** Selects a readable base-10 grid interval for the supplied visible span. */
export function graphGridStep(span: number): number {
  if (!Number.isFinite(span) || span <= 0) {
    throw new Error("Graph span must be positive and finite")
  }
  const rough = span / 10
  const power = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / power
  let factor: number
  switch (true) {
    case normalized < 1.5:
      factor = 1
      break
    case normalized < 3:
      factor = 2
      break
    case normalized < 7:
      factor = 5
      break
    default:
      factor = 10
  }
  return factor * power
}

function evaluateResidual(
  residual: (x: number, y: number) => number,
  x: number,
  y: number
): number {
  try {
    const value = residual(x, y)
    return Number.isFinite(value) ? value : Number.NaN
  } catch {
    return Number.NaN
  }
}

function interpolateZero(first: ContourSample, second: ContourSample): Array<GraphPoint> {
  if (!Number.isFinite(first.value) || !Number.isFinite(second.value)) {
    return []
  }
  if (first.value === 0 && second.value === 0) {
    return [first, second]
  }
  if (first.value === 0) {
    return [first]
  }
  if (second.value === 0) {
    return [second]
  }
  if (Math.sign(first.value) === Math.sign(second.value)) {
    return []
  }

  const interpolation = first.value / (first.value - second.value)
  return [
    {
      x: first.x + (second.x - first.x) * interpolation,
      y: first.y + (second.y - first.y) * interpolation,
    },
  ]
}

function samePoint(left: GraphPoint, right: GraphPoint, tolerance: number): boolean {
  return Math.abs(left.x - right.x) <= tolerance && Math.abs(left.y - right.y) <= tolerance
}

/** Groups finite graph points that overlap within a Euclidean tolerance. */
export function clusterGraphPoints(
  points: ReadonlyArray<GraphPoint>,
  tolerance: number
): Array<GraphPointCluster> {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error("Graph point tolerance must be finite and non-negative")
  }
  if (points.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
    throw new Error("Graph points must be finite")
  }

  const parents = points.map((_, index) => index)
  const find = (index: number): number => {
    let currentIndex = index
    let root = currentIndex
    while (parents[root] !== root) {
      root = parents[root]
    }
    while (parents[currentIndex] !== currentIndex) {
      const parent = parents[currentIndex]
      parents[currentIndex] = root
      currentIndex = parent
    }
    return root
  }
  const union = (left: number, right: number) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) {
      parents[rightRoot] = leftRoot
    }
  }

  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      if (
        Math.hypot(points[left].x - points[right].x, points[left].y - points[right].y) <= tolerance
      ) {
        union(left, right)
      }
    }
  }

  const groups = new Map<number, Array<number>>()
  points.forEach((_, index) => {
    const root = find(index)
    groups.set(root, [...(groups.get(root) ?? []), index])
  })

  return [...groups.values()].map((indexes) => ({
    indexes,
    point: {
      x: indexes.reduce((sum, index) => sum + points[index].x, 0) / indexes.length,
      y: indexes.reduce((sum, index) => sum + points[index].y, 0) / indexes.length,
    },
  }))
}

function triangleSegment(
  first: ContourSample,
  second: ContourSample,
  third: ContourSample,
  tolerance: number
): GraphSegment | null {
  if (![first.value, second.value, third.value].every(Number.isFinite)) {
    return null
  }

  const intersections = [
    ...interpolateZero(first, second),
    ...interpolateZero(second, third),
    ...interpolateZero(third, first),
  ].filter(
    (point, index, points) =>
      points.findIndex((candidate) => samePoint(candidate, point, tolerance)) === index
  )

  if (intersections.length === 0) {
    return null
  }
  if (intersections.length === 1) {
    return { from: intersections[0], to: intersections[0] }
  }

  let from = intersections[0]
  let to = intersections[1]
  let maximumDistance = -1
  for (let left = 0; left < intersections.length; left += 1) {
    for (let right = left + 1; right < intersections.length; right += 1) {
      const dx = intersections[right].x - intersections[left].x
      const dy = intersections[right].y - intersections[left].y
      const distance = dx * dx + dy * dy
      if (distance > maximumDistance) {
        maximumDistance = distance
        from = intersections[left]
        to = intersections[right]
      }
    }
  }
  return { from, to }
}

function pointKey(point: GraphPoint, tolerance: number): string {
  return `${Math.round(point.x / tolerance)},${Math.round(point.y / tolerance)}`
}

function segmentKey(segment: GraphSegment, tolerance: number): string {
  const from = pointKey(segment.from, tolerance)
  const to = pointKey(segment.to, tolerance)
  return from < to ? `${from}:${to}` : `${to}:${from}`
}

function findTouchingZero(
  residual: (x: number, y: number) => number,
  xmin: number,
  xmax: number,
  ymin: number,
  ymax: number,
  initialSamples: Array<ContourSample>
): GraphPoint | null {
  if (!initialSamples.every((sample) => Number.isFinite(sample.value))) {
    return null
  }
  const magnitudes = initialSamples.map((sample) => Math.abs(sample.value))
  const referenceMagnitude = Math.max(...magnitudes)
  const minimumMagnitude = Math.min(...magnitudes)
  if (referenceMagnitude === 0) {
    return initialSamples[0]
  }
  if (minimumMagnitude > referenceMagnitude * 0.3) {
    return null
  }

  let best = initialSamples[magnitudes.indexOf(minimumMagnitude)]
  let stepX = (xmax - xmin) / 2
  let stepY = (ymax - ymin) / 2

  for (let iteration = 0; iteration < 14; iteration += 1) {
    stepX /= 2
    stepY /= 2
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        const x = Math.max(xmin, Math.min(xmax, best.x + dx * stepX))
        const y = Math.max(ymin, Math.min(ymax, best.y + dy * stepY))
        const value = evaluateResidual(residual, x, y)
        if (Number.isFinite(value) && Math.abs(value) < Math.abs(best.value)) {
          best = { x, y, value }
        }
      }
    }
  }

  return Math.abs(best.value) <= Math.max(1e-12, referenceMagnitude * 1e-9)
    ? { x: best.x, y: best.y }
    : null
}

interface TouchingZeroCandidate {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
  samples: Array<ContourSample>
  score: number
}

const MAX_TOUCHING_ZERO_CANDIDATES = 32

function touchingZeroCandidate(
  bottomLeft: ContourSample,
  bottomRight: ContourSample,
  topRight: ContourSample,
  topLeft: ContourSample
): TouchingZeroCandidate | null {
  const samples = [bottomLeft, bottomRight, topRight, topLeft]
  if (!samples.every((sample) => Number.isFinite(sample.value))) {
    return null
  }
  const magnitudes = samples.map((sample) => Math.abs(sample.value))
  const maximum = Math.max(...magnitudes)
  const minimum = Math.min(...magnitudes)
  if (maximum === 0) {
    return {
      xmin: bottomLeft.x,
      xmax: bottomRight.x,
      ymin: bottomLeft.y,
      ymax: topLeft.y,
      samples,
      score: 0,
    }
  }
  const score = minimum / maximum
  if (score > 0.3) {
    return null
  }
  return {
    xmin: bottomLeft.x,
    xmax: bottomRight.x,
    ymin: bottomLeft.y,
    ymax: topLeft.y,
    samples,
    score,
  }
}

function contourCellSegments(
  bottomLeft: ContourSample,
  bottomRight: ContourSample,
  topRight: ContourSample,
  topLeft: ContourSample,
  residual: (x: number, y: number) => number,
  tolerance: number
): Array<GraphSegment> {
  const intersections = [
    ...interpolateZero(bottomLeft, bottomRight),
    ...interpolateZero(bottomRight, topRight),
    ...interpolateZero(topRight, topLeft),
    ...interpolateZero(topLeft, bottomLeft),
  ].filter(
    (point, index, points) =>
      points.findIndex((candidate) => samePoint(candidate, point, tolerance)) === index
  )

  if (intersections.length < 2) {
    return []
  }
  if (intersections.length === 2) {
    return [{ from: intersections[0], to: intersections[1] }]
  }

  const centerX = (bottomLeft.x + topRight.x) / 2
  const centerY = (bottomLeft.y + topRight.y) / 2
  const center: ContourSample = {
    x: centerX,
    y: centerY,
    value: evaluateResidual(residual, centerX, centerY),
  }
  return [
    triangleSegment(bottomLeft, bottomRight, center, tolerance),
    triangleSegment(bottomRight, topRight, center, tolerance),
    triangleSegment(topRight, topLeft, center, tolerance),
    triangleSegment(topLeft, bottomLeft, center, tolerance),
  ].filter((segment): segment is GraphSegment => segment !== null)
}

/** Samples an implicit residual into bounded marching-square contour segments. */
export function sampleImplicitContourSegments(
  residual: (x: number, y: number) => number,
  view: GraphView,
  columns: number,
  rows: number
): Array<GraphSegment> {
  if (!isValidGraphView(view) || !Number.isInteger(columns) || !Number.isInteger(rows)) {
    return []
  }
  if (columns < 1 || rows < 1 || columns > 512 || rows > 512) {
    return []
  }

  const xSpan = view.xmax - view.xmin
  const ySpan = view.ymax - view.ymin
  const tolerance = Math.max(xSpan / columns, ySpan / rows) * 1e-8
  const samples = Array.from({ length: rows + 1 }, (_, row) => {
    const y = view.ymin + (row / rows) * ySpan
    return Array.from({ length: columns + 1 }, (_, column) => {
      const x = view.xmin + (column / columns) * xSpan
      return { x, y, value: evaluateResidual(residual, x, y) }
    })
  })
  const segments: Array<GraphSegment> = []
  const seen = new Set<string>()
  const touchingCandidates: Array<TouchingZeroCandidate> = []

  const addSegment = (segment: GraphSegment | null) => {
    if (!segment) {
      return
    }
    const key = segmentKey(segment, tolerance)
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    segments.push(segment)
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const bottomLeft = samples[row][column]
      const bottomRight = samples[row][column + 1]
      const topRight = samples[row + 1][column + 1]
      const topLeft = samples[row + 1][column]
      const segmentCountBeforeCell = segments.length
      for (const segment of contourCellSegments(
        bottomLeft,
        bottomRight,
        topRight,
        topLeft,
        residual,
        tolerance
      )) {
        addSegment(segment)
      }
      if (segments.length === segmentCountBeforeCell) {
        const candidate = touchingZeroCandidate(bottomLeft, bottomRight, topRight, topLeft)
        if (candidate) {
          touchingCandidates.push(candidate)
        }
      }
    }
  }

  touchingCandidates.sort((left, right) => left.score - right.score)
  for (const candidate of touchingCandidates.slice(0, MAX_TOUCHING_ZERO_CANDIDATES)) {
    const centerX = (candidate.xmin + candidate.xmax) / 2
    const centerY = (candidate.ymin + candidate.ymax) / 2
    const center: ContourSample = {
      x: centerX,
      y: centerY,
      value: evaluateResidual(residual, centerX, centerY),
    }
    const touchingZero = findTouchingZero(
      residual,
      candidate.xmin,
      candidate.xmax,
      candidate.ymin,
      candidate.ymax,
      [...candidate.samples, center]
    )
    if (!touchingZero) {
      continue
    }
    const nearbyContour = segments.some(
      ({ from, to }) =>
        Math.hypot(from.x - touchingZero.x, from.y - touchingZero.y) <=
          Math.max(xSpan / columns, ySpan / rows) * 1.5 ||
        Math.hypot(to.x - touchingZero.x, to.y - touchingZero.y) <=
          Math.max(xSpan / columns, ySpan / rows) * 1.5
    )
    if (!nearbyContour) {
      addSegment({ from: touchingZero, to: touchingZero })
    }
  }

  return segments
}

/** Detects discontinuous explicit-graph samples that must not be joined by a canvas path. */
export function shouldBreakGraphPath(
  previous: GraphPoint,
  next: GraphPoint,
  width: number,
  height: number
): boolean {
  if (![previous.x, previous.y, next.x, next.y].every(Number.isFinite)) {
    return true
  }
  return Math.abs(next.x - previous.x) > width / 2 || Math.abs(next.y - previous.y) > height / 2
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
      points: Array<GraphPoint>
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
  if (xmin >= xmax) {
    throw new Error("Graph minimum must be less than maximum")
  }
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
  if (typeof value !== "number") {
    throw new Error("Expected a numeric result")
  }
  return value
}

/** Compiles a user graph expression into an explicit, implicit, point, or variable evaluator. */
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
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue)) {
    return null
  }
  let bestX = Math.abs(lowValue) <= Math.abs(highValue) ? low : right
  let bestMagnitude = Math.min(Math.abs(lowValue), Math.abs(highValue))
  const initialMagnitude = bestMagnitude

  for (let iteration = 0; iteration < 64; iteration += 1) {
    const midpoint = stableMidpoint(low, high)
    const midpointValue = fn(midpoint)
    if (!Number.isFinite(midpointValue)) {
      return null
    }
    const magnitude = Math.abs(midpointValue)
    if (magnitude < bestMagnitude) {
      bestMagnitude = magnitude
      bestX = midpoint
    }
    if (midpointValue === 0) {
      return midpoint
    }
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
    if (Math.abs(firstValue) <= Math.abs(secondValue)) {
      high = second
    } else {
      low = first
    }
  }
  return stableMidpoint(low, high)
}

function deduplicate(values: Array<number>, tolerance: number): Array<number> {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.filter(
    (value, index) => index === 0 || Math.abs(value - sorted[index - 1]) > tolerance
  )
}

/** Finds discrete roots across a finite interval, including roots that only touch the axis. */
export function findRoots(
  fn: (x: number) => number,
  xmin: number,
  xmax: number,
  samples = 640
): Array<number> {
  validateSearchRange(xmin, xmax, samples)
  const roots: Array<number> = []
  const step = sampleStep(xmin, xmax, samples)
  const xValues: Array<number> = []
  const yValues: Array<number> = []

  for (let index = 0; index <= samples; index += 1) {
    const x = sampleCoordinate(xmin, xmax, index, samples)
    const value = fn(x)
    xValues.push(x)
    yValues.push(value)
    if (Number.isFinite(value) && value === 0) {
      roots.push(x)
    }
    if (index > 0 && Number.isFinite(value)) {
      const previousValue = yValues[index - 1]
      if (
        Number.isFinite(previousValue) &&
        previousValue !== 0 &&
        Math.sign(value) !== Math.sign(previousValue)
      ) {
        const root = bisectRoot(fn, xValues[index - 1], x)
        if (root !== null) {
          roots.push(root)
        }
      }
    }
  }

  for (let index = 1; index < samples; index += 1) {
    const before = yValues[index - 1]
    const value = yValues[index]
    const after = yValues[index + 1]
    if (![before, value, after].every(Number.isFinite)) {
      continue
    }
    if (value === 0) {
      continue
    }
    if (Math.abs(value) < Math.abs(before) && Math.abs(value) <= Math.abs(after)) {
      const candidate = minimizeAbsolute(fn, xValues[index - 1], xValues[index + 1])
      if (candidate === null) {
        continue
      }
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

/** Finds discrete intersections while treating coincident functions as one overlapping curve. */
export function findIntersections(
  left: (x: number) => number,
  right: (x: number) => number,
  xmin: number,
  xmax: number
): Array<GraphPoint> {
  let comparableSamples = 0
  let coincident = true
  for (let index = 0; index <= 32; index += 1) {
    const x = sampleCoordinate(xmin, xmax, index, 32)
    const leftValue = left(x)
    const rightValue = right(x)
    if (!Number.isFinite(leftValue) && !Number.isFinite(rightValue)) {
      continue
    }
    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
      coincident = false
      break
    }
    comparableSamples += 1
    const scale = Math.max(1, Math.abs(leftValue), Math.abs(rightValue))
    if (Math.abs(leftValue - rightValue) > scale * 1e-10) {
      coincident = false
      break
    }
  }
  if (coincident && comparableSamples >= 3) {
    return []
  }

  const roots = findRoots((x) => left(x) - right(x), xmin, xmax)
  return roots.map((x) => ({ x, y: left(x) })).filter((point) => Number.isFinite(point.y))
}

/** Approximates local maxima and minima for a function across a finite interval. */
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
    if (![before, value, after].every(Number.isFinite)) {
      continue
    }
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
