import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { Grid3X3, Home, LocateFixed, Play, Plus, Square, X, ZoomIn, ZoomOut } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  CALCULATOR_CHART_COLORS,
  DEFAULT_GRAPH_VIEW,
  collectSliderVariables,
  resolveCssColorToken,
} from "@openmirai/calculator-core/configuration"
import { CalculatorEngine, type AngleMode } from "@openmirai/calculator-core/engine"
import {
  clusterGraphPoints,
  compileGraphExpression,
  fitGraphViewToAspect,
  findExtrema,
  findIntersections,
  findRoots,
  graphGridStep,
  projectPointToGraphSegments,
  sampleExplicitGraphSegments,
  sampleImplicitContourSegments,
  type CompiledGraphExpression,
  type GraphPoint,
  type GraphSegment,
  type GraphView,
} from "@openmirai/calculator-core/graphing"
import { fitRegression } from "@openmirai/calculator-core/statistics"
import { cn } from "@/lib/utils"

interface ExpressionRow {
  id: number
  text: string
  color: string
  visible: boolean
  slider?: {
    min: number
    max: number
    step: number
    value: number
    playing: boolean
  }
}

interface TableValue {
  id: number
  values: Record<number, string>
}

interface TableColumn {
  id: number
  label: string
  color?: string
  role: "x" | "y"
}

interface GraphMarkCluster extends GraphPoint {
  labels: string[]
  colors: string[]
  count: number
}

interface TableGraphPoint extends GraphPoint {
  rowId: number
  columnId: number
  color: string
}

interface GraphTrace extends GraphPoint {
  color: string
  source?:
    | { kind: "expression"; rowId: number }
    | { kind: "table"; rowId: number; columnId: number }
}

type ExplicitYExpression = Extract<CompiledGraphExpression, { kind: "explicit" }> & { axis: "y" }

export interface GraphingModeProps {
  angleMode: AngleMode
  ans: number
  definitions: string[]
  formatNumber: (value: number) => string
  onVariablesChange: (variables: Record<string, number>) => void
  view: GraphView
  onViewChange: (view: GraphView) => void
  gridVisible: boolean
  onGridVisibleChange: (visible: boolean) => void
  colorScheme?: "light" | "dark"
  defaultData?: GraphingInitialData
}

export interface GraphingSliderInitialValue {
  min: number
  max: number
  step: number
  value: number
  playing?: boolean
}

export interface GraphingExpressionInitialValue {
  value: string
  color?: string
  visible?: boolean
  slider?: GraphingSliderInitialValue
}

export interface GraphingTableSeriesInitialValue {
  label?: string
  color?: string
  values: readonly (number | string)[]
}

export interface GraphingTableInitialValue {
  xLabel?: string
  xValues?: readonly (number | string)[]
  series?: readonly GraphingTableSeriesInitialValue[]
}

export interface GraphingInitialData {
  expressions?: readonly GraphingExpressionInitialValue[]
  table?: GraphingTableInitialValue
}

const GRAPH_POINT_HIT_RADIUS = 14
const IMPLICIT_CACHE_LIMIT = 24
const TABLE_INDEX_COLUMN_WIDTH = 36
const TABLE_VALUE_COLUMN_WIDTH = 112
const TABLE_ACTION_COLUMN_WIDTH = 32

function initialExpressionRows(data: GraphingInitialData | undefined): ExpressionRow[] {
  return (data?.expressions ?? []).map((expression, index) => ({
    id: index + 1,
    text: expression.value,
    color: expression.color ?? CALCULATOR_CHART_COLORS[index % CALCULATOR_CHART_COLORS.length],
    visible: expression.visible ?? true,
    slider: expression.slider
      ? { ...expression.slider, playing: expression.slider.playing ?? false }
      : undefined,
  }))
}

function initialTableState(data: GraphingInitialData | undefined): {
  columns: TableColumn[]
  rows: TableValue[]
} {
  const table = data?.table
  const series = table?.series?.length
    ? table.series
    : [{ label: "y₁", color: CALCULATOR_CHART_COLORS[2], values: [] }]
  const columns: TableColumn[] = [
    { id: 1, label: table?.xLabel ?? "x₁", role: "x" },
    ...series.map((item, index) => ({
      id: index + 2,
      label: item.label ?? `y${String(index + 1)}`,
      color: item.color ?? CALCULATOR_CHART_COLORS[(index + 2) % CALCULATOR_CHART_COLORS.length],
      role: "y" as const,
    })),
  ]
  const rowCount = Math.max(
    table?.xValues?.length ?? 0,
    ...series.map((item) => item.values.length)
  )
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => ({
    id: rowIndex + 1,
    values: Object.fromEntries([
      [1, String(table?.xValues?.[rowIndex] ?? "")],
      ...series.map((item, seriesIndex) => [seriesIndex + 2, String(item.values[rowIndex] ?? "")]),
    ]),
  }))
  return { columns, rows }
}

function readCanvasColor(element: Element, name: string): string {
  const computed = getComputedStyle(element)
  const value = computed.getPropertyValue(name).trim()
  return value || (name === "--background" ? computed.backgroundColor : computed.color)
}

