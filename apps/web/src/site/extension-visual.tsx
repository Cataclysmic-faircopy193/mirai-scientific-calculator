import {
  CalculatorExtension,
  type CalculatorExtension as CalculatorExtensionValue,
} from "@/components/mirai-calculator/mirai-calculator"
import {
  GRAPH_AXIS_PATH,
  GRAPH_CURVE_PATH,
  GRAPH_GRID_PATH,
  SCIENTIFIC_PREVIEW_KEYS,
  STATISTICS_PREVIEW_BARS,
} from "@/site/constants/home"
import { calculateStatistics } from "@openmirai/calculator-core/statistics"
import { calculatePercent } from "@openmirai/calculator-core/tools"
import { evaluateExpression } from "@openmirai/calculator-core/engine"

const SCIENTIFIC_RESULT = evaluateExpression("sin(30) + sqrt(81)", {
  angleMode: "degrees",
})
const STATISTICS_RESULT = calculateStatistics([2, 4, 4, 5, 7, 8, 9, 12])
const PERCENT_RESULT = calculatePercent(15, 240)

export function ExtensionVisual({ extension }: { extension: CalculatorExtensionValue }) {
  if (extension === CalculatorExtension.SCIENTIFIC) {
    return (
      <div
        className="grid min-h-44 gap-5 rounded-xl border border-white/10 bg-slate-950 p-5 text-slate-100 shadow-inner"
        aria-hidden="true"
      >
        <div className="flex items-end justify-between gap-4 font-mono">
          <span className="text-xs text-slate-400">sin(30) + √81</span>
          <strong className="text-3xl font-medium text-cyan-300">
            {String(SCIENTIFIC_RESULT)}
          </strong>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {SCIENTIFIC_PREVIEW_KEYS.map((key) => (
            <span
              key={key}
              className="grid aspect-square place-items-center rounded-md border border-white/10 bg-white/5 font-mono text-[10px] text-slate-300"
            >
              {key}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (extension === CalculatorExtension.GRAPHING) {
    return (
      <div
        className="relative min-h-44 overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950 p-3 shadow-inner"
        aria-hidden="true"
      >
        <svg className="h-36 w-full" viewBox="0 0 320 150" role="img">
          <path d={GRAPH_GRID_PATH} fill="none" stroke="rgb(51 65 85)" strokeWidth="1" />
          <path d={GRAPH_AXIS_PATH} fill="none" stroke="rgb(100 116 139)" strokeWidth="1.25" />
          <path
            d={GRAPH_CURVE_PATH}
            fill="none"
            stroke="rgb(34 211 238)"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
        <span className="absolute bottom-3 left-4 font-mono text-xs text-cyan-200">
          y = ax² − 5x + 6
        </span>
      </div>
    )
  }

  if (extension === CalculatorExtension.STATISTICS) {
    return (
      <div
        className="grid min-h-44 grid-rows-[1fr_auto] gap-4 rounded-xl border border-border bg-muted/35 p-4"
        aria-hidden="true"
      >
        <div className="flex items-end gap-2">
          {STATISTICS_PREVIEW_BARS.map((height, index) => (
            <span
              key={`${height}-${index}`}
              className="flex-1 rounded-t-sm bg-cyan-500/80"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 font-mono text-xs">
          <span className="rounded-md border bg-background px-3 py-2">
            mean <strong className="float-right">{STATISTICS_RESULT.mean.toFixed(2)}</strong>
          </span>
          <span className="rounded-md border bg-background px-3 py-2">
            σ{" "}
            <strong className="float-right">
              {STATISTICS_RESULT.populationStandardDeviation.toFixed(2)}
            </strong>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="grid min-h-44 grid-cols-2 gap-3 rounded-xl border border-border bg-muted/35 p-4"
      aria-hidden="true"
    >
      <div className="flex flex-col justify-between rounded-lg border bg-background p-4">
        <span className="font-mono text-xs text-muted-foreground">15% of 240</span>
        <strong className="text-3xl font-medium">{PERCENT_RESULT.portion}</strong>
      </div>
      <div className="flex flex-col justify-between rounded-lg border bg-background p-4">
        <span className="font-mono text-xs text-muted-foreground">18 : 24</span>
        <strong className="text-3xl font-medium">3 : 4</strong>
      </div>
    </div>
  )
}
