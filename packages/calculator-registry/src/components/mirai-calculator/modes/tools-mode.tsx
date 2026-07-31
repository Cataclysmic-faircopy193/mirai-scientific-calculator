import { useMemo, useState } from "react"
import { CirclePercent, DraftingCompass, MoveDiagonal2, Ratio } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  calculateCoordinates,
  calculatePercent,
  calculateRatio,
  calculateShapes,
} from "@openmirai/calculator-core/tools"

export interface ToolsModeProps {
  formatNumber: (value: number) => string
}

function numeric(value: string, fallback = 0) {
  const result = Number(value.replace(/,/g, ""))
  return Number.isFinite(result) ? result : fallback
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <strong className="text-right font-mono">{value}</strong>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="min-w-0 space-y-1.5 text-xs text-muted-foreground">
      {label}
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        className="bg-background font-mono text-sm text-foreground"
        aria-label={label}
      />
    </label>
  )
}

export function ToolsMode({ formatNumber: formatValue }: ToolsModeProps) {
  const [percent, setPercent] = useState("15")
  const [percentOf, setPercentOf] = useState("240")
  const [ratioLeft, setRatioLeft] = useState("18")
  const [ratioRight, setRatioRight] = useState("24")
  const [ratioScale, setRatioScale] = useState("3")
  const [x1, setX1] = useState("-2")
  const [y1, setY1] = useState("1")
  const [x2, setX2] = useState("4")
  const [y2, setY2] = useState("9")
  const [radius, setRadius] = useState("5")
  const [base, setBase] = useState("12")
  const [height, setHeight] = useState("7")
  const [depth, setDepth] = useState("4")
  const formatNumber = (value: number) =>
    formatValue(Number.isFinite(value) ? Number(value.toPrecision(8)) : value)

  const percentResults = useMemo(
    () => calculatePercent(numeric(percent), numeric(percentOf)),
    [percent, percentOf]
  )
  const ratioResults = useMemo(
    () => calculateRatio(numeric(ratioLeft), numeric(ratioRight), numeric(ratioScale, 1)),
    [ratioLeft, ratioRight, ratioScale]
  )
  const coordinateResults = useMemo(
    () => calculateCoordinates(numeric(x1), numeric(y1), numeric(x2), numeric(y2)),
    [x1, x2, y1, y2]
  )
  const shapeResults = useMemo(
    () => calculateShapes(numeric(radius), numeric(base), numeric(height), numeric(depth)),
    [base, depth, height, radius]
  )

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-muted/25 p-4 sm:p-6">
      <div className="mirai-tools-grid grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CirclePercent className="size-4 text-primary" />
              Percent
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Numbers in, numbers out—no worked steps.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Percent" value={percent} onChange={setPercent} />
              <NumberField label="Of value" value={percentOf} onChange={setPercentOf} />
            </div>
            <div className="space-y-2 rounded-lg bg-muted p-3">
              <ResultRow label="Percent of value" value={formatNumber(percentResults.portion)} />
              <ResultRow label="Increased by" value={formatNumber(percentResults.increased)} />
              <ResultRow label="Decreased by" value={formatNumber(percentResults.decreased)} />
              <ResultRow
                label="Original before increase"
                value={formatNumber(percentResults.originalBeforeIncrease)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ratio className="size-4 text-primary" />
              Ratio and proportion
            </CardTitle>
            <p className="text-xs text-muted-foreground">Simplify, scale, and check equivalence.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="a" value={ratioLeft} onChange={setRatioLeft} />
              <NumberField label="b" value={ratioRight} onChange={setRatioRight} />
              <NumberField label="Scale" value={ratioScale} onChange={setRatioScale} />
            </div>
            <div className="space-y-2 rounded-lg bg-muted p-3">
              <ResultRow
                label="Simplified"
                value={`${formatNumber(ratioResults.simplifiedLeft)} : ${formatNumber(ratioResults.simplifiedRight)}`}
              />
              <ResultRow
                label="Scaled"
                value={`${formatNumber(ratioResults.scaledLeft)} : ${formatNumber(ratioResults.scaledRight)}`}
              />
              <ResultRow label="As decimal" value={formatNumber(ratioResults.decimal)} />
              <ResultRow
                label="gcd · lcm"
                value={`${formatNumber(ratioResults.gcd)} · ${formatNumber(ratioResults.lcm)}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MoveDiagonal2 className="size-4 text-primary" />
              Coordinate geometry
            </CardTitle>
            <p className="text-xs text-muted-foreground">Two points in, distance and slope out.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <NumberField label="x₁" value={x1} onChange={setX1} />
              <NumberField label="y₁" value={y1} onChange={setY1} />
              <NumberField label="x₂" value={x2} onChange={setX2} />
              <NumberField label="y₂" value={y2} onChange={setY2} />
            </div>
            <div className="space-y-2 rounded-lg bg-muted p-3">
              <ResultRow label="Distance" value={formatNumber(coordinateResults.distance)} />
              <ResultRow
                label="Midpoint"
                value={`(${formatNumber(coordinateResults.midpoint[0])}, ${formatNumber(coordinateResults.midpoint[1])})`}
              />
              <ResultRow
                label="Slope"
                value={
                  coordinateResults.slope === null
                    ? "undefined"
                    : formatNumber(coordinateResults.slope)
                }
              />
              <ResultRow
                label="Line through points"
                value={
                  coordinateResults.slope === null
                    ? `x = ${formatNumber(numeric(x1))}`
                    : `y = ${formatNumber(coordinateResults.slope)}x ${coordinateResults.intercept! < 0 ? "−" : "+"} ${formatNumber(Math.abs(coordinateResults.intercept!))}`
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mirai-tools-wide">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DraftingCompass className="size-4 text-primary" />
              Shape measures
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Enter dimensions and the results update as you type.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <NumberField label="Radius r" value={radius} onChange={setRadius} />
              <NumberField label="Base b" value={base} onChange={setBase} />
              <NumberField label="Height h" value={height} onChange={setHeight} />
              <NumberField label="Depth d" value={depth} onChange={setDepth} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Circle area", shapeResults.circleArea],
                ["Circumference", shapeResults.circumference],
                ["Triangle area", shapeResults.triangleArea],
                ["Prism volume", shapeResults.prismVolume],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-muted p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="font-mono text-base font-semibold">
                    {formatValue(
                      Number.isFinite(Number(value))
                        ? Number(Number(value).toPrecision(6))
                        : Number(value)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mirai-tools-wide border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-primary">Practice tip</p>
            <p className="mt-1 text-sm text-muted-foreground">
              These helpers perform arithmetic only. They do not factor, solve, or explain a
              question, keeping the workflow appropriate for timed practice.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
