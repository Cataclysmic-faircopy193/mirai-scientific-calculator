import {
  CalculatorExtension,
  type CalculatorExtension as CalculatorExtensionValue,
  type CalculatorTheme,
} from "@/components/mirai-calculator/mirai-calculator"

export interface PlaygroundSearch {
  extensions: string
  mode?: string
  calculatorTheme: CalculatorTheme
  backdrop: boolean
}

export const DEFAULT_PLAYGROUND_EXTENSIONS = [
  CalculatorExtension.SCIENTIFIC,
  CalculatorExtension.GRAPHING,
  CalculatorExtension.STATISTICS,
  CalculatorExtension.TOOLS,
] as const

export const DEFAULT_PLAYGROUND_SEARCH: PlaygroundSearch = {
  extensions: DEFAULT_PLAYGROUND_EXTENSIONS.join(","),
  mode: CalculatorExtension.SCIENTIFIC,
  calculatorTheme: "system",
  backdrop: false,
}

export const CALCULATOR_THEME_OPTIONS: readonly {
  label: string
  value: CalculatorTheme
}[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
]

export const PLAYGROUND_SNIPPET_PREFIX = `import {
  CalculatorExtension,
  MiraiCalculator,
} from "@/components/mirai-calculator/mirai-calculator"`

export function parsePlaygroundExtensions(value: string): CalculatorExtensionValue[] {
  const supported = new Set<unknown>(DEFAULT_PLAYGROUND_EXTENSIONS)
  return [
    ...new Set(
      value
        .split(",")
        .map((extension) => extension.trim())
        .filter((extension): extension is CalculatorExtensionValue => supported.has(extension))
    ),
  ]
}

export function serializePlaygroundExtensions(
  extensions: readonly CalculatorExtensionValue[]
): string {
  return extensions.join(",")
}

export function normalizePlaygroundSearch(search: Record<string, unknown>): PlaygroundSearch {
  const extensions =
    typeof search.extensions === "string"
      ? serializePlaygroundExtensions(parsePlaygroundExtensions(search.extensions))
      : DEFAULT_PLAYGROUND_SEARCH.extensions
  const parsedExtensions = parsePlaygroundExtensions(extensions)
  const mode =
    typeof search.mode === "string" &&
    parsedExtensions.includes(search.mode as CalculatorExtensionValue)
      ? search.mode
      : parsedExtensions[0]
  const calculatorTheme =
    search.calculatorTheme === "light" ||
    search.calculatorTheme === "dark" ||
    search.calculatorTheme === "system"
      ? search.calculatorTheme
      : DEFAULT_PLAYGROUND_SEARCH.calculatorTheme
  const backdrop = search.backdrop === true || search.backdrop === "true"

  return {
    extensions,
    mode,
    calculatorTheme,
    backdrop,
  }
}

export function createPlaygroundSnippet({
  extensions,
  mode,
  calculatorTheme,
  backdrop,
}: {
  extensions: readonly CalculatorExtensionValue[]
  mode?: CalculatorExtensionValue
  calculatorTheme: CalculatorTheme
  backdrop: boolean
}): string {
  const extensionLines = extensions.map(
    (extension) => `        CalculatorExtension.${extension.toUpperCase()},`
  )
  const modeLine = mode ? `\n      mode={CalculatorExtension.${mode.toUpperCase()}}` : ""

  return `${PLAYGROUND_SNIPPET_PREFIX}

export function CalculatorWorkspace() {
  return (
    <MiraiCalculator
      extensions={[
${extensionLines.join("\n")}
      ]}${modeLine}
      defaultTheme="${calculatorTheme}"
      showBackdrop={${String(backdrop)}}
    />
  )
}`
}