function resolveCanvasPaint(element: Element, token: string): string {
  const computed = getComputedStyle(element)
  const properties = Object.fromEntries(
    CALCULATOR_CHART_COLORS.map((color) => {
      const property = color.slice(4, -1)
      return [property, computed.getPropertyValue(property)]
    })
  )
  return resolveCssColorToken(token, properties, computed.color)
}

/** Renders the interactive graph workspace with expressions, tables, tracing, and analysis. */
export function GraphingMode({
  angleMode,
  ans,
  definitions,
  formatNumber: formatValue,
  onVariablesChange,
  view,
  onViewChange,
  gridVisible,
  onGridVisibleChange,
  colorScheme = "light",
  defaultData,
}: GraphingModeProps) {
  const [initialTable] = useState(() => initialTableState(defaultData))
  const [rows, setRows] = useState<ExpressionRow[]>(() => initialExpressionRows(defaultData))
  const rowsRef = useRef(rows)
  const [tableColumns, setTableColumns] = useState<TableColumn[]>(initialTable.columns)
  const [table, setTable] = useState<TableValue[]>(initialTable.rows)
  const tableMinimumWidth =
    TABLE_INDEX_COLUMN_WIDTH +
    tableColumns.length * TABLE_VALUE_COLUMN_WIDTH +
    TABLE_ACTION_COLUMN_WIDTH
  const [trace, setTrace] = useState<GraphTrace | null>(null)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 })
  const nextRowId = useRef(rows.length + 1)
  const nextTableRowId = useRef(table.length + 1)
  const nextTableColumnId = useRef(tableColumns.length + 1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphHostRef = useRef<HTMLDivElement>(null)
  const renderedSegmentsRef = useRef(new Map<number, GraphSegment[]>())
  const implicitCacheRef = useRef(
    new Map<
      number,
      {
        residual: (x: number, y: number) => number
        key: string
        segments: ReturnType<typeof sampleImplicitContourSegments>
      }
    >()
  )
  const interactionTimerRef = useRef<number | null>(null)
  const dragRef = useRef<
    | {
        kind: "view"
        pointerId: number
        startX: number
        startY: number
        view: GraphView
        renderedView: GraphView
        moved: boolean
      }
    | { kind: "trace"; pointerId: number; rowId: number; color: string }
    | { kind: "table"; pointerId: number; rowId: number; columnId: number; color: string }
    | null
  >(null)
  const formatNumber = useCallback(
    (value: number) => formatValue(Number.isFinite(value) ? Number(value.toPrecision(7)) : value),
    [formatValue]
  )
  const commitRows = useCallback(
    (update: ExpressionRow[] | ((current: ExpressionRow[]) => ExpressionRow[])) => {
      const nextRows = typeof update === "function" ? update(rowsRef.current) : update
      rowsRef.current = nextRows
      setRows(nextRows)
      onVariablesChange(
        collectSliderVariables(
          nextRows.map((row) => ({ expression: row.text, value: row.slider?.value }))
        )
      )
    },
    [onVariablesChange]
  )
  const tracePosition = useMemo(() => {
    if (!trace || graphSize.width <= 0 || graphSize.height <= 0) return null
    const renderedView = fitGraphViewToAspect(view, graphSize.width, graphSize.height)
    return {
      x:
        ((trace.x - renderedView.xmin) / (renderedView.xmax - renderedView.xmin)) * graphSize.width,
      y:
        graphSize.height -
        ((trace.y - renderedView.ymin) / (renderedView.ymax - renderedView.ymin)) *
          graphSize.height,
      labelOnLeft: trace.x > (renderedView.xmin + renderedView.xmax) / 2,
      labelBelow: trace.y > renderedView.ymax - (renderedView.ymax - renderedView.ymin) * 0.12,
    }
  }, [graphSize.height, graphSize.width, trace, view])

  const setView = useCallback(
    (next: GraphView | ((current: GraphView) => GraphView)) => {
      onViewChange(typeof next === "function" ? next(view) : next)
    },
    [onViewChange, view]
  )

  const variables = useMemo(
    () =>
      collectSliderVariables(
        rows.map((row) => ({ expression: row.text, value: row.slider?.value }))
      ),
    [rows]
  )

  const engine = useMemo(
    () =>
      new CalculatorEngine({
        angleMode,
        ans,
        definitions,
        variables,
      }),
    [angleMode, ans, definitions, variables]
  )

  const compiled = useMemo(
    () =>
      rows.map((row) => ({
        row,
        expression: compileGraphExpression(row.text, engine),
      })),
    [engine, rows]
  )

  const tableSeries = useMemo(() => {
    const xColumn = tableColumns.find((column) => column.role === "x")
    if (!xColumn) return []
    return tableColumns
      .filter(
        (column): column is TableColumn & { color: string } => column.role === "y" && !!column.color
      )
      .map((column) => {
        const points = table.flatMap<TableGraphPoint>((row) => {
          const x = Number(row.values[xColumn.id])
          const y = Number(row.values[column.id])
          return Number.isFinite(x) && Number.isFinite(y)
            ? [{ x, y, rowId: row.id, columnId: column.id, color: column.color }]
            : []
        })
        return {
          column,
          points,
          regression: fitRegression(
            points.map((point) => point.x),
            points.map((point) => point.y),
            "linear"
          ),
        }
      })
  }, [table, tableColumns])
  const tablePoints = useMemo(() => tableSeries.flatMap((series) => series.points), [tableSeries])

  const marks = useMemo<GraphMarkCluster[]>(() => {
    if (!analysisOpen) return []
    const visibleFunctions = compiled.filter(
      (
        item
      ): item is {
        row: ExpressionRow
        expression: ExplicitYExpression
      } => item.row.visible && item.expression.kind === "explicit" && item.expression.axis === "y"
    )
    const result: Array<GraphPoint & { label: string; color: string }> = []

    for (const item of visibleFunctions) {
      try {
        for (const x of findRoots(item.expression.evaluate, view.xmin, view.xmax)) {
          result.push({ x, y: 0, label: "zero", color: item.row.color })
        }
        for (const point of findExtrema(item.expression.evaluate, view.xmin, view.xmax)) {
          result.push({
            x: point.x,
            y: point.y,
            label: point.kind,
            color: item.row.color,
          })
        }
      } catch {
        // A partially defined function is still allowed to render where possible.
      }
    }

    for (let left = 0; left < visibleFunctions.length; left += 1) {
      for (let right = left + 1; right < visibleFunctions.length; right += 1) {
        try {
          for (const point of findIntersections(
            visibleFunctions[left].expression.evaluate,
            visibleFunctions[right].expression.evaluate,
            view.xmin,
            view.xmax
          )) {
            result.push({
              ...point,
              label: "intersection",
              color: CALCULATOR_CHART_COLORS[4],
            })
          }
        } catch {
          // Ignore an invalid pair while keeping the remaining graph usable.
        }
      }
    }
    const tolerance = Math.max(view.xmax - view.xmin, view.ymax - view.ymin) * 1e-6
    return clusterGraphPoints(result.slice(0, 50), tolerance).map(({ point, indexes }) => ({
      ...point,
      labels: [...new Set(indexes.map((index) => result[index].label))],
      colors: [...new Set(indexes.map((index) => result[index].color))],
      count: indexes.length,
    }))
  }, [analysisOpen, compiled, view.xmax, view.xmin, view.ymax, view.ymin])

  useEffect(() => {
    const canvas = canvasRef.current
    const host = graphHostRef.current
    if (!canvas || !host) return

    const draw = () => {
      const bounds = host.getBoundingClientRect()
      const width = Math.max(1, Math.floor(bounds.width))
      const height = Math.max(1, Math.floor(bounds.height))
      setGraphSize((current) =>
        current.width === width && current.height === height ? current : { width, height }
      )
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const context = canvas.getContext("2d")
      if (!context) return
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      const background = readCanvasColor(canvas, "--background")
      const border = readCanvasColor(canvas, "--border")
      const muted = readCanvasColor(canvas, "--muted-foreground")
      const renderedView = fitGraphViewToAspect(view, width, height)
      const xToCanvas = (x: number) =>
        ((x - renderedView.xmin) / (renderedView.xmax - renderedView.xmin)) * width
      const yToCanvas = (y: number) =>
        height - ((y - renderedView.ymin) / (renderedView.ymax - renderedView.ymin)) * height
      const renderedSegments = new Map<number, GraphSegment[]>()

      context.clearRect(0, 0, width, height)
      context.fillStyle = background
      context.fillRect(0, 0, width, height)

      if (gridVisible) {
        const xStep = graphGridStep(renderedView.xmax - renderedView.xmin)
        const yStep = graphGridStep(renderedView.ymax - renderedView.ymin)
        context.strokeStyle = border
        context.lineWidth = 1
        context.font = "10px system-ui, -apple-system, sans-serif"
        context.fillStyle = muted

        for (
          let x = Math.ceil(renderedView.xmin / xStep) * xStep;
          x <= renderedView.xmax;
          x += xStep
        ) {
          const pixel = xToCanvas(x)
          context.beginPath()
          context.moveTo(pixel, 0)
          context.lineTo(pixel, height)
          context.stroke()
          if (Math.abs(x) > 1e-10) {
            context.fillText(formatNumber(x), pixel + 4, yToCanvas(0) + 12)
          }
        }
        for (
          let y = Math.ceil(renderedView.ymin / yStep) * yStep;
          y <= renderedView.ymax;
          y += yStep
        ) {
          const pixel = yToCanvas(y)
          context.beginPath()
          context.moveTo(0, pixel)
          context.lineTo(width, pixel)
          context.stroke()
          if (Math.abs(y) > 1e-10) {
            context.fillText(formatNumber(y), xToCanvas(0) + 5, pixel - 4)
          }
        }
      }

      context.strokeStyle = muted
      context.lineWidth = 1.3
      if (renderedView.ymin <= 0 && renderedView.ymax >= 0) {
        context.beginPath()
        context.moveTo(0, yToCanvas(0))
        context.lineTo(width, yToCanvas(0))
        context.stroke()
      }
      if (renderedView.xmin <= 0 && renderedView.xmax >= 0) {
        context.beginPath()
        context.moveTo(xToCanvas(0), 0)
        context.lineTo(xToCanvas(0), height)
        context.stroke()
      }

      for (const { row, expression } of compiled) {
        if (!row.visible || expression.kind === "invalid") continue
        const rowColor = resolveCanvasPaint(canvas, row.color)
        context.strokeStyle = rowColor
        context.fillStyle = rowColor
        context.lineWidth = 2.2
        context.lineCap = "round"
        context.lineJoin = "round"

        if (expression.kind === "explicit") {
          const segments = sampleExplicitGraphSegments(
            expression.evaluate,
            expression.axis,
            renderedView,
            width,
            height
          )
          context.beginPath()
          for (const segment of segments) {
            context.moveTo(xToCanvas(segment.from.x), yToCanvas(segment.from.y))
            context.lineTo(xToCanvas(segment.to.x), yToCanvas(segment.to.y))
          }
          context.stroke()
          renderedSegments.set(row.id, segments)
        } else if (expression.kind === "points") {
          for (const point of expression.points) {
            context.beginPath()
            context.arc(xToCanvas(point.x), yToCanvas(point.y), 4.5, 0, Math.PI * 2)
            context.fill()
          }
        } else if (expression.kind === "implicit") {
          const columns = interacting
            ? Math.max(36, Math.min(72, Math.ceil(width / 14)))
            : Math.max(48, Math.min(120, Math.ceil(width / 9)))
          const rowsCount = interacting
            ? Math.max(32, Math.min(56, Math.ceil(height / 14)))
            : Math.max(40, Math.min(96, Math.ceil(height / 9)))
          const cacheKey = [
            renderedView.xmin,
            renderedView.xmax,
            renderedView.ymin,
            renderedView.ymax,
            columns,
            rowsCount,
          ].join(":")
          const cached = implicitCacheRef.current.get(row.id)
          const segments =
            cached?.residual === expression.residual && cached.key === cacheKey
              ? cached.segments
              : sampleImplicitContourSegments(expression.residual, renderedView, columns, rowsCount)
          if (segments !== cached?.segments) {
            implicitCacheRef.current.set(row.id, {
              residual: expression.residual,
              key: cacheKey,
              segments,
            })
            if (implicitCacheRef.current.size > IMPLICIT_CACHE_LIMIT) {
              const oldestRowId = implicitCacheRef.current.keys().next().value
              if (typeof oldestRowId === "number") implicitCacheRef.current.delete(oldestRowId)
            }
          }
          const isolatedPoints: GraphPoint[] = []
          context.beginPath()
          for (const segment of segments) {
            const fromX = xToCanvas(segment.from.x)
            const fromY = yToCanvas(segment.from.y)
            const toX = xToCanvas(segment.to.x)
            const toY = yToCanvas(segment.to.y)
            if (segment.from.x === segment.to.x && segment.from.y === segment.to.y) {
              isolatedPoints.push({ x: fromX, y: fromY })
              continue
            }
            context.moveTo(fromX, fromY)
            context.lineTo(toX, toY)
          }
          context.stroke()
          for (const point of isolatedPoints) {
            context.beginPath()
            context.arc(point.x, point.y, 2.2, 0, Math.PI * 2)
            context.fill()
          }
          renderedSegments.set(row.id, segments)
        }
      }

      renderedSegmentsRef.current = renderedSegments

      for (const point of tablePoints) {
        context.fillStyle = resolveCanvasPaint(canvas, point.color)
        context.beginPath()
        context.arc(xToCanvas(point.x), yToCanvas(point.y), 4.5, 0, Math.PI * 2)
        context.fill()
      }

      for (const mark of marks) {
        context.fillStyle = background
        context.strokeStyle = resolveCanvasPaint(
          canvas,
          mark.colors.at(-1) ?? CALCULATOR_CHART_COLORS[4]
        )
        context.lineWidth = 2
        context.beginPath()
        context.arc(xToCanvas(mark.x), yToCanvas(mark.y), 5, 0, Math.PI * 2)
        context.fill()
        context.stroke()
      }
    }

    let frame = window.requestAnimationFrame(draw)
    const scheduleDraw = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(draw)
    }
    const observer = new ResizeObserver(scheduleDraw)
    observer.observe(host)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [colorScheme, compiled, formatNumber, gridVisible, interacting, marks, tablePoints, view])

  const hasPlayingSliders = rows.some((row) => row.slider?.playing)

  useEffect(() => {
    if (!hasPlayingSliders) return
    const timer = window.setInterval(() => {
      commitRows((currentRows) =>
        currentRows.map((current) => {
          if (!current.slider?.playing) return current
          const next = current.slider.value + current.slider.step
          return {
            ...current,
            slider: {
              ...current.slider,
              value: next > current.slider.max ? current.slider.min : next,
            },
          }
        })
      )
    }, 100)
    return () => window.clearInterval(timer)
  }, [commitRows, hasPlayingSliders])

  const zoom = useCallback(
    (factor: number) => {
      setView((current) => {
        const centerX = (current.xmin + current.xmax) / 2
        const centerY = (current.ymin + current.ymax) / 2
        const halfWidth = ((current.xmax - current.xmin) * factor) / 2
        const halfHeight = ((current.ymax - current.ymin) * factor) / 2
        return {
          xmin: centerX - halfWidth,
          xmax: centerX + halfWidth,
          ymin: centerY - halfHeight,
          ymax: centerY + halfHeight,
        }
      })
    },
    [setView]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setInteracting(true)
      if (interactionTimerRef.current !== null) {
        window.clearTimeout(interactionTimerRef.current)
      }
      interactionTimerRef.current = window.setTimeout(() => {
        setInteracting(false)
        interactionTimerRef.current = null
      }, 140)
      zoom(event.deltaY > 0 ? 1.12 : 1 / 1.12)
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      canvas.removeEventListener("wheel", handleWheel)
      if (interactionTimerRef.current !== null) {
        window.clearTimeout(interactionTimerRef.current)
      }
    }
  }, [zoom])

  const graphCoordinates = (clientX: number, clientY: number): GraphPoint => {
    const bounds = canvasRef.current!.getBoundingClientRect()
    const renderedView = fitGraphViewToAspect(view, bounds.width, bounds.height)
    return {
      x:
        renderedView.xmin +
        ((clientX - bounds.left) / bounds.width) * (renderedView.xmax - renderedView.xmin),
      y:
        renderedView.ymax -
        ((clientY - bounds.top) / bounds.height) * (renderedView.ymax - renderedView.ymin),
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const bounds = event.currentTarget.getBoundingClientRect()
    const measuredSize = {
      width: Math.max(1, Math.floor(bounds.width)),
      height: Math.max(1, Math.floor(bounds.height)),
    }
    setGraphSize((current) =>
      current.width === measuredSize.width && current.height === measuredSize.height
        ? current
        : measuredSize
    )
    const renderedView = fitGraphViewToAspect(view, bounds.width, bounds.height)
    const graphPoint = graphCoordinates(event.clientX, event.clientY)
    const pointerX = event.clientX - bounds.left
    const pointerY = event.clientY - bounds.top
    const xToCanvas = (x: number) =>
      ((x - renderedView.xmin) / (renderedView.xmax - renderedView.xmin)) * bounds.width
    const yToCanvas = (y: number) =>
      bounds.height -
      ((y - renderedView.ymin) / (renderedView.ymax - renderedView.ymin)) * bounds.height

    const tablePoint = [...tablePoints]
      .reverse()
      .find(
        (point) =>
          Math.hypot(xToCanvas(point.x) - pointerX, yToCanvas(point.y) - pointerY) <=
          GRAPH_POINT_HIT_RADIUS
      )
    if (tablePoint) {
      setTrace({
        ...tablePoint,
        source: { kind: "table", rowId: tablePoint.rowId, columnId: tablePoint.columnId },
      })
      dragRef.current = {
        kind: "table",
        pointerId: event.pointerId,
        rowId: tablePoint.rowId,
        columnId: tablePoint.columnId,
        color: tablePoint.color,
      }
      setInteracting(true)
      return
    }

    let closestCurve: { row: ExpressionRow; point: GraphPoint } | null = null
    let closestDistance = GRAPH_POINT_HIT_RADIUS + 1
    for (const item of compiled) {
      if (
        !item.row.visible ||
        (item.expression.kind !== "explicit" && item.expression.kind !== "implicit")
      ) {
        continue
      }
      const renderedSegments = renderedSegmentsRef.current.get(item.row.id)
      const fallbackSegments =
        item.expression.kind === "explicit"
          ? sampleExplicitGraphSegments(
              item.expression.evaluate,
              item.expression.axis,
              renderedView,
              bounds.width,
              bounds.height
            )
          : []
      if (!renderedSegments && fallbackSegments.length > 0) {
        renderedSegmentsRef.current.set(item.row.id, fallbackSegments)
      }
      const projection = projectPointToGraphSegments(
        renderedSegments ?? fallbackSegments,
        graphPoint,
        renderedView,
        bounds.width,
        bounds.height
      )
      if (projection && projection.distance <= closestDistance) {
        closestCurve = { row: item.row, point: projection.point }
        closestDistance = projection.distance
      }
    }
    if (closestCurve) {
      setTrace({
        ...closestCurve.point,
        color: closestCurve.row.color,
        source: { kind: "expression", rowId: closestCurve.row.id },
      })
      dragRef.current = {
        kind: "trace",
        pointerId: event.pointerId,
        rowId: closestCurve.row.id,
        color: closestCurve.row.color,
      }
      setInteracting(true)
      return
    }

    dragRef.current = {
      kind: "view",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      view,
      renderedView,
      moved: false,
    }
    setInteracting(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const point = graphCoordinates(event.clientX, event.clientY)

    if (drag.kind === "trace") {
      const renderedView = fitGraphViewToAspect(view, bounds.width, bounds.height)
      const projection = projectPointToGraphSegments(
        renderedSegmentsRef.current.get(drag.rowId) ?? [],
        point,
        renderedView,
        bounds.width,
        bounds.height
      )
      if (projection) {
        setTrace({
          ...projection.point,
          color: drag.color,
          source: { kind: "expression", rowId: drag.rowId },
        })
      }
      return
    }

    if (drag.kind === "table") {
      const xColumn = tableColumns.find((column) => column.role === "x")
      if (!xColumn) return
      const xValue = String(Number(point.x.toPrecision(10)))
      const yValue = String(Number(point.y.toPrecision(10)))
      setTable((current) =>
        current.map((row) =>
          row.id === drag.rowId
            ? {
                ...row,
                values: {
                  ...row.values,
                  [xColumn.id]: xValue,
                  [drag.columnId]: yValue,
                },
              }
            : row
        )
      )
      setTrace({
        x: point.x,
        y: point.y,
        color: drag.color,
        source: { kind: "table", rowId: drag.rowId, columnId: drag.columnId },
      })
      return
    }

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
    const xShift = (dx / bounds.width) * (drag.renderedView.xmax - drag.renderedView.xmin)
    const yShift = (dy / bounds.height) * (drag.renderedView.ymax - drag.renderedView.ymin)
    setView({
      xmin: drag.view.xmin - xShift,
      xmax: drag.view.xmax - xShift,
      ymin: drag.view.ymin + yShift,
      ymax: drag.view.ymax + yShift,
    })
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const completedDrag = dragRef.current
    dragRef.current = null
    if (completedDrag?.kind === "trace" || completedDrag?.kind === "table") setTrace(null)
    setInteracting(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const updateRow = (id: number, patch: Partial<ExpressionRow>) => {
    commitRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addExpression = () => {
    const id = nextRowId.current
    nextRowId.current += 1
    commitRows((current) => [
      ...current,
      {
        id,
        text: "",
        color: CALCULATOR_CHART_COLORS[(id - 1) % CALCULATOR_CHART_COLORS.length],
        visible: true,
      },
    ])
  }

  const updateCell = (rowId: number, columnId: number, value: string) => {
    setTable((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, values: { ...row.values, [columnId]: value } } : row
      )
    )
  }

  const addTableRow = () => {
    const id = nextTableRowId.current
    nextTableRowId.current += 1
    setTable((current) => [
      ...current,
      { id, values: Object.fromEntries(tableColumns.map((column) => [column.id, ""])) },
    ])
  }

  const addTableVariable = () => {
    const id = nextTableColumnId.current
    nextTableColumnId.current += 1
    const variableIndex = tableColumns.filter((column) => column.role === "y").length + 1
    setTableColumns((current) => [
      ...current,
      {
        id,
        label: `y${String(variableIndex)}`,
        color: CALCULATOR_CHART_COLORS[(variableIndex + 1) % CALCULATOR_CHART_COLORS.length],
        role: "y",
      },
    ])
  }

  const removeTableVariable = (columnId: number) => {
    setTableColumns((current) => current.filter((column) => column.id !== columnId))
    setTable((current) =>
      current.map((row) => {
        const values = { ...row.values }
        delete values[columnId]
        return { ...row, values }
      })
    )
  }

  return (
    <div className="mirai-graphing-layout grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)] overflow-hidden @max-[699px]:grid-cols-1 @max-[699px]:overflow-y-auto">
      <aside className="mirai-graphing-sidebar flex min-h-0 flex-col border-r bg-card @max-[699px]:order-2 @max-[699px]:min-h-[300px] @max-[699px]:max-h-[50%] @max-[699px]:border-r-0 @max-[699px]:border-b">
        <ScrollArea className="min-h-0 flex-1">
          <div className="divide-y">
            {compiled.map(({ row, expression }) => (
              <div key={row.id} className="flex gap-2.5 px-3 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => updateRow(row.id, { visible: !row.visible })}
                  aria-label={row.visible ? "Hide expression" : "Show expression"}
                  className="mt-0.5 size-[22px] shrink-0 rounded-full border-2 p-0"
                  style={{
                    borderColor: row.color,
                    backgroundColor: row.visible ? row.color : "transparent",
                  }}
                >
                  <span className="sr-only">{row.visible ? "Visible" : "Hidden"}</span>
                </Button>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={row.text}
                      onChange={(event) => updateRow(row.id, { text: event.target.value })}
                      aria-label={`Graph expression ${row.id}`}
                      placeholder="y = 2x + 5"
                      className="h-7 min-w-0 rounded-none border-0 border-b border-transparent bg-transparent px-0 font-mono text-base font-medium shadow-none focus-visible:border-primary focus-visible:ring-0 dark:bg-transparent"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        commitRows((current) => current.filter((item) => item.id !== row.id))
                      }
                      aria-label={`Delete expression ${row.id}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X />
                    </Button>
                  </div>
                  <p
                    className={cn(
                      "text-xs text-muted-foreground",
                      expression.kind === "invalid" && "text-destructive"
                    )}
                  >
                    {expression.kind === "invalid"
                      ? expression.message
                      : expression.kind === "explicit"
                        ? "Plotted"
                        : expression.kind === "implicit"
                          ? "Implicit relation"
                          : expression.kind === "points"
                            ? `${expression.points.length} plotted points`
                            : `${expression.name} = ${formatNumber(expression.value)}`}
                  </p>
                  {row.slider && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{row.slider.min}</span>
                      <Input
                        type="range"
                        min={row.slider.min}
                        max={row.slider.max}
                        step={row.slider.step}
                        value={row.slider.value}
                        onChange={(event) =>
                          updateRow(row.id, {
                            slider: {
                              ...row.slider!,
                              value: Number(event.target.value),
                            },
                          })
                        }
                        aria-label={`Slider for expression ${row.id}`}
                        className="h-5 flex-1 border-0 p-0 shadow-none"
                      />
                      <span className="text-xs text-muted-foreground">{row.slider.max}</span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          updateRow(row.id, {
                            slider: {
                              ...row.slider!,
                              playing: !row.slider!.playing,
                            },
                          })
                        }
                        aria-label={row.slider.playing ? "Stop slider" : "Play slider"}
                        className="rounded-full text-primary"
                      >
                        {row.slider.playing ? <Square /> : <Play />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {rows.length === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-semibold">No expressions yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Add one to start graphing.</p>
              </div>
            )}

            <section className="p-3">
              <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                <h3 className="mr-auto text-sm font-semibold">Table 1</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTableVariable}
                  className="h-7 rounded-md text-xs"
                >
                  <Plus />
                  Variable
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTableRow}
                  className="h-7 rounded-md text-xs"
                >
                  <Plus />
                  Add row
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTable([])}
                  className="h-7 rounded-md text-xs"
                >
                  Clear
                </Button>
              </div>
              <div className="mirai-graphing-table-scroll min-w-0 max-w-full overflow-x-auto overscroll-x-contain border-y [contain:inline-size]">
                <table
                  className="w-full table-fixed border-collapse text-sm"
                  style={{ minWidth: tableMinimumWidth }}
                >
                  <colgroup>
                    <col className="w-9" />
                    {tableColumns.map((column) => (
                      <col className="w-28" key={column.id} />
                    ))}
                    <col className="w-8" />
                  </colgroup>
                  <thead className="bg-muted/35">
                    <tr>
                      <th
                        scope="col"
                        className="w-9 border-r px-2 py-1 text-center font-mono text-xs text-muted-foreground"
                      >
                        #
                      </th>
                      {tableColumns.map((column) => (
                        <th key={column.id} scope="col" className="border-r p-0 font-normal">
                          <div className="flex items-center">
                            {column.color && (
                              <span
                                aria-hidden="true"
                                className="ml-2 size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: column.color }}
                              />
                            )}
                            <Input
                              value={column.label}
                              onChange={(event) =>
                                setTableColumns((current) =>
                                  current.map((item) =>
                                    item.id === column.id
                                      ? { ...item, label: event.target.value }
                                      : item
                                  )
                                )
                              }
                              aria-label={`Table variable ${column.label}`}
                              className="h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2 font-mono text-sm font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
                            />
                            {column.role === "y" && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => removeTableVariable(column.id)}
                                aria-label={`Remove variable ${column.label}`}
                                className="rounded-none text-muted-foreground hover:text-destructive"
                              >
                                <X />
                              </Button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th scope="col" className="w-8">
                        <span className="sr-only">Row actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((row, rowIndex) => (
                      <tr key={row.id} className="border-t">
                        <th
                          scope="row"
                          className="border-r px-2 text-center font-mono text-xs font-normal text-muted-foreground"
                        >
                          {rowIndex + 1}
                        </th>
                        {tableColumns.map((column) => (
                          <td key={column.id} className="border-r p-0">
                            <Input
                              value={row.values[column.id] ?? ""}
                              onChange={(event) =>
                                updateCell(row.id, column.id, event.target.value)
                              }
                              aria-label={`${column.label} row ${rowIndex + 1}`}
                              className="h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2 font-mono text-sm shadow-none focus-visible:ring-1 dark:bg-transparent"
                            />
                          </td>
                        ))}
                        <td className="p-0">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              setTable((current) => current.filter((item) => item.id !== row.id))
                            }
                            aria-label={`Remove table row ${rowIndex + 1}`}
                            className="rounded-none text-muted-foreground hover:text-destructive"
                          >
                            <X />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {table.length === 0 && (
                      <tr>
                        <td
                          colSpan={tableColumns.length + 2}
                          className="h-12 px-3 text-center text-xs text-muted-foreground"
                        >
                          Add a row to plot table data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="p-3">
              <h3 className="mb-3 text-sm font-semibold">Regression</h3>
              <div className="space-y-3">
                {tableSeries.map(({ column, regression }) => (
                  <div key={column.id}>
                    <Badge variant="secondary" className="mb-2 font-mono text-[11px]">
                      {column.label} ~ m{tableColumns[0]?.label ?? "x"} + b
                    </Badge>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["m", regression.params[1]?.value],
                        ["b", regression.params[0]?.value],
                        ["R²", regression.r2],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-lg border p-2">
                          <div className="text-[11px] text-muted-foreground">{label}</div>
                          <div
                            className={cn(
                              "font-mono text-sm font-semibold",
                              label === "R²" && "text-primary"
                            )}
                          >
                            {typeof value === "number" && Number.isFinite(value)
                              ? formatNumber(value)
                              : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {tableSeries.length === 0 && (
                  <p className="text-xs text-muted-foreground">Add a y variable to fit data.</p>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="flex shrink-0 gap-2 border-t bg-muted/35 p-3">
          <Button variant="outline" size="sm" onClick={addExpression} className="flex-1 rounded-md">
            <Plus />
            Expression
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => commitRows([])}
            className="rounded-md text-muted-foreground hover:text-destructive"
          >
            Clear all
          </Button>
        </div>
      </aside>

      <section className="mirai-graphing-canvas relative min-h-0 overflow-hidden overscroll-contain bg-background @max-[699px]:order-1 @max-[699px]:min-h-[320px]">
        <div ref={graphHostRef} className="absolute inset-0" aria-label="Interactive graph">
          <canvas
            ref={canvasRef}
            className="size-full touch-none cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          {trace && tracePosition && (
            <div
              data-graph-trace-coordinate=""
              className="pointer-events-none absolute z-20"
              style={{ left: tracePosition.x, top: tracePosition.y }}
            >
              <span
                aria-hidden="true"
                className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: trace.color }}
              />
              <output
                aria-live="polite"
                className={cn(
                  "absolute w-max max-w-48 rounded-md border bg-background/95 px-2 py-1 font-mono text-xs text-foreground shadow-md backdrop-blur",
                  tracePosition.labelOnLeft ? "right-3" : "left-3",
                  tracePosition.labelBelow ? "top-3" : "bottom-3"
                )}
              >
                ({formatNumber(trace.x)}, {formatNumber(trace.y)})
              </output>
            </div>
          )}
        </div>

        <div className="absolute top-3 left-3 flex rounded-lg border bg-background/95 p-1 shadow-sm backdrop-blur">
          <Button variant="ghost" size="icon-sm" onClick={() => zoom(0.7)} aria-label="Zoom in">
            <ZoomIn />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => zoom(1 / 0.7)}
            aria-label="Zoom out"
          >
            <ZoomOut />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setView({ ...DEFAULT_GRAPH_VIEW })}
            aria-label="Reset graph view"
          >
            <Home />
          </Button>
          <Button
            variant={gridVisible ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => onGridVisibleChange(!gridVisible)}
            aria-label="Toggle grid"
          >
            <Grid3X3 />
          </Button>
        </div>

        {analysisOpen ? (
          <div
            data-graph-analysis
            className="absolute right-3 bottom-3 max-h-[48%] w-[min(300px,calc(100%-1.5rem))] overflow-auto rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                <LocateFixed className="size-3.5 text-primary" />
                Analysis
              </h3>
              <div className="flex items-center">
                {trace && (
                  <Button variant="ghost" size="sm" onClick={() => setTrace(null)}>
                    Clear trace
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setAnalysisOpen(false)}
                  aria-label="Hide analysis"
                >
                  <X />
                </Button>
              </div>
            </div>
            {trace && (
              <>
                <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs">
                  ({formatNumber(trace.x)}, {formatNumber(trace.y)})
                </div>
                <Separator className="my-2" />
              </>
            )}
            <div className="space-y-1">
              {marks.slice(0, 12).map((mark, index) => (
                <Button
                  variant="ghost"
                  key={`${mark.labels.join("-")}-${mark.x}-${index}`}
                  onClick={() =>
                    setTrace({
                      x: mark.x,
                      y: mark.y,
                      color: mark.colors.at(-1) ?? CALCULATOR_CHART_COLORS[4],
                    })
                  }
                  className="h-auto w-full justify-between gap-2 px-2 py-1.5 text-xs"
                >
                  <span className="truncate capitalize">
                    {mark.labels.join(" · ")}
                    {mark.count > 1 ? ` ×${String(mark.count)}` : ""}
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground">
                    ({formatNumber(mark.x)}, {formatNumber(mark.y)})
                  </span>
                </Button>
              ))}
              {marks.length === 0 && !trace && (
                <p className="py-2 text-xs text-muted-foreground">
                  Touch a curve to trace and drag it. Zeros, extrema, and intersections appear here.
                </p>
              )}
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnalysisOpen(true)}
            className="absolute right-3 bottom-3 bg-background/95 shadow-sm backdrop-blur"
          >
            <LocateFixed />
            Analysis
          </Button>
        )}
      </section>
    </div>
  )
}
