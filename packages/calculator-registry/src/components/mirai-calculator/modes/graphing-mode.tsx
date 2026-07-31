import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react"
import { Grid3X3, Home, LocateFixed, Play, Plus, Square, X, ZoomIn, ZoomOut } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CalculatorEngine, type AngleMode } from "@openmirai/calculator-core/engine"
import {
  compileGraphExpression,
  findExtrema,
  findIntersections,
  findRoots,
  type CompiledGraphExpression,
  type GraphPoint,
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
  x: string
  y: string
}

interface GraphMark extends GraphPoint {
  label: string
  color: string
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
}

const COLORS = ["#2a9d90", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"]
const DEFAULT_VIEW: GraphView = { xmin: -8, xmax: 8, ymin: -5, ymax: 7 }
const DEFAULT_ROWS: ExpressionRow[] = [
  {
    id: 1,
    text: "y = a x² − 5x + 6",
    color: COLORS[0],
    visible: true,
  },
  { id: 2, text: "y = 2x + 5", color: COLORS[1], visible: true },
  {
    id: 3,
    text: "a = 1",
    color: "#71717a",
    visible: true,
    slider: { min: -2, max: 3, step: 0.1, value: 1, playing: false },
  },
  { id: 4, text: "x² + y² = 25", color: COLORS[2], visible: false },
  { id: 5, text: "(2, 0), (3, 0)", color: COLORS[3], visible: false },
]
const DEFAULT_TABLE: TableValue[] = [
  { x: "0", y: "3" },
  { x: "1", y: "5.1" },
  { x: "2", y: "6.8" },
  { x: "3", y: "9.2" },
]

function niceStep(span: number): number {
  const rough = span / 10
  const power = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / power
  const factor = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10
  return factor * power
}

function readCanvasColor(element: Element, name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback
  const value = getComputedStyle(element).getPropertyValue(name)
  return value.trim() || fallback
}

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
}: GraphingModeProps) {
  const [rows, setRows] = useState<ExpressionRow[]>(DEFAULT_ROWS)
  const [table, setTable] = useState<TableValue[]>(DEFAULT_TABLE)
  const [trace, setTrace] = useState<(GraphPoint & { color: string }) | null>(null)
  const nextRowId = useRef(6)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphHostRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    view: GraphView
    moved: boolean
  } | null>(null)
  const formatNumber = useCallback(
    (value: number) => formatValue(Number.isFinite(value) ? Number(value.toPrecision(7)) : value),
    [formatValue]
  )

  const setView = (next: GraphView | ((current: GraphView) => GraphView)) => {
    onViewChange(typeof next === "function" ? next(view) : next)
  }

  const variables = useMemo(
    () =>
      Object.fromEntries(
        rows.flatMap((row) => {
          if (!row.slider) return []
          const name = row.text.split("=")[0]?.trim().toLowerCase()
          return /^[a-z]$/.test(name) ? [[name, row.slider.value]] : []
        })
      ),
    [rows]
  )

  useEffect(() => {
    onVariablesChange(variables)
  }, [onVariablesChange, variables])

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

  const tablePoints = useMemo(
    () =>
      table
        .map(({ x, y }) => ({ x: Number(x), y: Number(y) }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
    [table]
  )
  const tableRegression = useMemo(
    () =>
      fitRegression(
        tablePoints.map((point) => point.x),
        tablePoints.map((point) => point.y),
        "linear"
      ),
    [tablePoints]
  )

  const marks = useMemo<GraphMark[]>(() => {
    const visibleFunctions = compiled.filter(
      (
        item
      ): item is {
        row: ExpressionRow
        expression: ExplicitYExpression
      } => item.row.visible && item.expression.kind === "explicit" && item.expression.axis === "y"
    )
    const result: GraphMark[] = []

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
              color: COLORS[4],
            })
          }
        } catch {
          // Ignore an invalid pair while keeping the remaining graph usable.
        }
      }
    }
    return result.slice(0, 50)
  }, [compiled, view.xmax, view.xmin])

  useEffect(() => {
    const canvas = canvasRef.current
    const host = graphHostRef.current
    if (!canvas || !host) return

    const draw = () => {
      const bounds = host.getBoundingClientRect()
      const width = Math.max(320, Math.floor(bounds.width))
      const height = Math.max(300, Math.floor(bounds.height))
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const context = canvas.getContext("2d")
      if (!context) return
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      const background = readCanvasColor(canvas, "--background", "#ffffff")
      const border = readCanvasColor(canvas, "--border", "#e4e4e7")
      const muted = readCanvasColor(canvas, "--muted-foreground", "#71717a")
      const xToCanvas = (x: number) => ((x - view.xmin) / (view.xmax - view.xmin)) * width
      const yToCanvas = (y: number) => height - ((y - view.ymin) / (view.ymax - view.ymin)) * height

      context.clearRect(0, 0, width, height)
      context.fillStyle = background
      context.fillRect(0, 0, width, height)

      if (gridVisible) {
        const xStep = niceStep(view.xmax - view.xmin)
        const yStep = niceStep(view.ymax - view.ymin)
        context.strokeStyle = border
        context.lineWidth = 1
        context.font = "10px system-ui, -apple-system, sans-serif"
        context.fillStyle = muted

        for (let x = Math.ceil(view.xmin / xStep) * xStep; x <= view.xmax; x += xStep) {
          const pixel = xToCanvas(x)
          context.beginPath()
          context.moveTo(pixel, 0)
          context.lineTo(pixel, height)
          context.stroke()
          if (Math.abs(x) > 1e-10) {
            context.fillText(formatNumber(x), pixel + 4, yToCanvas(0) + 12)
          }
        }
        for (let y = Math.ceil(view.ymin / yStep) * yStep; y <= view.ymax; y += yStep) {
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
      if (view.ymin <= 0 && view.ymax >= 0) {
        context.beginPath()
        context.moveTo(0, yToCanvas(0))
        context.lineTo(width, yToCanvas(0))
        context.stroke()
      }
      if (view.xmin <= 0 && view.xmax >= 0) {
        context.beginPath()
        context.moveTo(xToCanvas(0), 0)
        context.lineTo(xToCanvas(0), height)
        context.stroke()
      }

      for (const { row, expression } of compiled) {
        if (!row.visible || expression.kind === "invalid") continue
        context.strokeStyle = row.color
        context.fillStyle = row.color
        context.lineWidth = 2.2

        if (expression.kind === "explicit") {
          const count = expression.axis === "y" ? width : height
          let drawing = false
          context.beginPath()
          for (let pixel = 0; pixel <= count; pixel += 1) {
            const input =
              expression.axis === "y"
                ? view.xmin + (pixel / width) * (view.xmax - view.xmin)
                : view.ymax - (pixel / height) * (view.ymax - view.ymin)
            try {
              const output = expression.evaluate(input)
              const canvasX = expression.axis === "y" ? pixel : xToCanvas(output)
              const canvasY = expression.axis === "y" ? yToCanvas(output) : pixel
              const valid =
                Number.isFinite(output) &&
                canvasX > -height * 3 &&
                canvasX < width + height * 3 &&
                canvasY > -height * 3 &&
                canvasY < height * 4
              if (!valid) {
                drawing = false
                continue
              }
              if (!drawing) {
                context.moveTo(canvasX, canvasY)
                drawing = true
              } else {
                context.lineTo(canvasX, canvasY)
              }
            } catch {
              drawing = false
            }
          }
          context.stroke()
        } else if (expression.kind === "points") {
          for (const point of expression.points) {
            context.beginPath()
            context.arc(xToCanvas(point.x), yToCanvas(point.y), 4.5, 0, Math.PI * 2)
            context.fill()
          }
        } else if (expression.kind === "implicit") {
          const columns = 90
          const rowsCount = 65
          const cellWidth = width / columns
          const cellHeight = height / rowsCount
          for (let column = 0; column < columns; column += 1) {
            for (let rowIndex = 0; rowIndex < rowsCount; rowIndex += 1) {
              const x0 = view.xmin + (column / columns) * (view.xmax - view.xmin)
              const x1 = view.xmin + ((column + 1) / columns) * (view.xmax - view.xmin)
              const y0 = view.ymax - (rowIndex / rowsCount) * (view.ymax - view.ymin)
              const y1 = view.ymax - ((rowIndex + 1) / rowsCount) * (view.ymax - view.ymin)
              try {
                const values = [
                  expression.residual(x0, y0),
                  expression.residual(x1, y0),
                  expression.residual(x1, y1),
                  expression.residual(x0, y1),
                ]
                if (values.every((value) => value >= 0) || values.every((value) => value < 0)) {
                  continue
                }
                context.beginPath()
                context.moveTo(column * cellWidth, (rowIndex + 0.5) * cellHeight)
                context.lineTo((column + 1) * cellWidth, (rowIndex + 0.5) * cellHeight)
                context.stroke()
              } catch {
                // Skip cells outside the expression domain.
              }
            }
          }
        }
      }

      context.fillStyle = COLORS[2]
      for (const point of tablePoints) {
        context.beginPath()
        context.arc(xToCanvas(point.x), yToCanvas(point.y), 4.5, 0, Math.PI * 2)
        context.fill()
      }

      for (const mark of marks) {
        context.fillStyle = background
        context.strokeStyle = mark.color
        context.lineWidth = 2
        context.beginPath()
        context.arc(xToCanvas(mark.x), yToCanvas(mark.y), 5, 0, Math.PI * 2)
        context.fill()
        context.stroke()
      }

      if (trace) {
        context.fillStyle = trace.color
        context.beginPath()
        context.arc(xToCanvas(trace.x), yToCanvas(trace.y), 6, 0, Math.PI * 2)
        context.fill()
      }
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(host)
    return () => observer.disconnect()
  }, [colorScheme, compiled, formatNumber, gridVisible, marks, tablePoints, trace, view])

  useEffect(() => {
    const timers = rows
      .filter((row) => row.slider?.playing)
      .map((row) =>
        window.setInterval(() => {
          setRows((currentRows) =>
            currentRows.map((current) => {
              if (current.id !== row.id || !current.slider) return current
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
      )
    return () => timers.forEach(window.clearInterval)
  }, [rows])

  const zoom = (factor: number) => {
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
  }

  const graphCoordinates = (clientX: number, clientY: number): GraphPoint => {
    const bounds = canvasRef.current!.getBoundingClientRect()
    return {
      x: view.xmin + ((clientX - bounds.left) / bounds.width) * (view.xmax - view.xmin),
      y: view.ymax - ((clientY - bounds.top) / bounds.height) * (view.ymax - view.ymin),
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      view,
      moved: false,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
    const xShift = (dx / bounds.width) * (drag.view.xmax - drag.view.xmin)
    const yShift = (dy / bounds.height) * (drag.view.ymax - drag.view.ymin)
    setView({
      xmin: drag.view.xmin - xShift,
      xmax: drag.view.xmax - xShift,
      ymin: drag.view.ymin + yShift,
      ymax: drag.view.ymax + yShift,
    })
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || drag.moved) return
    const point = graphCoordinates(event.clientX, event.clientY)
    const firstFunction = compiled.find(
      (
        item
      ): item is {
        row: ExpressionRow
        expression: ExplicitYExpression
      } => item.row.visible && item.expression.kind === "explicit" && item.expression.axis === "y"
    )
    if (!firstFunction) return
    try {
      const y = firstFunction.expression.evaluate(point.x)
      if (Number.isFinite(y)) {
        setTrace({ x: point.x, y, color: firstFunction.row.color })
      }
    } catch {
      setTrace(null)
    }
  }

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    zoom(event.deltaY > 0 ? 1.12 : 1 / 1.12)
  }

  const updateRow = (id: number, patch: Partial<ExpressionRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addExpression = () => {
    const id = nextRowId.current
    nextRowId.current += 1
    setRows((current) => [
      ...current,
      {
        id,
        text: "",
        color: COLORS[(id - 1) % COLORS.length],
        visible: true,
      },
    ])
  }

  const updateCell = (index: number, key: keyof TableValue, value: string) => {
    setTable((current) =>
      current.map((row, currentIndex) => (currentIndex === index ? { ...row, [key]: value } : row))
    )
  }

  return (
    <div className="mirai-graphing-layout grid min-h-0 flex-1 overflow-hidden">
      <aside className="mirai-graphing-sidebar flex min-h-0 flex-col bg-card">
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
                        setRows((current) => current.filter((item) => item.id !== row.id))
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
              <div className="mb-3 flex items-center gap-2">
                <span className="size-3 rounded-sm border-2 border-amber-500 bg-amber-500/10" />
                <h3 className="text-sm font-semibold">Table 1</h3>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTable((current) => [...current, { x: "", y: "" }])}
                  className="h-7 rounded-md text-xs"
                >
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
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px] items-center gap-1.5">
                <span className="px-2 text-xs font-semibold text-muted-foreground">x₁</span>
                <span className="px-2 text-xs font-semibold text-muted-foreground">y₁</span>
                <span />
                {table.map((row, index) => (
                  <div className="contents" key={index}>
                    <Input
                      value={row.x}
                      onChange={(event) => updateCell(index, "x", event.target.value)}
                      aria-label={`Table x value ${index + 1}`}
                      className="h-[30px] rounded-md px-2 font-mono text-sm"
                    />
                    <Input
                      value={row.y}
                      onChange={(event) => updateCell(index, "y", event.target.value)}
                      aria-label={`Table y value ${index + 1}`}
                      className="h-[30px] rounded-md px-2 font-mono text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setTable((current) =>
                          current.filter((_, currentIndex) => currentIndex !== index)
                        )
                      }
                      aria-label={`Remove table row ${index + 1}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="p-3">
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold">Regression</h3>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  y₁ ~ mx₁ + b
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["m", tableRegression.params[1]?.value],
                  ["b", tableRegression.params[0]?.value],
                  ["R²", tableRegression.r2],
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
            onClick={() => setRows([])}
            className="rounded-md text-muted-foreground hover:text-destructive"
          >
            Clear all
          </Button>
        </div>
      </aside>

      <section className="mirai-graphing-canvas relative min-h-0 overflow-hidden bg-background">
        <div ref={graphHostRef} className="absolute inset-0" aria-label="Interactive graph">
          <canvas
            ref={canvasRef}
            className="size-full touch-none cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          />
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
            onClick={() => setView(DEFAULT_VIEW)}
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

        <div className="absolute right-3 bottom-3 max-h-[48%] w-[min(300px,calc(100%-1.5rem))] overflow-auto rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <LocateFixed className="size-3.5 text-primary" />
              Analysis
            </h3>
            {trace && (
              <Button variant="ghost" size="sm" onClick={() => setTrace(null)}>
                Clear trace
              </Button>
            )}
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
                key={`${mark.label}-${mark.x}-${index}`}
                onClick={() => setTrace({ x: mark.x, y: mark.y, color: mark.color })}
                className="h-auto w-full justify-between px-2 py-1.5 text-xs"
              >
                <span className="capitalize">{mark.label}</span>
                <span className="font-mono text-muted-foreground">
                  ({formatNumber(mark.x)}, {formatNumber(mark.y)})
                </span>
              </Button>
            ))}
            {marks.length === 0 && !trace && (
              <p className="py-2 text-xs text-muted-foreground">
                Click the graph to trace a curve. Zeros, extrema, and intersections appear here.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
