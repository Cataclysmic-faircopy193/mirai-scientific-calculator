import { useEffect } from "react"
import { createPortal } from "react-dom"
import { Settings2, X } from "lucide-react"

import {
  CALCULATOR_ANGLE_MODE_LABELS,
  CALCULATOR_DECIMAL_OPTIONS,
  CALCULATOR_GRAPH_BOUNDARY_KEYS,
  CALCULATOR_NOTATION_LABELS,
  CALCULATOR_THEME_LABELS,
} from "@/components/mirai-calculator/calculator-ui-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type {
  CalculatorDisplaySettings,
  CalculatorTheme,
} from "@openmirai/calculator-core/configuration"
import type { AngleMode } from "@openmirai/calculator-core/engine"
import type { GraphView } from "@openmirai/calculator-core/graphing-view"
import { cn } from "@/lib/utils"

interface CalculatorSettingsDialogProps {
  settingsOpen: boolean
  calculatorContainer: HTMLDivElement | null
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>
  resolvedTheme: "light" | "dark"
  showsAngleMode: boolean
  activeAngleMode: AngleMode
  setAngleMode: (mode: AngleMode) => void
  displaySettings: CalculatorDisplaySettings
  setDisplaySettings: React.Dispatch<React.SetStateAction<CalculatorDisplaySettings>>
  showsGraphSettings: boolean
  graphGridVisible: boolean
  setGraphGridVisible: React.Dispatch<React.SetStateAction<boolean>>
  graphView: GraphView
  updateGraphBoundary: (key: keyof GraphView, source: string) => void
  activeTheme: CalculatorTheme
  setTheme: (theme: CalculatorTheme) => void
}

