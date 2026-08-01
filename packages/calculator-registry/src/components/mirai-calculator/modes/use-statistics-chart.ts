import { useEffect } from "react"

import { readCanvasColor, resolveCanvasColor } from "@/components/mirai-calculator/canvas-theme"
import { CALCULATOR_CHART_TOKENS } from "@/components/mirai-calculator/calculator-ui-config"
import type { StatisticsChartType } from "@/components/mirai-calculator/modes/statistics-config"
import type { DescriptiveStatistics, RegressionResult } from "@openmirai/calculator-core/statistics"
import {
  buildHistogram,
  calculateNumberExtent,
  countNumberFrequencies,
  sampleRegression,
} from "@openmirai/calculator-core/statistics-data"
import type { PairedNumberSeries } from "@openmirai/calculator-core/statistics-data"

interface UseStatisticsChartOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  canvasHostRef: React.RefObject<HTMLDivElement | null>
  chart: StatisticsChartType
  colorScheme: "light" | "dark"
  formatNumber: (value: number) => string
  pairedValues: PairedNumberSeries
  regression: RegressionResult
  statistics: DescriptiveStatistics | null
  xValues: Array<number>
}

/** Draws the selected statistics visualization and redraws it when its host resizes. */
export function useStatisticsChart({
  canvasRef,
  canvasHostRef,
  chart,
  colorScheme,
  formatNumber,
  pairedValues,
  regression,
  statistics,
  xValues,
}: UseStatisticsChartOptions): void {
  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvasHostRef.current
    if (!canvas || !host) {
      return
    }

    const draw = () => {
      const bounds = host.getBoundingClientRect()
      const width = Math.max(1, Math.floor(bounds.width))
      const height = Math.max(1, Math.floor(bounds.height))
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
      const foreground = readCanvasColor(canvas, "--foreground")
      const muted = readCanvasColor(canvas, "--muted-foreground")
      const primary = resolveCanvasColor(canvas, CALCULATOR_CHART_TOKENS[0])
      const secondary = resolveCanvasColor(canvas, CALCULATOR_CHART_TOKENS[1])
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

      const drawAxes = (xRange: [number, number], yRange: [number, number]) => {
        const mapX = (value: number) =>
          padding.left + ((value - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth
        const mapY = (value: number) =>
          padding.top + (1 - (value - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight

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
          context.textAlign = "center"
          context.fillText(formatNumber(xValue), x, height - 14)
          context.textAlign = "right"
          context.fillText(formatNumber(yValue), padding.left - 8, y + 4)
        }
        return { mapX, mapY }
      }

      if (chart === "histogram" && xValues.length > 0) {
        const bins = buildHistogram(xValues)
        const firstBin = bins[0]
        const lastBin = bins.at(-1)
        if (!firstBin || !lastBin) {
          return
        }
        const minimum = firstBin.minimum
        const maximum = lastBin.maximum
        const { mapX, mapY } = drawAxes(
          [minimum, maximum],
          [0, Math.max(...bins.map((bin) => bin.count), 1)]
        )
        context.fillStyle = primary
        bins.forEach((bin) => {
          const x0 = mapX(bin.minimum)
          const x1 = mapX(bin.maximum)
          const y = mapY(bin.count)
          context.fillRect(x0 + 1, y, Math.max(1, x1 - x0 - 2), mapY(0) - y)
        })
      } else if (chart === "box" && statistics) {
        const [minimum, maximum] = calculateNumberExtent(xValues)
        const mapX = (value: number) =>
          padding.left + ((value - minimum) / (maximum - minimum)) * plotWidth
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
          84
        )
        context.strokeStyle = primary
        context.strokeRect(
          mapX(statistics.q1),
          centerY - 42,
          mapX(statistics.q3) - mapX(statistics.q1),
          84
        )
        for (const value of [statistics.min, statistics.median, statistics.max]) {
          context.beginPath()
          context.moveTo(mapX(value), centerY - 48)
          context.lineTo(mapX(value), centerY + 48)
          context.stroke()
          context.fillStyle = muted
          context.fillText(formatNumber(value), mapX(value) - 10, centerY + 68)
        }
      } else if (chart === "dot" && xValues.length > 0) {
        const [minimum, maximum] = calculateNumberExtent(xValues)
        const frequencies = countNumberFrequencies(xValues)
        const maxFrequency = Math.max(...frequencies.map(({ count }) => count))
        const { mapX, mapY } = drawAxes([minimum, maximum], [0, maxFrequency + 1])
        context.fillStyle = primary
        for (const { value, count } of frequencies) {
          for (let index = 1; index <= count; index += 1) {
            context.beginPath()
            context.arc(mapX(value), mapY(index), 5, 0, Math.PI * 2)
            context.fill()
          }
        }
      } else {
        const yPlotValues =
          chart === "residual" && regression.ok ? regression.residuals : pairedValues.y
        const [xmin, xmax] = calculateNumberExtent(pairedValues.x)
        const [ymin, ymax] = calculateNumberExtent(yPlotValues)
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
          sampleRegression(regression.predict, xmin, xmax).forEach(({ x, y }, index) => {
            if (index === 0) {
              context.moveTo(mapX(x), mapY(y))
            } else {
              context.lineTo(mapX(x), mapY(y))
            }
          })
          context.stroke()
        }

        context.fillStyle = primary
        pairedValues.x.forEach((x, index) => {
          const y =
            chart === "residual" && regression.ok
              ? regression.residuals[index]
              : pairedValues.y[index]
          if (!Number.isFinite(y)) {
            return
          }
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
    canvasHostRef,
    canvasRef,
    chart,
    colorScheme,
    formatNumber,
    pairedValues,
    regression,
    statistics,
    xValues,
  ])
}
