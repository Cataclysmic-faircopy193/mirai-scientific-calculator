import { useCallback, useMemo, useRef, useState } from "react"
import { BarChart3, LineChart } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useStatisticsChart } from "@/components/mirai-calculator/modes/use-statistics-chart"
import {
  STATISTICS_CHART_OPTIONS,
  STATISTICS_REGRESSION_OPTIONS,
} from "@/components/mirai-calculator/modes/statistics-config"
import type { StatisticsChartType } from "@/components/mirai-calculator/modes/statistics-config"
import {
  calculateStatistics,
  correlation,
  covariance,
  fitRegression,
} from "@openmirai/calculator-core/statistics"
import type { RegressionModel } from "@openmirai/calculator-core/statistics"
import {
  pairNumberSeries,
  parseNumberList,
  serializeNumberList,
} from "@openmirai/calculator-core/statistics-data"
import type { StatisticsInitialData } from "@openmirai/calculator-core/statistics-data"
import { cn } from "@/lib/utils"

export interface StatisticsModeProps {
  formatNumber: (value: number) => string
  colorScheme?: "light" | "dark"
  defaultData?: StatisticsInitialData
}

/** Renders descriptive statistics, regression, and distribution tools. */
export function StatisticsMode({
  formatNumber: formatValue,
  colorScheme = "light",
  defaultData,
}: StatisticsModeProps) {
  const [xSource, setXSource] = useState(() => serializeNumberList(defaultData?.xValues))
  const [ySource, setYSource] = useState(() => serializeNumberList(defaultData?.yValues))
  const [chart, setChart] = useState<StatisticsChartType>("scatter")
  const [model, setModel] = useState<RegressionModel>("linear")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const formatNumber = useCallback(
    (value: number) => formatValue(Number.isFinite(value) ? Number(value.toPrecision(8)) : value),
    [formatValue]
  )

  const xValues = useMemo(() => parseNumberList(xSource), [xSource])
  const yValues = useMemo(() => parseNumberList(ySource), [ySource])
  const statistics = useMemo(
    () => (xValues.length ? calculateStatistics(xValues) : null),
    [xValues]
  )
  const regression = useMemo(
    () => fitRegression(xValues, yValues, model),
    [model, xValues, yValues]
  )
  const pairedValues = useMemo(() => pairNumberSeries(xValues, yValues), [xValues, yValues])
  const { correlationValue, covarianceValue } = useMemo(() => {
    try {
      return {
        correlationValue: correlation(pairedValues.x, pairedValues.y),
        covarianceValue: covariance(pairedValues.x, pairedValues.y),
      }
    } catch {
      return { correlationValue: Number.NaN, covarianceValue: Number.NaN }
    }
  }, [pairedValues])
  const residualRows = useMemo(() => {
    const occurrences = new Map<string, number>()
    return regression.residuals.slice(0, 12).map((residual, index) => {
      const x = pairedValues.x[index]
      const y = pairedValues.y[index]
      const signature = `${x}:${y}:${residual}`
      const occurrence = (occurrences.get(signature) ?? 0) + 1
      occurrences.set(signature, occurrence)
      return { key: `${signature}:${occurrence}`, residual, x }
    })
  }, [pairedValues, regression.residuals])

  useStatisticsChart({
    canvasRef,
    canvasHostRef,
    chart,
    colorScheme,
    formatNumber,
    pairedValues,
    regression,
    statistics,
    xValues,
  })

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
    <div className="mirai-statistics-layout grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)] overflow-hidden @max-[699px]:grid-cols-1 @max-[699px]:overflow-y-auto">
      <aside className="mirai-statistics-sidebar min-h-0 border-r bg-muted/25 @max-[699px]:min-h-105 @max-[699px]:border-r-0 @max-[699px]:border-b">
        <ScrollArea className="h-full">
          <div className="space-y-5 p-5">
            <div>
              <h2 className="text-sm font-semibold">Data lists</h2>
              <p className="text-xs text-muted-foreground">
                Separate values with commas, spaces, or new lines.
              </p>
            </div>
            <label
              htmlFor="mirai-statistics-x-values"
              className="block space-y-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              X values
              <Textarea
                id="mirai-statistics-x-values"
                value={xSource}
                onChange={(event) => setXSource(event.target.value)}
                aria-label="X values"
                className="min-h-24 resize-y bg-background font-mono text-sm text-foreground normal-case tracking-normal placeholder:text-muted-foreground"
              />
            </label>
            <label
              htmlFor="mirai-statistics-y-values"
              className="block space-y-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Y values
              <Textarea
                id="mirai-statistics-y-values"
                value={ySource}
                onChange={(event) => setYSource(event.target.value)}
                aria-label="Y values"
                className="min-h-24 resize-y bg-background font-mono text-sm text-foreground normal-case tracking-normal placeholder:text-muted-foreground"
              />
            </label>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Chart
              </h3>
              <div className="flex flex-wrap gap-2">
                {STATISTICS_CHART_OPTIONS.map((item) => (
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
                {STATISTICS_REGRESSION_OPTIONS.map((item) => (
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
                  <div key={parameter.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{parameter.label}</span>
                    <strong className="font-mono">{formatNumber(parameter.value)}</strong>
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
                  <strong className="font-mono">{formatNumber(correlationValue)}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">covariance</span>
                  <strong className="font-mono">{formatNumber(covarianceValue)}</strong>
                </div>
                <p
                  className={cn(
                    "pt-1 text-xs text-muted-foreground",
                    !regression.ok && "text-destructive"
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
                  {residualRows.map((row) => (
                    <div key={row.key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">x = {formatNumber(row.x)}</span>
                      <span className="font-mono">{formatNumber(row.residual)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      <section className="mirai-statistics-results grid min-h-0 grid-rows-[minmax(300px,1fr)_auto] @max-[699px]:min-h-max @max-[699px]:grid-rows-[minmax(260px,1fr)_auto]">
        <div
          ref={canvasHostRef}
          className="mirai-statistics-chart relative min-h-75 @max-[699px]:min-h-65"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 size-full"
            aria-label={`${chart} statistics chart`}
          />
          <Badge className="absolute top-3 right-3 gap-1" variant="secondary">
            {chart === "histogram" || chart === "box" || chart === "dot" ? (
              <BarChart3 className="size-3" />
            ) : (
              <LineChart className="size-3" />
            )}
            {STATISTICS_CHART_OPTIONS.find((item) => item.value === chart)?.label}
          </Badge>
        </div>

        <div className="mirai-statistics-summary max-h-77.5 overflow-auto overscroll-contain border-t bg-muted/25 p-4 @max-[699px]:max-h-none @max-[699px]:overflow-visible">
          <div className="mb-3">
            <div>
              <h3 className="text-sm font-semibold">One-variable statistics · x list</h3>
              <p className="text-xs text-muted-foreground">{xValues.length} valid values parsed</p>
            </div>
          </div>
          <div className="mirai-statistics-grid grid grid-cols-[repeat(auto-fit,minmax(min(165px,100%),1fr))] gap-2 @max-[699px]:grid-cols-2">
            {statRows.map(([label, value]) => (
              <Card key={String(label)} className="min-w-0 gap-1 overflow-hidden py-3">
                <CardContent className="min-w-0 px-3">
                  <div className="min-h-4 wrap-break-word text-xs leading-4 text-muted-foreground">
                    {label}
                  </div>
                  <div
                    className="max-w-full overflow-hidden font-mono text-sm font-semibold text-ellipsis whitespace-nowrap"
                    title={value === null ? "none" : formatNumber(Number(value))}
                  >
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