/** Renders calculator settings inside the calculator container rather than the host page. */
export function CalculatorSettingsDialog({
  settingsOpen,
  calculatorContainer,
  setSettingsOpen,
  resolvedTheme,
  showsAngleMode,
  activeAngleMode,
  setAngleMode,
  displaySettings,
  setDisplaySettings,
  showsGraphSettings,
  graphGridVisible,
  setGraphGridVisible,
  graphView,
  updateGraphBoundary,
  activeTheme,
  setTheme,
}: CalculatorSettingsDialogProps) {
  useEffect(() => {
    if (!settingsOpen) {
      return undefined
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false)
      }
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [settingsOpen, setSettingsOpen])

  return (
    <>
      {settingsOpen && calculatorContainer
        ? createPortal(
            <div
              role="presentation"
              className="absolute inset-0 z-60 flex items-center justify-center overflow-hidden rounded-[inherit] bg-black/25 p-3 backdrop-blur-[7px]"
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSettingsOpen(false)
                }
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-label="Calculator settings"
                tabIndex={-1}
                className={cn(
                  "mirai-calculator-package mirai-calculator-portal mirai-calculator-settings-dialog relative grid min-h-0 max-h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] max-w-160 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-xl border bg-popover p-0 shadow-2xl ring-1 ring-foreground/10",
                  resolvedTheme
                )}
                data-theme={resolvedTheme}
              >
                <Button
                  type="button"
                  aria-label="Close calculator settings"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSettingsOpen(false)}
                  className="absolute top-2 right-2 z-10"
                >
                  <X />
                </Button>
                <div className="border-b bg-muted/20 px-5 py-4 pr-12">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs">
                      <Settings2 className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold">Calculator settings</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Format results and tune the active workspace.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  data-calculator-settings-body=""
                  className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-5 sm:grid-cols-2"
                >
                  <section
                    aria-labelledby="mirai-number-format-heading"
                    className="rounded-lg border bg-background/60 p-4"
                  >
                    <h3
                      id="mirai-number-format-heading"
                      className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      Number format
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {showsAngleMode && (
                        <div className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                          <span>Angle mode</span>
                          <Select
                            value={activeAngleMode}
                            onValueChange={(value: string | null) => {
                              if (value === "degrees" || value === "radians") {
                                setAngleMode(value)
                              }
                            }}
                          >
                            <SelectTrigger
                              size="sm"
                              className="w-full bg-background"
                              aria-label="Angle mode"
                            >
                              <SelectValue>
                                {CALCULATOR_ANGLE_MODE_LABELS[activeAngleMode]}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent
                              className={cn(
                                "mirai-calculator-package mirai-calculator-portal z-2147483002",
                                resolvedTheme
                              )}
                              data-theme={resolvedTheme}
                            >
                              <SelectItem value="degrees">Degrees</SelectItem>
                              <SelectItem value="radians">Radians</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                        <span>Notation</span>
                        <Select
                          value={displaySettings.notation}
                          onValueChange={(value: string | null) => {
                            if (value !== "auto" && value !== "scientific") {
                              return
                            }
                            setDisplaySettings((current) => ({
                              ...current,
                              notation: value,
                            }))
                          }}
                        >
                          <SelectTrigger
                            size="sm"
                            className="w-full bg-background"
                            aria-label="Notation"
                          >
                            <SelectValue>
                              {CALCULATOR_NOTATION_LABELS[displaySettings.notation]}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent
                            className={cn(
                              "mirai-calculator-package mirai-calculator-portal z-2147483002",
                              resolvedTheme
                            )}
                            data-theme={resolvedTheme}
                          >
                            <SelectItem value="auto">Automatic</SelectItem>
                            <SelectItem value="scientific">Scientific</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                        <span>Decimals</span>
                        <Select
                          value={String(displaySettings.decimals)}
                          onValueChange={(value) => {
                            if (value === null) {
                              return
                            }
                            setDisplaySettings((current) => ({
                              ...current,
                              decimals: value === "auto" ? "auto" : Number(value),
                            }))
                          }}
                        >
                          <SelectTrigger
                            size="sm"
                            className="w-full bg-background"
                            aria-label="Decimals"
                          >
                            <SelectValue>
                              {displaySettings.decimals === "auto"
                                ? "Auto"
                                : String(displaySettings.decimals)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent
                            className={cn(
                              "mirai-calculator-package mirai-calculator-portal z-2147483002",
                              resolvedTheme
                            )}
                            data-theme={resolvedTheme}
                          >
                            <SelectItem value="auto">Auto</SelectItem>
                            {CALCULATOR_DECIMAL_OPTIONS.map((value) => (
                              <SelectItem key={value} value={String(value)}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <label
                        htmlFor="mirai-significant-figures"
                        className="grid gap-1.5 text-xs font-medium text-muted-foreground"
                      >
                        Significant figures
                        <Input
                          id="mirai-significant-figures"
                          type="number"
                          min={1}
                          max={15}
                          value={displaySettings.significantFigures}
                          onChange={(event) =>
                            setDisplaySettings((current) => ({
                              ...current,
                              significantFigures: Math.max(
                                1,
                                Math.min(15, Number(event.target.value) || 1)
                              ),
                            }))
                          }
                          className="h-7 w-full bg-background"
                        />
                      </label>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-4 rounded-md border bg-muted/25 px-3 py-2.5 text-sm">
                      <span>
                        <strong className="block text-xs font-medium">Thousands separators</strong>
                        <small className="text-xs text-muted-foreground">
                          Group large values for readability.
                        </small>
                      </span>
                      <Switch
                        aria-label="Thousands separators"
                        checked={displaySettings.thousandsSeparator}
                        onCheckedChange={(checked) =>
                          setDisplaySettings((current) => ({
                            ...current,
                            thousandsSeparator: checked,
                          }))
                        }
                      />
                    </div>
                  </section>

                  {showsGraphSettings && (
                    <section
                      aria-labelledby="mirai-graph-viewport-heading"
                      className="rounded-lg border bg-background/60 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3
                          id="mirai-graph-viewport-heading"
                          className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                        >
                          Graph viewport
                        </h3>
                        <div className="flex items-center gap-2 text-xs">
                          <span>Grid lines</span>
                          <Switch
                            aria-label="Grid lines"
                            checked={graphGridVisible}
                            onCheckedChange={setGraphGridVisible}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {CALCULATOR_GRAPH_BOUNDARY_KEYS.map((key) => (
                          <label
                            key={key}
                            htmlFor={`mirai-graph-${key}`}
                            className="grid gap-1.5 text-xs font-medium text-muted-foreground"
                          >
                            {key.replace("min", " min").replace("max", " max")}
                            <Input
                              id={`mirai-graph-${key}`}
                              type="number"
                              value={graphView[key]}
                              onChange={(event) => updateGraphBoundary(key, event.target.value)}
                              className="h-7 w-full bg-background font-mono"
                            />
                          </label>
                        ))}
                      </div>
                    </section>
                  )}

                  <section
                    aria-labelledby="mirai-appearance-heading"
                    className="rounded-lg border bg-background/60 p-4"
                  >
                    <h3
                      id="mirai-appearance-heading"
                      className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      Appearance
                    </h3>
                    <div className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                      <span>Theme</span>
                      <Select
                        value={activeTheme}
                        onValueChange={(value: string | null) => {
                          if (value === "light" || value === "dark" || value === "system") {
                            setTheme(value)
                          }
                        }}
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-full bg-background"
                          aria-label="Theme"
                        >
                          <SelectValue>{CALCULATOR_THEME_LABELS[activeTheme]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          className={cn(
                            "mirai-calculator-package mirai-calculator-portal z-2147483002",
                            resolvedTheme
                          )}
                          data-theme={resolvedTheme}
                        >
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </section>
                </div>
                <div className="flex justify-end border-t bg-muted/20 px-5 py-3">
                  <Button variant="outline" size="sm" onClick={() => setSettingsOpen(false)}>
                    Done
                  </Button>
                </div>
              </section>
            </div>,
            calculatorContainer
          )
        : null}
    </>
  )
}
