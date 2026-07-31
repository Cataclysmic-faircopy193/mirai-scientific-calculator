import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import {
  Calculator as CalculatorIcon,
  EyeOff,
  Expand,
  Minimize2,
  Moon,
  Settings2,
  Sun,
  X,
} from "lucide-react"

import openMiraiLogo from "@/assets/openmirai-logo-black.svg"
import { GraphingMode } from "@/components/calculator/graphing-mode"
import { ScientificMode } from "@/components/calculator/scientific-mode"
import { StatisticsMode } from "@/components/calculator/statistics-mode"
import { ToolsMode } from "@/components/calculator/tools-mode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  CalculatorEngine,
  type AngleMode,
  type NumberFormatOptions,
} from "@/lib/calculator-engine"
import type { GraphView } from "@/lib/graphing"
import { cn } from "@/lib/utils"

export type CalculatorMode = "scientific" | "graphing" | "statistics" | "tools"
export type CalculatorTheme = "light" | "dark" | "system"

export interface MiraiCalculatorProps {
  className?: string
  style?: CSSProperties
  height?: number | string
  mode?: CalculatorMode
  defaultMode?: CalculatorMode
  onModeChange?: (mode: CalculatorMode) => void
  angleMode?: AngleMode
  defaultAngleMode?: AngleMode
  onAngleModeChange?: (mode: AngleMode) => void
  theme?: CalculatorTheme
  defaultTheme?: CalculatorTheme
  onThemeChange?: (theme: CalculatorTheme) => void
  hidden?: boolean
  defaultHidden?: boolean
  onHiddenChange?: (hidden: boolean) => void
  startFullscreen?: boolean
  showBackdrop?: boolean
  title?: string
  onClose?: () => void
}

interface DisplaySettings {
  notation: "auto" | "scientific"
  decimals: number | "auto"
  significantFigures: number
  thousandsSeparator: boolean
}

interface PanelGeometry {
  x: number
  y: number
  width: number
  height: number
}

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  notation: "auto",
  decimals: "auto",
  significantFigures: 12,
  thousandsSeparator: true,
}
const DEFAULT_GRAPH_VIEW: GraphView = {
  xmin: -8,
  xmax: 8,
  ymin: -5,
  ymax: 7,
}
const DEFAULT_DEFINITIONS = ["f(x) = 2x + 5", "g(x) = x² − 3x + 2"]
const MIN_PANEL_WIDTH = 720
const MIN_PANEL_HEIGHT = 460

const MODES: Array<{ value: CalculatorMode; label: string }> = [
  { value: "scientific", label: "Scientific" },
  { value: "graphing", label: "Graphing" },
  { value: "statistics", label: "Stats" },
  { value: "tools", label: "Tools" },
]

function PracticeBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex flex-col overflow-hidden bg-zinc-100 text-zinc-950"
    >
      <div className="flex h-14 items-center border-b border-zinc-200 bg-white px-6">
        <img
          src={openMiraiLogo}
          alt="OpenMirai"
          className="h-6 w-auto"
        />
        <span className="ml-auto font-mono text-sm font-semibold">21:47</span>
      </div>
      <div className="grid flex-1 grid-cols-2 opacity-45">
        <div className="border-r border-zinc-200 p-12 text-base leading-7">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Question 14 of 22
          </p>
          The function h is defined by h(x) = x² − 5x + 6. For what values of
          x does the graph of h cross the x-axis?
        </div>
        <div className="space-y-3 p-12">
          {["−2 and −3", "2 and 3", "5 and 6", "1 and 6"].map(
            (answer, index) => (
              <div
                key={answer}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm"
              >
                {String.fromCharCode(65 + index)}. {answer}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

function HeaderIconButton({
  label,
  children,
  onClick,
}: {
  label: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={onClick}
          aria-label={label}
          className="size-[30px] rounded-md"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function MiraiCalculator({
  className,
  style,
  height = 660,
  mode,
  defaultMode = "scientific",
  onModeChange,
  angleMode,
  defaultAngleMode = "degrees",
  onAngleModeChange,
  theme,
  defaultTheme = "light",
  onThemeChange,
  hidden,
  defaultHidden = false,
  onHiddenChange,
  startFullscreen = false,
  showBackdrop = false,
  title = "Calculator",
  onClose,
}: MiraiCalculatorProps) {
  const [internalMode, setInternalMode] = useState(defaultMode)
  const [internalAngleMode, setInternalAngleMode] = useState(defaultAngleMode)
  const [internalTheme, setInternalTheme] = useState(defaultTheme)
  const [internalHidden, setInternalHidden] = useState(defaultHidden)
  const [systemDark, setSystemDark] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-color-scheme: dark)").matches,
  )
  const [fullscreen, setFullscreen] = useState(startFullscreen)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(
    DEFAULT_DISPLAY_SETTINGS,
  )
  const [graphView, setGraphView] = useState<GraphView>(DEFAULT_GRAPH_VIEW)
  const [graphGridVisible, setGraphGridVisible] = useState(true)
  const [definitions, setDefinitions] = useState(DEFAULT_DEFINITIONS)
  const [variables, setVariables] = useState<Record<string, number>>({})
  const [ans, setAns] = useState(0)
  const [resetSignal, setResetSignal] = useState(0)
  const [panelGeometry, setPanelGeometry] = useState<PanelGeometry>(() => ({
    x: 72,
    y: 92,
    width: 1040,
    height:
      typeof height === "number"
        ? height
        : Number.parseFloat(String(height)) || 660,
  }))
  const backdropRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    geometry: PanelGeometry
  } | null>(null)
  const resizeRef = useRef<{
    startX: number
    startY: number
    geometry: PanelGeometry
  } | null>(null)

  const activeMode = mode ?? internalMode
  const activeAngleMode = angleMode ?? internalAngleMode
  const activeTheme = theme ?? internalTheme
  const activeHidden = hidden ?? internalHidden
  const resolvedTheme =
    activeTheme === "system" ? (systemDark ? "dark" : "light") : activeTheme
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const update = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (!showBackdrop) return

    const constrainPanel = () => {
      const backdrop = backdropRef.current
      if (!backdrop) return
      const bounds = backdrop.getBoundingClientRect()
      if (bounds.width < 320 || bounds.height < 320) return

      setPanelGeometry((current) => {
        const width = Math.min(
          current.width,
          Math.max(0, bounds.width - Math.min(16, bounds.width / 2)),
        )
        const height = Math.min(
          current.height,
          Math.max(0, bounds.height - Math.min(16, bounds.height / 2)),
        )
        const next = {
          ...current,
          width,
          height,
          x: Math.max(0, Math.min(current.x, bounds.width - width)),
          y: Math.max(0, Math.min(current.y, bounds.height - height)),
        }

        return next.x === current.x &&
          next.y === current.y &&
          next.width === current.width &&
          next.height === current.height
          ? current
          : next
      })
    }

    constrainPanel()
    const observer = new ResizeObserver(constrainPanel)
    if (backdropRef.current) observer.observe(backdropRef.current)
    window.addEventListener("resize", constrainPanel)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", constrainPanel)
    }
  }, [showBackdrop])

  const setMode = (nextMode: CalculatorMode) => {
    if (mode === undefined) setInternalMode(nextMode)
    onModeChange?.(nextMode)
  }

  const setAngleMode = (nextMode: AngleMode) => {
    if (angleMode === undefined) setInternalAngleMode(nextMode)
    onAngleModeChange?.(nextMode)
  }

  const setTheme = (nextTheme: CalculatorTheme) => {
    if (theme === undefined) setInternalTheme(nextTheme)
    onThemeChange?.(nextTheme)
  }

  const setHidden = (nextHidden: boolean) => {
    if (hidden === undefined) setInternalHidden(nextHidden)
    onHiddenChange?.(nextHidden)
    if (nextHidden) {
      setFullscreen(false)
      setSettingsOpen(false)
    }
  }

  const formatOptions = useMemo<NumberFormatOptions>(
    () => ({
      notation: displaySettings.notation,
      decimals: displaySettings.decimals,
      significantFigures: displaySettings.significantFigures,
      thousandsSeparator: displaySettings.thousandsSeparator,
    }),
    [displaySettings],
  )

  const engine = useMemo(
    () =>
      new CalculatorEngine({
        angleMode: activeAngleMode,
        ans,
        definitions,
        variables,
      }),
    [activeAngleMode, ans, definitions, variables],
  )

  const formatNumber = useCallback(
    (value: number) => engine.format(value, formatOptions),
    [engine, formatOptions],
  )

  const reset = () => {
    setDisplaySettings(DEFAULT_DISPLAY_SETTINGS)
    setGraphView(DEFAULT_GRAPH_VIEW)
    setGraphGridVisible(true)
    setDefinitions([])
    setVariables({})
    setAns(0)
    setResetSignal((signal) => signal + 1)
  }

  const updateGraphBoundary = (key: keyof GraphView, source: string) => {
    const value = Number(source)
    if (!Number.isFinite(value)) return
    setGraphView((current) => {
      const next = { ...current, [key]: value }
      if (next.xmin >= next.xmax || next.ymin >= next.ymax) return current
      return next
    })
  }

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!showBackdrop || fullscreen || event.button !== 0) return
    const target = event.target as HTMLElement
    if (
      target.closest(
        "button, input, select, textarea, [role='button'], [data-slot='select-trigger']",
      )
    ) {
      return
    }
    event.preventDefault()
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      geometry: panelGeometry,
    }

    const move = (pointerEvent: PointerEvent) => {
      const drag = dragRef.current
      const backdrop = backdropRef.current
      if (!drag || !backdrop) return
      const bounds = backdrop.getBoundingClientRect()
      const x = drag.geometry.x + pointerEvent.clientX - drag.startX
      const y = drag.geometry.y + pointerEvent.clientY - drag.startY
      setPanelGeometry((current) => ({
        ...current,
        x: Math.max(
          0,
          Math.min(Math.max(0, bounds.width - current.width), x),
        ),
        y: Math.max(
          0,
          Math.min(Math.max(0, bounds.height - current.height), y),
        ),
      }))
    }
    const end = () => {
      dragRef.current = null
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", end)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", end)
  }

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!showBackdrop || fullscreen || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    resizeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      geometry: panelGeometry,
    }

    const move = (pointerEvent: PointerEvent) => {
      const resize = resizeRef.current
      const backdrop = backdropRef.current
      if (!resize || !backdrop) return
      const bounds = backdrop.getBoundingClientRect()
      const maximumWidth = Math.max(0, bounds.width - resize.geometry.x)
      const maximumHeight = Math.max(0, bounds.height - resize.geometry.y)
      const minimumWidth = Math.min(MIN_PANEL_WIDTH, maximumWidth)
      const minimumHeight = Math.min(MIN_PANEL_HEIGHT, maximumHeight)
      setPanelGeometry((current) => ({
        ...current,
        width: Math.min(
          maximumWidth,
          Math.max(
            minimumWidth,
            resize.geometry.width + pointerEvent.clientX - resize.startX,
          ),
        ),
        height: Math.min(
          maximumHeight,
          Math.max(
            minimumHeight,
            resize.geometry.height + pointerEvent.clientY - resize.startY,
          ),
        ),
      }))
    }
    const end = () => {
      resizeRef.current = null
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", end)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", end)
  }

  const rootHeight = fullscreen
    ? "calc(100dvh - 1.5rem)"
    : showBackdrop
      ? `${panelGeometry.height}px`
      : typeof height === "number"
        ? `${height}px`
        : height

  return (
    <TooltipProvider>
      <div
        ref={backdropRef}
        className={cn(
          "relative isolate",
          showBackdrop && "h-dvh min-h-0 overflow-hidden bg-muted",
        )}
      >
        {showBackdrop && <PracticeBackdrop />}
        {activeHidden && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="icon"
                aria-label="Show calculator"
                onClick={() => setHidden(false)}
                className={cn(
                  "mirai-calculator size-12 rounded-xl shadow-xl",
                  resolvedTheme === "dark" && "dark",
                  showBackdrop && "absolute z-10",
                )}
                style={
                  showBackdrop
                    ? {
                        left: panelGeometry.x,
                        top: panelGeometry.y,
                      }
                    : undefined
                }
                data-theme={resolvedTheme}
              >
                <CalculatorIcon className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show calculator</TooltipContent>
          </Tooltip>
        )}
        <div
          hidden={activeHidden}
          className={cn(
            "mirai-calculator flex min-h-0 w-full flex-col overflow-hidden rounded-[12px] border bg-background text-foreground shadow-xl",
            resolvedTheme === "dark" && "dark",
            showBackdrop &&
              "absolute z-10",
            fullscreen &&
              "fixed inset-3 z-50 min-h-0 w-auto max-w-none rounded-xl",
            className,
          )}
          style={{
            ...style,
            height: rootHeight,
            ...(showBackdrop && !fullscreen
              ? {
                  left: panelGeometry.x,
                  top: panelGeometry.y,
                  width: panelGeometry.width,
                }
              : {}),
          }}
          data-theme={resolvedTheme}
        >
          <header
            onPointerDown={beginDrag}
            onDoubleClick={() =>
              showBackdrop && setFullscreen((value) => !value)
            }
            className={cn(
              "flex min-h-[52px] shrink-0 touch-none flex-wrap items-center gap-2 border-b bg-card px-3 py-2 select-none sm:gap-3",
              showBackdrop && !fullscreen && "cursor-grab active:cursor-grabbing",
            )}
          >
            <span className="sr-only">{title}</span>
            <div
              aria-hidden="true"
              className="grid grid-cols-2 gap-[3px] p-0.5"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <span
                  key={index}
                  className="size-[3px] rounded-full bg-muted-foreground/35"
                />
              ))}
            </div>

            <nav
              aria-label="Calculator modes"
              className="mirai-mode-switcher order-3 grid w-full min-w-0 max-w-full grid-cols-4 gap-0.5 overflow-hidden rounded-lg bg-muted p-[3px] sm:order-none"
            >
              {MODES.map((item) => (
                <Button
                  key={item.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode(item.value)}
                  aria-current={activeMode === item.value ? "page" : undefined}
                  data-active={activeMode === item.value ? "" : undefined}
                  className="h-7 min-w-0 w-full rounded-md bg-transparent px-1 text-[13px] font-medium shadow-none transition-[background-color,box-shadow,color] hover:bg-transparent focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none data-active:bg-background data-active:text-foreground data-active:shadow-sm"
                >
                  {item.label}
                </Button>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <HeaderIconButton
                label={`Use ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                {resolvedTheme === "dark" ? <Sun /> : <Moon />}
              </HeaderIconButton>
              <HeaderIconButton
                label="Calculator settings"
                onClick={() => setSettingsOpen((open) => !open)}
              >
                <Settings2 />
              </HeaderIconButton>
              <HeaderIconButton
                label="Hide calculator"
                onClick={() => setHidden(true)}
              >
                <EyeOff />
              </HeaderIconButton>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="h-[30px] rounded-md px-2.5 text-xs text-muted-foreground"
              >
                Reset
              </Button>
              <HeaderIconButton
                label={fullscreen ? "Exit full screen" : "Enter full screen"}
                onClick={() => setFullscreen((value) => !value)}
              >
                {fullscreen ? <Minimize2 /> : <Expand />}
              </HeaderIconButton>
              {onClose && (
                <HeaderIconButton label="Close calculator" onClick={onClose}>
                  <X />
                </HeaderIconButton>
              )}
            </div>
          </header>

          {settingsOpen && (
            <section
              aria-label="Calculator settings"
              className="flex shrink-0 flex-wrap items-end gap-4 border-b bg-muted/35 px-4 py-3"
            >
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Angle mode
                <Select
                  value={activeAngleMode}
                  onValueChange={(value: AngleMode) => setAngleMode(value)}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-28 bg-background"
                    aria-label="Angle mode"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="degrees">Degrees</SelectItem>
                    <SelectItem value="radians">Radians</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notation
                <Select
                  value={displaySettings.notation}
                  onValueChange={(value: "auto" | "scientific") =>
                    setDisplaySettings((current) => ({
                      ...current,
                      notation: value,
                    }))
                  }
                >
                  <SelectTrigger size="sm" className="w-32 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic</SelectItem>
                    <SelectItem value="scientific">Scientific</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Decimals
                <Select
                  value={String(displaySettings.decimals)}
                  onValueChange={(value) =>
                    setDisplaySettings((current) => ({
                      ...current,
                      decimals: value === "auto" ? "auto" : Number(value),
                    }))
                  }
                >
                  <SelectTrigger size="sm" className="w-24 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    {[0, 1, 2, 3, 4, 6].map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sig figs
                <Input
                  type="number"
                  min={1}
                  max={15}
                  value={displaySettings.significantFigures}
                  onChange={(event) =>
                    setDisplaySettings((current) => ({
                      ...current,
                      significantFigures: Math.max(
                        1,
                        Math.min(15, Number(event.target.value) || 1),
                      ),
                    }))
                  }
                  className="h-8 w-20 bg-background"
                />
              </label>

              <label className="flex h-8 items-center gap-2 text-sm">
                <Switch
                  checked={displaySettings.thousandsSeparator}
                  onCheckedChange={(checked) =>
                    setDisplaySettings((current) => ({
                      ...current,
                      thousandsSeparator: checked,
                    }))
                  }
                />
                Thousands separators
              </label>

              <Separator orientation="vertical" className="hidden h-10 sm:block" />

              {(["xmin", "xmax", "ymin", "ymax"] as const).map((key) => (
                <label
                  key={key}
                  className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {key.replace("min", " min").replace("max", " max")}
                  <Input
                    type="number"
                    value={graphView[key]}
                    onChange={(event) =>
                      updateGraphBoundary(key, event.target.value)
                    }
                    className="h-8 w-20 bg-background font-mono"
                  />
                </label>
              ))}

              <label className="flex h-8 items-center gap-2 text-sm">
                <Switch
                  checked={graphGridVisible}
                  onCheckedChange={setGraphGridVisible}
                />
                Grid lines
              </label>

              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Theme
                <Select
                  value={activeTheme}
                  onValueChange={(value: CalculatorTheme) => setTheme(value)}
                >
                  <SelectTrigger size="sm" className="w-28 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </section>
          )}

          <main className="flex min-h-0 flex-1 flex-col">
            {activeMode === "scientific" && (
              <ScientificMode
                key={`scientific-${resetSignal}`}
                engine={engine}
                definitions={definitions}
                onDefinitionsChange={setDefinitions}
                onAnsChange={setAns}
                formatOptions={formatOptions}
              />
            )}
            {activeMode === "graphing" && (
              <GraphingMode
                key={`graphing-${resetSignal}`}
                angleMode={activeAngleMode}
                ans={ans}
                definitions={definitions}
                formatNumber={formatNumber}
                onVariablesChange={setVariables}
                view={graphView}
                onViewChange={setGraphView}
                gridVisible={graphGridVisible}
                onGridVisibleChange={setGraphGridVisible}
                colorScheme={resolvedTheme}
              />
            )}
            {activeMode === "statistics" && (
              <StatisticsMode
                key={`statistics-${resetSignal}`}
                formatNumber={formatNumber}
                colorScheme={resolvedTheme}
              />
            )}
            {activeMode === "tools" && (
              <ToolsMode
                key={`tools-${resetSignal}`}
                formatNumber={formatNumber}
              />
            )}
          </main>

          {showBackdrop && !fullscreen && (
            <div
              role="separator"
              aria-label="Resize calculator"
              aria-orientation="vertical"
              onPointerDown={beginResize}
              className="absolute right-0 bottom-0 z-20 size-[18px] touch-none cursor-nwse-resize"
              style={{
                background:
                  "linear-gradient(135deg, transparent 46%, color-mix(in oklab, var(--muted-foreground) 45%, transparent) 46%, color-mix(in oklab, var(--muted-foreground) 45%, transparent) 54%, transparent 54%, transparent 70%, color-mix(in oklab, var(--muted-foreground) 45%, transparent) 70%, color-mix(in oklab, var(--muted-foreground) 45%, transparent) 78%, transparent 78%)",
              }}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
