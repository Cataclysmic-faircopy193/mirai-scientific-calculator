import { useEffect, useCallback, useMemo, useRef, useState } from "react"
import { readCanvasColor, resolveCanvasColor } from "@/components/mirai-calculator/canvas-theme"
import { CALCULATOR_CHART_TOKENS } from "@/components/mirai-calculator/calculator-ui-config"
import { GraphingCanvasViewport } from "@/components/mirai-calculator/modes/graphing-canvas-viewport"
import { GraphingSidebar } from "@/components/mirai-calculator/modes/graphing-sidebar"
import {
  GRAPH_POINT_HIT_RADIUS,
  IMPLICIT_CACHE_LIMIT,
  TABLE_ACTION_COLUMN_WIDTH,
  TABLE_INDEX_COLUMN_WIDTH,
  TABLE_VALUE_COLUMN_WIDTH,
  createInitialGraphExpressionRows,
  createInitialGraphTableState,
} from "@/components/mirai-calculator/modes/graphing-state"
import type {
  GraphExpressionRow,
  GraphMarkCluster,
  GraphTableColumn,
  GraphTableRow,
  GraphTrace,
  TableGraphPoint,
} from "@/components/mirai-calculator/modes/graphing-state"
import { collectSliderVariables } from "@openmirai/calculator-core/configuration"
import { CalculatorEngine } from "@openmirai/calculator-core/engine"
import type { AngleMode } from "@openmirai/calculator-core/engine"
import {
  clusterGraphPoints,
  compileGraphExpression,
  findExtrema,
  findIntersections,
  findRoots,
  graphGridStep,
  sampleExplicitGraphSegments,
  sampleImplicitContourSegments,
} from "@openmirai/calculator-core/graphing"
import type { CompiledGraphExpression } from "@openmirai/calculator-core/graphing"
import type { GraphingInitialData } from "@openmirai/calculator-core/graphing-data"
import {
  fitGraphViewToAspect,
  graphPointToViewport,
  panGraphView,
  projectPointToGraphSegments,
  viewportPointToGraph,
  zoomGraphView,
} from "@openmirai/calculator-core/graphing-view"
import type { GraphPoint, GraphSegment, GraphView } from "@openmirai/calculator-core/graphing-view"
import { fitRegression } from "@openmirai/calculator-core/statistics"

type ExplicitYExpression = Extract<CompiledGraphExpression, { kind: "explicit" }> & { axis: "y" }

