import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BarChart3, LineChart, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  calculateStatistics,
  correlation,
  covariance,
  fitRegression,
  parseNumberList,
  type RegressionModel,
} from "@/lib/statistics"
import { cn } from "@/lib/utils"

type ChartType = "scatter" | "histogram" | "box" | "dot" | "residual"

export interface StatisticsModeProps {
  formatNumber: (value: number) => string
  colorScheme?: "light" | "dark"
}

const DEFAULT_X = "2, 4, 4, 5, 7, 8, 9, 12, 12, 15"
const DEFAULT_Y = "5.1, 8.9, 9.4, 11.2, 15.1, 17.3, 18.8, 25.2, 24.6, 30.4"
const CHARTS: Array<{ value: ChartType; label: string }> = [
  { value: "scatter", label: "Scatter" },
  { value: "histogram", label: "Histogram" },
  { value: "box", label: "Box plot" },
  { value: "dot", label: "Dot plot" },
  { value: "residual", label: "Residuals" },
]
const MODELS: Array<{ value: RegressionModel; label: string }> = [
  { value: "linear", label: "Linear" },
  { value: "quadratic", label: "Quadratic" },
  { value: "cubic", label: "Cubic" },
  { value: "exponential", label: "Exponential" },
  { value: "logarithmic", label: "Logarithmic" },
  { value: "power", label: "Power" },
]

function canvasColor(element: Element, name: string, fallback: string) {
  if (typeof window === "undefined") return fallback
  return (
    getComputedStyle(element).getPropertyValue(name).trim() ||
    fallback
  )
}

function extent(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1]
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  if (minimum === maximum) return [minimum - 1, maximum + 1]
  const padding = (maximum - minimum) * 0.1
  return [minimum - padding, maximum + padding]
}

