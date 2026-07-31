import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react"

import {
  MiraiCalculator,
  type CalculatorExtension as CalculatorExtensionValue,
} from "@/components/mirai-calculator/mirai-calculator"
import { Badge } from "@/components/ui/badge"
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
  parsePlaygroundExtensions,
  serializePlaygroundExtensions,
  type PlaygroundSearch,
} from "@/site/constants/playground"
import { CodePreview } from "@/site/code-preview"
import { EXTENSIONS } from "@/site/site-data"

function moveExtension(
  extensions: readonly CalculatorExtensionValue[],
  extension: CalculatorExtensionValue,
  direction: -1 | 1
) {
  const currentIndex = extensions.indexOf(extension)
  const nextIndex = currentIndex + direction
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= extensions.length) return [...extensions]

  const nextExtensions = [...extensions]
  const [selected] = nextExtensions.splice(currentIndex, 1)
  nextExtensions.splice(nextIndex, 0, selected)
  return nextExtensions
}

export function PlaygroundPage({
  search,
  onSearchChange,
}: {
  search: PlaygroundSearch
  onSearchChange: (search: PlaygroundSearch) => void
}) {
  const extensions = parsePlaygroundExtensions(search.extensions)
  const activeMode = extensions.find((extension) => extension === search.mode) ?? extensions[0]
  const snippet = createPlaygroundSnippet({
    extensions,
    mode: activeMode,
    calculatorTheme: search.calculatorTheme,
    backdrop: search.backdrop,
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
      <div className="flex flex-col gap-5 border-b pb-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline" className="font-mono uppercase tracking-[0.16em]">
            URL-synced configuration
          </Badge>
          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em]">Playground</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
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
              {EXTENSIONS.map((extension) => {
                const enabled = extensions.includes(extension.id)
                const enabledIndex = extensions.indexOf(extension.id)
                return (
                  <div
                    key={extension.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border p-3"
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
                        onClick={() => setExtensions(moveExtension(extensions, extension.id, -1))}
                        aria-label={`Move ${extension.label} up`}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={!enabled || enabledIndex === extensions.length - 1}
                        onClick={() => setExtensions(moveExtension(extensions, extension.id, 1))}
                        aria-label={`Move ${extension.label} down`}
                      >
                        <ArrowDown />
                      </Button>
                    </div>
                  </div>
                )
              })}
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
                    <SelectValue placeholder="No extension enabled" />
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
                    <SelectValue />
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
            <MiraiCalculator
              extensions={extensions}
              mode={activeMode}
              onModeChange={(mode) => onSearchChange({ ...search, mode })}
              theme={search.calculatorTheme}
              showBackdrop={search.backdrop}
              height={search.backdrop ? 760 : 680}
              title="OpenMirai calculator playground"
            />
          }
          code={snippet}
          previewLabel="Calculator playground"
        />
      </div>
    </div>
  )
}