export interface GraphingModeProps {
  angleMode: AngleMode
  ans: number
  definitions: Array<string>
  formatNumber: (value: number) => string
  onVariablesChange: (variables: Record<string, number>) => void
  view: GraphView
  onViewChange: (view: GraphView) => void
  gridVisible: boolean
  onGridVisibleChange: (visible: boolean) => void
  colorScheme?: "light" | "dark"
  defaultData?: GraphingInitialData
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
  const [initialTable] = useState(() => createInitialGraphTableState(defaultData))
  const [rows, setRows] = useState<Array<GraphExpressionRow>>(() =>
    createInitialGraphExpressionRows(defaultData)
  )
  const rowsRef = useRef(rows)
  const [tableColumns, setTableColumns] = useState<Array<GraphTableColumn>>(initialTable.columns)
  const [table, setTable] = useState<Array<GraphTableRow>>(initialTable.rows)
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
  const [renderedSegmentsByRow] = useState(() => new Map<number, Array<GraphSegment>>())
  const [implicitCache] = useState(
    () =>
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
    (
      update:
        | Array<GraphExpressionRow>
        | ((current: Array<GraphExpressionRow>) => Array<GraphExpressionRow>)
    ) => {
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
    if (!trace || graphSize.width <= 0 || graphSize.height <= 0) {
      return null
    }
    const renderedView = fitGraphViewToAspect(view, graphSize.width, graphSize.height)
    const point = graphPointToViewport(trace, renderedView, graphSize.width, graphSize.height)
    if (!point) {
      return null
    }
    return {
      ...point,
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
    if (!xColumn) {
      return []
    }
    return tableColumns
      .filter(
        (column): column is GraphTableColumn & { color: string } =>
          column.role === "y" && !!column.color
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

  const marks = useMemo<Array<GraphMarkCluster>>(() => {
    if (!analysisOpen) {
      return []
    }
    const visibleFunctions = compiled.filter(
      (
        item
      ): item is {
        row: GraphExpressionRow
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
              color: CALCULATOR_CHART_TOKENS[4],
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
    if (!canvas || !host) {
      return
    }

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
      if (!context) {
        return
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      const background = readCanvasColor(canvas, "--background")
      const border = readCanvasColor(canvas, "--border")
      const muted = readCanvasColor(canvas, "--muted-foreground")
      const renderedView = fitGraphViewToAspect(view, width, height)
      const xToCanvas = (x: number) =>
        ((x - renderedView.xmin) / (renderedView.xmax - renderedView.xmin)) * width
      const yToCanvas = (y: number) =>
        height - ((y - renderedView.ymin) / (renderedView.ymax - renderedView.ymin)) * height
      const renderedSegments = new Map<number, Array<GraphSegment>>()

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
        if (!row.visible || expression.kind === "invalid") {
          continue
        }
        const rowColor = resolveCanvasColor(canvas, row.color)
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
            const { from, to } = segment
            context.moveTo(xToCanvas(from.x), yToCanvas(from.y))
            context.lineTo(xToCanvas(to.x), yToCanvas(to.y))
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
          const cached = implicitCache.get(row.id)
          const segments =
            cached?.residual === expression.residual && cached.key === cacheKey
              ? cached.segments
              : sampleImplicitContourSegments(expression.residual, renderedView, columns, rowsCount)
          if (segments !== cached?.segments) {
            implicitCache.set(row.id, {
              residual: expression.residual,
              key: cacheKey,
              segments,
            })
            if (implicitCache.size > IMPLICIT_CACHE_LIMIT) {
              const oldestRowId = implicitCache.keys().next().value
              if (typeof oldestRowId === "number") {
                implicitCache.delete(oldestRowId)
              }
            }
          }
          const isolatedPoints: Array<GraphPoint> = []
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

      renderedSegmentsByRow.clear()
      for (const [rowId, segments] of renderedSegments) {
        renderedSegmentsByRow.set(rowId, segments)
      }

      for (const point of tablePoints) {
        context.fillStyle = resolveCanvasColor(canvas, point.color)
        context.beginPath()
        context.arc(xToCanvas(point.x), yToCanvas(point.y), 4.5, 0, Math.PI * 2)
        context.fill()
      }

      for (const mark of marks) {
        context.fillStyle = background
        context.strokeStyle = resolveCanvasColor(
          canvas,
          mark.colors.at(-1) ?? CALCULATOR_CHART_TOKENS[4]
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
  }, [
    colorScheme,
    compiled,
    formatNumber,
    gridVisible,
    implicitCache,
    interacting,
    marks,
    renderedSegmentsByRow,
    tablePoints,
    view,
  ])

  const hasPlayingSliders = rows.some((row) => row.slider?.playing)

  useEffect(() => {
    if (!hasPlayingSliders) {
      return
    }
    const timer = window.setInterval(() => {
      commitRows((currentRows) =>
        currentRows.map((current) => {
          if (!current.slider?.playing) {
            return current
          }
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
      setView((current) => zoomGraphView(current, factor))
    },
    [setView]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

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
    const canvas = canvasRef.current
    if (!canvas) {
      return { x: view.xmin, y: view.ymax }
    }
    const bounds = canvas.getBoundingClientRect()
    const renderedView = fitGraphViewToAspect(view, bounds.width, bounds.height)
    return (
      viewportPointToGraph(
        { x: clientX - bounds.left, y: clientY - bounds.top },
        renderedView,
        bounds.width,
        bounds.height
      ) ?? { x: renderedView.xmin, y: renderedView.ymax }
    )
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
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
    const tablePoint = [...tablePoints].reverse().find((point) => {
      const viewportPoint = graphPointToViewport(point, renderedView, bounds.width, bounds.height)
      return (
        viewportPoint !== null &&
        Math.hypot(viewportPoint.x - pointerX, viewportPoint.y - pointerY) <= GRAPH_POINT_HIT_RADIUS
      )
    })
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

    let closestCurve: { row: GraphExpressionRow; point: GraphPoint } | null = null
    let closestDistance = GRAPH_POINT_HIT_RADIUS + 1
    for (const item of compiled) {
      const { expression, row } = item
      if (!row.visible || (expression.kind !== "explicit" && expression.kind !== "implicit")) {
        continue
      }
      const renderedSegments = renderedSegmentsByRow.get(row.id)
      const fallbackSegments =
        expression.kind === "explicit"
          ? sampleExplicitGraphSegments(
              expression.evaluate,
              expression.axis,
              renderedView,
              bounds.width,
              bounds.height
            )
          : []
      if (!renderedSegments && fallbackSegments.length > 0) {
        renderedSegmentsByRow.set(row.id, fallbackSegments)
      }
      const projection = projectPointToGraphSegments(
        renderedSegments ?? fallbackSegments,
        graphPoint,
        renderedView,
        bounds.width,
        bounds.height
      )
      if (projection && projection.distance <= closestDistance) {
        closestCurve = { row, point: projection.point }
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

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    event.preventDefault()
    const point = graphCoordinates(event.clientX, event.clientY)

    if (drag.kind === "trace") {
      const renderedView = fitGraphViewToAspect(view, bounds.width, bounds.height)
      const projection = projectPointToGraphSegments(
        renderedSegmentsByRow.get(drag.rowId) ?? [],
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
      if (!xColumn) {
        return
      }
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
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      drag.moved = true
    }
    setView(panGraphView(drag.view, drag.renderedView, dx, dy, bounds.width, bounds.height))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const completedDrag = dragRef.current
    dragRef.current = null
    if (completedDrag?.kind === "trace" || completedDrag?.kind === "table") {
      setTrace(null)
    }
    setInteracting(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const updateRow = (id: number, patch: Partial<GraphExpressionRow>) => {
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
        color: CALCULATOR_CHART_TOKENS[(id - 1) % CALCULATOR_CHART_TOKENS.length],
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
        color: CALCULATOR_CHART_TOKENS[(variableIndex + 1) % CALCULATOR_CHART_TOKENS.length],
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
      <GraphingSidebar
        compiled={compiled}
        rows={rows}
        tableColumns={tableColumns}
        table={table}
        tableMinimumWidth={tableMinimumWidth}
        tableSeries={tableSeries}
        formatNumber={formatNumber}
        updateRow={updateRow}
        commitRows={commitRows}
        addTableVariable={addTableVariable}
        addTableRow={addTableRow}
        setTable={setTable}
        setTableColumns={setTableColumns}
        removeTableVariable={removeTableVariable}
        updateCell={updateCell}
        addExpression={addExpression}
      />

      <GraphingCanvasViewport
        graphHostRef={graphHostRef}
        canvasRef={canvasRef}
        trace={trace}
        tracePosition={tracePosition}
        handlePointerDown={handlePointerDown}
        handlePointerMove={handlePointerMove}
        handlePointerUp={handlePointerUp}
        formatNumber={formatNumber}
        zoom={zoom}
        setView={setView}
        gridVisible={gridVisible}
        onGridVisibleChange={onGridVisibleChange}
        analysisOpen={analysisOpen}
        setAnalysisOpen={setAnalysisOpen}
        marks={marks}
        setTrace={setTrace}
      />
    </div>
  )
}