export function StatisticsMode({
  formatNumber: formatValue,
  colorScheme = "light",
}: StatisticsModeProps) {
  const [xSource, setXSource] = useState(DEFAULT_X)
  const [ySource, setYSource] = useState(DEFAULT_Y)
  const [chart, setChart] = useState<ChartType>("scatter")
  const [model, setModel] = useState<RegressionModel>("linear")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const formatNumber = useCallback(
    (value: number) =>
      formatValue(
        Number.isFinite(value) ? Number(value.toPrecision(8)) : value,
      ),
    [formatValue],
  )

  const xValues = useMemo(() => parseNumberList(xSource), [xSource])
  const yValues = useMemo(() => parseNumberList(ySource), [ySource])
  const statistics = useMemo(
    () => (xValues.length ? calculateStatistics(xValues) : null),
    [xValues],
  )
  const regression = useMemo(
    () => fitRegression(xValues, yValues, model),
    [model, xValues, yValues],
  )
  const pairCount = Math.min(xValues.length, yValues.length)
  const pairedX = xValues.slice(0, pairCount)
  const pairedY = yValues.slice(0, pairCount)

  const correlationValue = useMemo(() => {
    try {
      return correlation(pairedX, pairedY)
    } catch {
      return Number.NaN
    }
  }, [pairedX, pairedY])
  const covarianceValue = useMemo(() => {
    try {
      return covariance(pairedX, pairedY)
    } catch {
      return Number.NaN
    }
  }, [pairedX, pairedY])

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvasHostRef.current
    if (!canvas || !host) return

    const draw = () => {
      const bounds = host.getBoundingClientRect()
      const width = Math.max(320, Math.floor(bounds.width))
      const height = Math.max(260, Math.floor(bounds.height))
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const context = canvas.getContext("2d")
      if (!context) return
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      const background = canvasColor(canvas, "--background", "#ffffff")
      const border = canvasColor(canvas, "--border", "#e4e4e7")
      const foreground = canvasColor(canvas, "--foreground", "#18181b")
      const muted = canvasColor(canvas, "--muted-foreground", "#71717a")
      const primary = "#2a9d90"
      const secondary = "#3b82f6"
      const padding = { top: 28, right: 28, bottom: 38, left: 48 }
      const plotWidth = width - padding.left - padding.right
      const plotHeight = height - padding.top - padding.bottom

      context.clearRect(0, 0, width, height)
      context.fillStyle = background
      context.fillRect(0, 0, width, height)
      context.font = "11px system-ui, -apple-system, sans-serif"
      context.fillStyle = muted
      context.strokeStyle = border
      context.lineWidth = 1

      const drawAxes = (
        xRange: [number, number],
        yRange: [number, number],
      ) => {
        const mapX = (value: number) =>
          padding.left +
          ((value - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth
        const mapY = (value: number) =>
          padding.top +
          (1 - (value - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight

        for (let index = 0; index <= 5; index += 1) {
          const x = padding.left + (index / 5) * plotWidth
          const y = padding.top + (index / 5) * plotHeight
          context.strokeStyle = border
          context.beginPath()
          context.moveTo(x, padding.top)
          context.lineTo(x, padding.top + plotHeight)
          context.stroke()
          context.beginPath()
          context.moveTo(padding.left, y)
          context.lineTo(padding.left + plotWidth, y)
          context.stroke()
          context.fillStyle = muted
          const xValue = xRange[0] + (index / 5) * (xRange[1] - xRange[0])
          const yValue = yRange[1] - (index / 5) * (yRange[1] - yRange[0])
          context.fillText(formatNumber(xValue), x - 8, height - 14)
          context.fillText(formatNumber(yValue), 6, y + 4)
        }
        return { mapX, mapY }
      }

      if (chart === "histogram" && xValues.length > 0) {
        const [minimum, maximum] = extent(xValues)
        const binCount = Math.max(4, Math.ceil(Math.sqrt(xValues.length)))
        const binWidth = (maximum - minimum) / binCount
        const bins = Array.from({ length: binCount }, () => 0)
        for (const value of xValues) {
          const index = Math.min(
            binCount - 1,
            Math.max(0, Math.floor((value - minimum) / binWidth)),
          )
          bins[index] += 1
        }
        const { mapX, mapY } = drawAxes(
          [minimum, maximum],
          [0, Math.max(...bins, 1)],
        )
        context.fillStyle = primary
        bins.forEach((count, index) => {
          const x0 = mapX(minimum + index * binWidth)
          const x1 = mapX(minimum + (index + 1) * binWidth)
          const y = mapY(count)
          context.fillRect(x0 + 1, y, Math.max(1, x1 - x0 - 2), mapY(0) - y)
        })
      } else if (chart === "box" && statistics) {
        const [minimum, maximum] = extent(xValues)
        const mapX = (value: number) =>
          padding.left +
          ((value - minimum) / (maximum - minimum)) * plotWidth
        const centerY = padding.top + plotHeight / 2
        context.strokeStyle = foreground
        context.lineWidth = 2
        context.beginPath()
        context.moveTo(mapX(statistics.min), centerY)
        context.lineTo(mapX(statistics.q1), centerY)
        context.moveTo(mapX(statistics.q3), centerY)
        context.lineTo(mapX(statistics.max), centerY)
        context.stroke()
        context.fillStyle = `${primary}33`
        context.fillRect(
          mapX(statistics.q1),
          centerY - 42,
          mapX(statistics.q3) - mapX(statistics.q1),
          84,
        )
        context.strokeStyle = primary
        context.strokeRect(
          mapX(statistics.q1),
          centerY - 42,
          mapX(statistics.q3) - mapX(statistics.q1),
          84,
        )
        for (const value of [
          statistics.min,
          statistics.median,
          statistics.max,
        ]) {
          context.beginPath()
          context.moveTo(mapX(value), centerY - 48)
          context.lineTo(mapX(value), centerY + 48)
          context.stroke()
          context.fillStyle = muted
          context.fillText(formatNumber(value), mapX(value) - 10, centerY + 68)
        }
      } else if (chart === "dot" && xValues.length > 0) {
        const [minimum, maximum] = extent(xValues)
        const frequencies = new Map<number, number>()
        for (const value of xValues) {
          frequencies.set(value, (frequencies.get(value) ?? 0) + 1)
        }
        const maxFrequency = Math.max(...frequencies.values())
        const { mapX, mapY } = drawAxes(
          [minimum, maximum],
          [0, maxFrequency + 1],
        )
        context.fillStyle = primary
        for (const [value, count] of frequencies) {
          for (let index = 1; index <= count; index += 1) {
            context.beginPath()
            context.arc(mapX(value), mapY(index), 5, 0, Math.PI * 2)
            context.fill()
          }
        }
      } else {
        const yPlotValues =
          chart === "residual" && regression.ok
            ? regression.residuals
            : pairedY
        const [xmin, xmax] = extent(pairedX)
        const [ymin, ymax] = extent(yPlotValues)
        const { mapX, mapY } = drawAxes([xmin, xmax], [ymin, ymax])
        if (chart === "residual") {
          context.strokeStyle = muted
          context.setLineDash([5, 4])
          context.beginPath()
          context.moveTo(mapX(xmin), mapY(0))
          context.lineTo(mapX(xmax), mapY(0))
          context.stroke()
          context.setLineDash([])
        } else if (regression.ok) {
          context.strokeStyle = secondary
          context.lineWidth = 2
          context.beginPath()
          for (let index = 0; index <= 240; index += 1) {
            const x = xmin + (index / 240) * (xmax - xmin)
            const y = regression.predict(x)
            if (!Number.isFinite(y)) continue
            if (index === 0) context.moveTo(mapX(x), mapY(y))
            else context.lineTo(mapX(x), mapY(y))
          }
          context.stroke()
        }

        context.fillStyle = primary
        pairedX.forEach((x, index) => {
          const y =
            chart === "residual" && regression.ok
              ? regression.residuals[index]
              : pairedY[index]
          if (!Number.isFinite(y)) return
          context.beginPath()
          context.arc(mapX(x), mapY(y), 4.5, 0, Math.PI * 2)
          context.fill()
        })
      }
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(host)
    return () => observer.disconnect()
  }, [
    chart,
    colorScheme,
    formatNumber,
    pairedX,
    pairedY,
    regression,
    statistics,
    xValues,
  ])

  const statRows = statistics
    ? [
        ["n", statistics.n],
        ["Sum", statistics.sum],
        ["Mean", statistics.mean],
        ["Median", statistics.median],
        ["Mode", statistics.mode],
        ["Min", statistics.min],
        ["Q1", statistics.q1],
        ["Q3", statistics.q3],
        ["Max", statistics.max],
        ["Range", statistics.range],
        ["IQR", statistics.iqr],
        ["σ (population)", statistics.populationStandardDeviation],
        ["s (sample)", statistics.sampleStandardDeviation],
        ["σ²", statistics.populationVariance],
        ["s²", statistics.sampleVariance],
      ]
    : []

  return (
    <div className="mirai-statistics-layout grid min-h-0 flex-1 overflow-hidden">
      <aside className="mirai-statistics-sidebar min-h-0 bg-muted/25">
        <ScrollArea className="h-full">
          <div className="space-y-5 p-5">
            <div>
              <h2 className="text-sm font-semibold">Data lists</h2>
              <p className="text-xs text-muted-foreground">
                Separate values with commas, spaces, or new lines.
              </p>
            </div>
            <label className="block space-y-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              X values
              <Textarea
                value={xSource}
                onChange={(event) => setXSource(event.target.value)}
                aria-label="X values"
                className="min-h-24 resize-y bg-background font-mono text-sm normal-case tracking-normal"
              />
            </label>
            <label className="block space-y-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Y values
              <Textarea
                value={ySource}
                onChange={(event) => setYSource(event.target.value)}
                aria-label="Y values"
                className="min-h-24 resize-y bg-background font-mono text-sm normal-case tracking-normal"
              />
            </label>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Chart
              </h3>
              <div className="flex flex-wrap gap-2">
                {CHARTS.map((item) => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant={chart === item.value ? "default" : "outline"}
                    onClick={() => setChart(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Regression model
              </h3>
              <div className="flex flex-wrap gap-2">
                {MODELS.map((item) => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant={model === item.value ? "default" : "outline"}
                    onClick={() => setModel(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  Model fit
                  <Badge variant={regression.ok ? "default" : "secondary"}>
                    {regression.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {regression.params.map((parameter) => (
                  <div
                    key={parameter.label}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {parameter.label}
                    </span>
                    <strong className="font-mono">
                      {formatNumber(parameter.value)}
                    </strong>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">R²</span>
                  <strong className="font-mono text-primary">
                    {regression.ok ? formatNumber(regression.r2) : "—"}
                  </strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">r</span>
                  <strong className="font-mono">
                    {formatNumber(correlationValue)}
                  </strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">covariance</span>
                  <strong className="font-mono">
                    {formatNumber(covarianceValue)}
                  </strong>
                </div>
                <p
                  className={cn(
                    "pt-1 text-xs text-muted-foreground",
                    !regression.ok && "text-destructive",
                  )}
                >
                  {regression.message}
                </p>
              </CardContent>
            </Card>

            {regression.ok && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Residuals
                </h3>
                <div className="space-y-1">
                  {regression.residuals.slice(0, 12).map((residual, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-muted-foreground">
                        x = {formatNumber(pairedX[index])}
                      </span>
                      <span className="font-mono">
                        {formatNumber(residual)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      <section className="mirai-statistics-results grid min-h-0 grid-rows-[minmax(220px,1fr)_auto]">
        <div ref={canvasHostRef} className="relative min-h-[300px]">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 size-full"
            aria-label={`${chart} statistics chart`}
          />
          <Badge className="absolute top-3 left-3 gap-1" variant="secondary">
            {chart === "histogram" || chart === "box" || chart === "dot" ? (
              <BarChart3 className="size-3" />
            ) : (
              <LineChart className="size-3" />
            )}
            {CHARTS.find((item) => item.value === chart)?.label}
          </Badge>
        </div>

        <div className="max-h-[310px] overflow-auto border-t bg-muted/25 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">
                One-variable statistics · x list
              </h3>
              <p className="text-xs text-muted-foreground">
                {xValues.length} valid values parsed
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="size-3" />
              Live results
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {statRows.map(([label, value]) => (
              <Card key={String(label)} className="gap-1 py-3">
                <CardContent className="px-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="truncate font-mono text-sm font-semibold">
                    {value === null ? "none" : formatNumber(Number(value))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
