import { Grid3X3, Home, LocateFixed, X, ZoomIn, ZoomOut } from "lucide-react"

import { CALCULATOR_CHART_TOKENS } from "@/components/mirai-calculator/calculator-ui-config"
import type {
  GraphMarkCluster,
  GraphTrace,
} from "@/components/mirai-calculator/modes/graphing-state"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DEFAULT_GRAPH_VIEW } from "@openmirai/calculator-core/configuration"
import type { GraphView } from "@openmirai/calculator-core/graphing-view"
import { cn } from "@/lib/utils"

interface GraphTracePosition {
  x: number
  y: number
  labelOnLeft: boolean
  labelBelow: boolean
}

interface GraphingCanvasViewportProps {
  graphHostRef: React.RefObject<HTMLDivElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  trace: GraphTrace | null
  tracePosition: GraphTracePosition | null
  handlePointerDown: React.PointerEventHandler<HTMLCanvasElement>
  handlePointerMove: React.PointerEventHandler<HTMLCanvasElement>
  handlePointerUp: React.PointerEventHandler<HTMLCanvasElement>
  formatNumber: (value: number) => string
  zoom: (factor: number) => void
  setView: (view: GraphView) => void
  gridVisible: boolean
  onGridVisibleChange: (visible: boolean) => void
  analysisOpen: boolean
  setAnalysisOpen: (open: boolean) => void
  marks: Array<GraphMarkCluster>
  setTrace: (trace: GraphTrace | null) => void
}

/** Renders the interactive graph canvas, controls, trace label, and analysis overlay. */
export function GraphingCanvasViewport({
  graphHostRef,
  canvasRef,
  trace,
  tracePosition,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  formatNumber,
  zoom,
  setView,
  gridVisible,
  onGridVisibleChange,
  analysisOpen,
  setAnalysisOpen,
  marks,
  setTrace,
}: GraphingCanvasViewportProps) {
  return (
    <section className="mirai-graphing-canvas relative min-h-0 overflow-hidden overscroll-contain bg-background @max-[699px]:order-1 @max-[699px]:min-h-80">
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
        <Button variant="ghost" size="icon-sm" onClick={() => zoom(1 / 0.7)} aria-label="Zoom out">
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
                    color: mark.colors.at(-1) ?? CALCULATOR_CHART_TOKENS[4],
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
  )
}
