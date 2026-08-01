import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Calculator as CalculatorIcon,
  Expand,
  EyeOff,
  Minimize2,
  Moon,
  RotateCcw,
  Settings2,
  Sun,
  X,
} from "lucide-react"

import { CalculatorHeaderIconButton } from "@/components/mirai-calculator/calculator-header-icon-button"
import { CALCULATOR_EXTENSION_DEFINITIONS } from "@/components/mirai-calculator/calculator-extension-definitions"
import { CalculatorSettingsDialog } from "@/components/mirai-calculator/calculator-settings-dialog"
import { CalculatorViewportPortal } from "@/components/mirai-calculator/calculator-viewport-portal"
import {
  resolveCalculatorTheme,
  useSystemDarkMode,
} from "@/components/mirai-calculator/use-system-dark-mode"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CalculatorExtension,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_GRAPH_VIEW,
  EMPTY_CALCULATOR_DEFINITIONS,
  calculatorNumberFormatOptions,
  collectSliderVariables,
  normalizeCalculatorExtensions,
} from "@openmirai/calculator-core/configuration"
import type {
  CalculatorDisplaySettings,
  CalculatorMode,
  CalculatorTheme,
} from "@openmirai/calculator-core/configuration"
import { CalculatorEngine } from "@openmirai/calculator-core/engine"
import type { AngleMode, NumberFormatOptions } from "@openmirai/calculator-core/engine"
import type { GraphingInitialData } from "@openmirai/calculator-core/graphing-data"
import type { GraphView } from "@openmirai/calculator-core/graphing-view"
import type { StatisticsInitialData } from "@openmirai/calculator-core/statistics-data"
import type { ToolsInitialData as ToolsInitialDataValue } from "@openmirai/calculator-core/tools"
import { cn } from "@/lib/utils"

export interface MiraiCalculatorProps {
  className?: string
  extensions?: ReadonlyArray<CalculatorExtension>
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
  title?: string
  onClose?: () => void
  defaultDefinitions?: ReadonlyArray<string>
  defaultGraphingData?: GraphingInitialData
  defaultStatisticsData?: StatisticsInitialData
  defaultToolsData?: ToolsInitialDataValue
}

