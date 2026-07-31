import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react"
import { domAnimation, LazyMotion, m, MotionConfig } from "motion/react"

import { type CalculatorExtension as CalculatorExtensionValue } from "@/components/mirai-calculator/mirai-calculator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  CALCULATOR_THEME_OPTIONS,
  createPlaygroundSnippet,
  DEFAULT_PLAYGROUND_SEARCH,
  movePlaygroundExtension,
  orderPlaygroundExtensionOptions,
  parsePlaygroundExtensions,
  PLAYGROUND_DEFAULT_DEFINITIONS,
  PLAYGROUND_EXTENSION_LAYOUT_TRANSITION,
  PLAYGROUND_GRAPHING_DATA,
  PLAYGROUND_STATISTICS_DATA,
  PLAYGROUND_TOOLS_DATA,
  serializePlaygroundExtensions,
  type PlaygroundSearch,
} from "@/site/constants/playground"
import { CodePreview } from "@/site/code-preview"
import { PlaygroundCalculatorPreview } from "@/site/playground-calculator-preview"
import { EXTENSIONS } from "@/site/site-data"

/** Renders the URL-synchronized calculator configurator and generated source preview. */
export function PlaygroundPage({
  search,
  onSearchChange,
}: {
  search: PlaygroundSearch
  onSearchChange: (search: PlaygroundSearch) => void
}) {
  const extensions = parsePlaygroundExtensions(search.extensions)
  const enabledExtensions = new Set(extensions)
  const extensionOptions = orderPlaygroundExtensionOptions(extensions, EXTENSIONS)
  const activeMode = extensions.find((extension) => extension === search.mode) ?? extensions[0]
  const activeExtensionLabel =
    EXTENSIONS.find((extension) => extension.id === activeMode)?.label ?? activeMode
  const calculatorThemeLabel =
    CALCULATOR_THEME_OPTIONS.find((option) => option.value === search.calculatorTheme)?.label ??
    search.calculatorTheme
  const snippet = createPlaygroundSnippet({
    extensions,
    mode: activeMode,
    calculatorTheme: search.calculatorTheme,
    statisticsData: PLAYGROUND_STATISTICS_DATA,
    toolsData: PLAYGROUND_TOOLS_DATA,
  })

  const setExtensions = (nextExtensions: readonly CalculatorExtensionValue[]) => {
    const nextMode = nextExtensions.includes(activeMode) ? activeMode : nextExtensions[0]
    onSearchChange({
      ...search,
      extensions: serializePlaygroundExtensions(nextExtensions),
      mode: nextMode,
    })
  }

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-14 md:px-8 lg:px-10">
      <div className="flex flex-col gap-5 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">URL-synced configuration</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">Playground</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Select, order, and preview built-in extensions. Share the URL to reproduce the exact
            configuration.
          </p>
        </div>
        <Button variant="outline" onClick={() => onSearchChange(DEFAULT_PLAYGROUND_SEARCH)}>
          <RotateCcw /> Reset
        </Button>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="grid content-start gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Extensions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <MotionConfig reducedMotion="user">
                <LazyMotion features={domAnimation}>
                  {extensionOptions.map((extension) => {
                    const enabled = enabledExtensions.has(extension.id)
                    const enabledIndex = extensions.indexOf(extension.id)
                    return (
                      <m.div
                        layout="position"
                        transition={PLAYGROUND_EXTENSION_LAYOUT_TRANSITION}
                        key={extension.id}
                        className="relative grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border p-3"
                      >
                        <label className="flex min-w-0 cursor-pointer items-center gap-3">
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) =>
                              setExtensions(
                                checked
                                  ? [...extensions, extension.id]
                                  : extensions.filter((value) => value !== extension.id)
                              )
                            }
                            aria-label={`${enabled ? "Disable" : "Enable"} ${extension.label}`}
                          />
                          <span className="min-w-0">
                            <strong className="block truncate text-sm font-medium">
                              {extension.label}
                            </strong>
                            <small className="block truncate text-muted-foreground">
                              {extension.eyebrow}
                            </small>
                          </span>
                        </label>
                        <div className="flex">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={!enabled || enabledIndex === 0}
                            onClick={() =>
                              setExtensions(movePlaygroundExtension(extensions, extension.id, -1))
                            }
                            aria-label={`Move ${extension.label} up`}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={!enabled || enabledIndex === extensions.length - 1}
                            onClick={() =>
                              setExtensions(movePlaygroundExtension(extensions, extension.id, 1))
                            }
                            aria-label={`Move ${extension.label} down`}
                          >
                            <ArrowDown />
                          </Button>
                        </div>
                      </m.div>
                    )
                  })}
                </LazyMotion>
              </MotionConfig>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <label className="grid gap-2 text-sm">
                Active extension
                <Select
                  value={activeMode}
                  disabled={extensions.length === 0}
                  onValueChange={(value) => {
                    if (typeof value !== "string") return
                    onSearchChange({ ...search, mode: value })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No extension enabled">
                      {activeExtensionLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {extensions.map((extension) => (
                      <SelectItem key={extension} value={extension}>
                        {EXTENSIONS.find((item) => item.id === extension)?.label ?? extension}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="grid gap-2 text-sm">
                Calculator theme
                <Select
                  value={search.calculatorTheme}
                  onValueChange={(value) => {
                    if (value !== "light" && value !== "dark" && value !== "system") return
                    onSearchChange({ ...search, calculatorTheme: value })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{calculatorThemeLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CALCULATOR_THEME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <Separator />

              <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
                Practice backdrop
                <Switch
                  checked={search.backdrop}
                  onCheckedChange={(backdrop) => onSearchChange({ ...search, backdrop })}
                />
              </label>
            </CardContent>
          </Card>
        </aside>

        <CodePreview
          preview={
            <PlaygroundCalculatorPreview
              showBackdrop={search.backdrop}
              extensions={extensions}
              mode={activeMode}
              onModeChange={(mode) => onSearchChange({ ...search, mode })}
              theme={search.calculatorTheme}
              onThemeChange={(calculatorTheme) => onSearchChange({ ...search, calculatorTheme })}
              title="OpenMirai calculator playground"
              defaultDefinitions={PLAYGROUND_DEFAULT_DEFINITIONS}
              defaultGraphingData={PLAYGROUND_GRAPHING_DATA}
              defaultStatisticsData={PLAYGROUND_STATISTICS_DATA}
              defaultToolsData={PLAYGROUND_TOOLS_DATA}
            />
          }
          code={snippet}
          previewLabel="Calculator playground"
        />
      </div>
    </div>
  )
}