/** Composes enabled calculator extensions into a configurable, container-responsive panel. */
export function MiraiCalculator({
  className,
  extensions,
  mode,
  defaultMode = CalculatorExtension.SCIENTIFIC,
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
  title = "Calculator",
  onClose,
  defaultDefinitions = EMPTY_CALCULATOR_DEFINITIONS,
  defaultGraphingData,
  defaultStatisticsData,
  defaultToolsData,
}: MiraiCalculatorProps) {
  const [internalMode, setInternalMode] = useState(defaultMode)
  const [internalAngleMode, setInternalAngleMode] = useState(defaultAngleMode)
  const [internalTheme, setInternalTheme] = useState(defaultTheme)
  const [internalHidden, setInternalHidden] = useState(defaultHidden)
  const systemDark = useSystemDarkMode()
  const [fullscreen, setFullscreen] = useState(startFullscreen)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [displaySettings, setDisplaySettings] = useState<CalculatorDisplaySettings>(() => ({
    ...DEFAULT_DISPLAY_SETTINGS,
  }))
  const [graphView, setGraphView] = useState<GraphView>(() => ({ ...DEFAULT_GRAPH_VIEW }))
  const [graphGridVisible, setGraphGridVisible] = useState(true)
  const [definitions, setDefinitions] = useState(() => [...defaultDefinitions])
  const [variables, setVariables] = useState<Record<string, number>>(() =>
    collectSliderVariables(
      (defaultGraphingData?.expressions ?? []).map((expression) => ({
        expression: expression.value,
        value: expression.slider?.value,
      }))
    )
  )
  const [ans, setAns] = useState(0)
  const [resetSignal, setResetSignal] = useState(0)
  const calculatorRef = useRef<HTMLDivElement>(null)

  const enabledExtensions = useMemo(() => normalizeCalculatorExtensions(extensions), [extensions])
  const requestedMode = mode ?? internalMode
  const activeMode = enabledExtensions.includes(requestedMode)
    ? requestedMode
    : enabledExtensions[0]
  const activeAngleMode = angleMode ?? internalAngleMode
  const activeTheme = theme ?? internalTheme
  const activeHidden = hidden ?? internalHidden
  const resolvedTheme = resolveCalculatorTheme(activeTheme, systemDark)
  const showsAngleMode = enabledExtensions.some(
    (extension) => CALCULATOR_EXTENSION_DEFINITIONS[extension].usesAngleMode
  )
  const showsGraphSettings = enabledExtensions.some(
    (extension) => CALCULATOR_EXTENSION_DEFINITIONS[extension].hasGraphSettings
  )

  useEffect(() => {
    if (!fullscreen) {
      return
    }
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = previousOverflow
    }
  }, [fullscreen])

  const setMode = (nextMode: CalculatorMode) => {
    if (mode === undefined) {
      setInternalMode(nextMode)
    }
    onModeChange?.(nextMode)
  }

  const setAngleMode = (nextMode: AngleMode) => {
    if (angleMode === undefined) {
      setInternalAngleMode(nextMode)
    }
    onAngleModeChange?.(nextMode)
  }

  const setTheme = (nextTheme: CalculatorTheme) => {
    if (theme === undefined) {
      setInternalTheme(nextTheme)
    }
    onThemeChange?.(nextTheme)
  }

  const setHidden = (nextHidden: boolean) => {
    if (hidden === undefined) {
      setInternalHidden(nextHidden)
    }
    onHiddenChange?.(nextHidden)
    if (nextHidden) {
      setFullscreen(false)
      setSettingsOpen(false)
    }
  }

  const formatOptions = useMemo<NumberFormatOptions>(
    () => calculatorNumberFormatOptions(displaySettings),
    [displaySettings]
  )

  const engine = useMemo(
    () =>
      new CalculatorEngine({
        angleMode: activeAngleMode,
        ans,
        definitions,
        variables,
      }),
    [activeAngleMode, ans, definitions, variables]
  )

  const formatNumber = useCallback(
    (value: number) => engine.format(value, formatOptions),
    [engine, formatOptions]
  )

  const reset = () => {
    setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS })
    setGraphView({ ...DEFAULT_GRAPH_VIEW })
    setGraphGridVisible(true)
    setDefinitions([...defaultDefinitions])
    setVariables({})
    setAns(0)
    setResetSignal((signal) => signal + 1)
  }

  const updateGraphBoundary = (key: keyof GraphView, source: string) => {
    const value = Number(source)
    if (!Number.isFinite(value)) {
      return
    }
    setGraphView((current) => {
      const next = { ...current, [key]: value }
      if (next.xmin >= next.xmax || next.ymin >= next.ymax) {
        return current
      }
      return next
    })
  }

  return (
    <TooltipProvider>
      <div className="mirai-calculator-package" style={{ display: "contents" }}>
        <div className="relative isolate h-full min-h-0 w-full">
          {activeHidden && (
            <Tooltip>
              <TooltipTrigger
                type="button"
                aria-label="Show calculator"
                onClick={() => setHidden(false)}
                className={cn(
                  buttonVariants({ variant: "default", size: "icon" }),
                  "mirai-calculator size-12 rounded-xl shadow-xl",
                  resolvedTheme
                )}
                data-calculator-hidden-launcher=""
                data-theme={resolvedTheme}
              >
                <CalculatorIcon className="size-5" />
              </TooltipTrigger>
              <TooltipContent
                className={cn(
                  "mirai-calculator-package mirai-calculator-portal z-2147483002",
                  resolvedTheme
                )}
                data-theme={resolvedTheme}
              >
                Show calculator
              </TooltipContent>
            </Tooltip>
          )}
          <CalculatorViewportPortal fullscreen={fullscreen}>
            <div
              ref={calculatorRef}
              hidden={activeHidden}
              className={cn(
                "mirai-calculator @container relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border bg-background text-sm text-foreground tabular-nums shadow-xl [&_canvas]:block",
                resolvedTheme,
                fullscreen &&
                  "fixed inset-3 z-2147483000 h-[calc(100dvh-1.5rem)] min-h-0 w-auto max-w-none rounded-xl",
                className
              )}
              data-theme={resolvedTheme}
            >
              <header
                data-calculator-drag-handle=""
                className="mirai-calculator-header flex min-h-13 shrink-0 touch-none flex-nowrap items-center gap-3 overflow-hidden border-b bg-card px-3 py-2 select-none @max-[699px]:gap-1"
              >
                <span className="sr-only">{title}</span>
                <span
                  aria-hidden="true"
                  className="grid shrink-0 grid-cols-2 gap-0.75 p-0.5 @max-[359px]:hidden"
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <span key={index} className="size-0.75 rounded-full bg-muted-foreground/35" />
                  ))}
                </span>
                {enabledExtensions.length === 1 && (
                  <span
                    data-calculator-mode-label
                    className="flex h-8 min-w-0 shrink-0 items-center text-sm font-medium"
                  >
                    {CALCULATOR_EXTENSION_DEFINITIONS[enabledExtensions[0]].label}
                  </span>
                )}

                {enabledExtensions.length > 1 && (
                  <>
                    <div className="mirai-mode-select hidden min-w-0 flex-1 @max-[699px]:block">
                      <Select
                        value={activeMode}
                        onValueChange={(value: string | null) => {
                          if (
                            value !== null &&
                            enabledExtensions.includes(value as CalculatorExtension)
                          ) {
                            setMode(value as CalculatorExtension)
                          }
                        }}
                      >
                        <SelectTrigger
                          aria-label="Calculator mode"
                          size="sm"
                          className="h-8 w-full min-w-0 rounded-lg border-transparent bg-muted shadow-none"
                        >
                          <SelectValue>
                            {CALCULATOR_EXTENSION_DEFINITIONS[activeMode].label}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          className={cn(
                            "mirai-calculator-package mirai-calculator-portal z-2147483002",
                            resolvedTheme
                          )}
                          data-theme={resolvedTheme}
                        >
                          {enabledExtensions.map((extension) => (
                            <SelectItem key={extension} value={extension}>
                              {CALCULATOR_EXTENSION_DEFINITIONS[extension].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <nav
                      aria-label="Calculator modes"
                      className="mirai-mode-switcher relative grid min-w-0 max-w-full flex-[1_1_364px] gap-0.5 overflow-hidden rounded-lg bg-muted p-0.75 @max-[699px]:hidden"
                      style={{
                        gridTemplateColumns: `repeat(${enabledExtensions.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {enabledExtensions.map((extension) => (
                        <Button
                          key={extension}
                          aria-label={CALCULATOR_EXTENSION_DEFINITIONS[extension].label}
                          variant="ghost"
                          size="sm"
                          onClick={() => setMode(extension)}
                          aria-current={activeMode === extension ? "page" : undefined}
                          data-active={activeMode === extension ? "" : undefined}
                          className="h-7 min-w-0 w-full rounded-md bg-transparent px-1 text-sm font-medium shadow-none transition-[background-color,box-shadow,color] hover:bg-foreground/8! hover:text-foreground! focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none data-active:bg-background data-active:text-foreground data-active:shadow-sm data-active:hover:bg-background!"
                        >
                          <span
                            aria-hidden="true"
                            className="mirai-mode-label @max-[699px]:text-xs"
                            data-compact-label={
                              CALCULATOR_EXTENSION_DEFINITIONS[extension].compactLabel
                            }
                          >
                            {CALCULATOR_EXTENSION_DEFINITIONS[extension].label}
                          </span>
                        </Button>
                      ))}
                    </nav>
                  </>
                )}

                <div className="mirai-header-actions ml-auto flex shrink-0 items-center gap-2 @max-[699px]:gap-1">
                  <CalculatorHeaderIconButton
                    label={`Use ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    portalTheme={resolvedTheme}
                  >
                    {resolvedTheme === "dark" ? <Sun /> : <Moon />}
                  </CalculatorHeaderIconButton>
                  <Button
                    type="button"
                    aria-label="Calculator settings"
                    variant="outline"
                    size="icon"
                    onClick={() => setSettingsOpen(true)}
                    className={cn(
                      "size-7.5 rounded-md",
                      settingsOpen && "bg-muted text-foreground"
                    )}
                  >
                    <Settings2 />
                  </Button>
                  <CalculatorSettingsDialog
                    settingsOpen={settingsOpen}
                    calculatorContainer={calculatorRef.current}
                    setSettingsOpen={setSettingsOpen}
                    resolvedTheme={resolvedTheme}
                    showsAngleMode={showsAngleMode}
                    activeAngleMode={activeAngleMode}
                    setAngleMode={setAngleMode}
                    displaySettings={displaySettings}
                    setDisplaySettings={setDisplaySettings}
                    showsGraphSettings={showsGraphSettings}
                    graphGridVisible={graphGridVisible}
                    setGraphGridVisible={setGraphGridVisible}
                    graphView={graphView}
                    updateGraphBoundary={updateGraphBoundary}
                    activeTheme={activeTheme}
                    setTheme={setTheme}
                  />
                  <CalculatorHeaderIconButton
                    label="Hide calculator"
                    onClick={() => setHidden(true)}
                    portalTheme={resolvedTheme}
                  >
                    <EyeOff />
                  </CalculatorHeaderIconButton>
                  <Button
                    aria-label="Reset"
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    className="mirai-header-reset h-7.5 min-w-7.5 rounded-md px-2.5 text-xs text-muted-foreground @max-[699px]:w-7.5 @max-[699px]:px-0"
                  >
                    <RotateCcw
                      aria-hidden="true"
                      className="mirai-header-reset-icon hidden size-4 @max-[699px]:block"
                    />
                    <span className="mirai-header-reset-label @max-[699px]:hidden">Reset</span>
                  </Button>
                  <CalculatorHeaderIconButton
                    label={fullscreen ? "Exit full screen" : "Enter full screen"}
                    onClick={() => setFullscreen((value) => !value)}
                    portalTheme={resolvedTheme}
                  >
                    {fullscreen ? <Minimize2 /> : <Expand />}
                  </CalculatorHeaderIconButton>
                  {onClose && (
                    <CalculatorHeaderIconButton
                      label="Close calculator"
                      onClick={onClose}
                      portalTheme={resolvedTheme}
                    >
                      <X />
                    </CalculatorHeaderIconButton>
                  )}
                </div>
              </header>

              <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {activeMode ? (
                  CALCULATOR_EXTENSION_DEFINITIONS[activeMode].render({
                    resetSignal,
                    engine,
                    activeAngleMode,
                    ans,
                    definitions,
                    setDefinitions,
                    setAns,
                    formatOptions,
                    formatNumber,
                    setVariables,
                    graphView,
                    setGraphView,
                    graphGridVisible,
                    setGraphGridVisible,
                    resolvedTheme,
                    defaultGraphingData,
                    defaultStatisticsData,
                    defaultToolsData,
                  })
                ) : (
                  <div
                    role="status"
                    className="flex min-h-48 flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground"
                  >
                    No calculator extensions enabled
                  </div>
                )}
              </main>
            </div>
          </CalculatorViewportPortal>
        </div>
      </div>
    </TooltipProvider>
  )
}
