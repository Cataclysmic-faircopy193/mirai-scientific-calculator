import { CalculatorExtension } from "@openmirai/calculator-core/configuration"
import type {
  CalculatorExtension as CalculatorExtensionValue,
  CalculatorTheme,
} from "@openmirai/calculator-core/configuration"
import type { GraphingInitialData } from "@openmirai/calculator-core/graphing-data"
import type { StatisticsInitialData } from "@openmirai/calculator-core/statistics-data"
import type { ToolsInitialData } from "@openmirai/calculator-core/tools"

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
  backdrop: true,
}

export const PLAYGROUND_DEFAULT_DEFINITIONS = ["f(x) = 2x + 5", "g(x) = x² − 3x + 2"] as const

export const PLAYGROUND_PRACTICE_ANSWERS = ["−2 and −3", "2 and 3", "5 and 6", "1 and 6"] as const

export const PLAYGROUND_GRAPHING_DATA = {
  expressions: [
    { value: "y = a x² − 5x + 6", color: "#2a9d90" },
    { value: "y = 2x + 5", color: "#3b82f6" },
    {
      value: "a = 1",
      color: "#71717a",
      slider: { min: -2, max: 3, step: 0.1, value: 1 },
    },
    { value: "x² + y² = 25", color: "#f59e0b", visible: false },
    { value: "(2, 0), (3, 0)", color: "#8b5cf6", visible: false },
  ],
  table: {
    xLabel: "x₁",
    xValues: [0, 1, 2, 3],
    series: [
      { label: "y₁", color: "#f59e0b", values: [3, 5.1, 6.8, 9.2] },
      { label: "y₂", color: "#8b5cf6", values: [2, 4, 8, 16] },
    ],
  },
} as const satisfies GraphingInitialData

export const PLAYGROUND_STATISTICS_DATA = {
  xValues: [2, 4, 4, 5, 7, 8, 9, 12, 12, 15],
  yValues: [5.1, 8.9, 9.4, 11.2, 15.1, 17.3, 18.8, 25.2, 24.6, 30.4],
} as const satisfies StatisticsInitialData

export const PLAYGROUND_TOOLS_DATA = {
  percent: 15,
  percentOf: 240,
  ratioLeft: 18,
  ratioRight: 24,
  ratioScale: 3,
  x1: -2,
  y1: 1,
  x2: 4,
  y2: 9,
  radius: 5,
  base: 12,
  height: 7,
  depth: 4,
} as const satisfies ToolsInitialData

export const PLAYGROUND_EXTENSION_LAYOUT_TRANSITION = {
  type: "spring",
  stiffness: 480,
  damping: 38,
  mass: 0.72,
} as const

export const PLAYGROUND_CALCULATOR_GEOMETRY = {
  defaultWidth: 1040,
  defaultHeight: 660,
  defaultX: 64,
  defaultY: 76,
  minWidth: 320,
  minHeight: 520,
  hiddenSize: 48,
  boundaryGap: 16,
} as const

export const CALCULATOR_THEME_OPTIONS: ReadonlyArray<{
  label: string
  value: CalculatorTheme
}> = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
]

export const PLAYGROUND_SNIPPET_PREFIX = `import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"
import { CalculatorExtension } from "@openmirai/calculator-core/configuration"
import type { StatisticsInitialData } from "@openmirai/calculator-core/statistics-data"
import type { ToolsInitialData } from "@openmirai/calculator-core/tools"`

/** Parses a serialized extension list while preserving supported first occurrence order. */
export function parsePlaygroundExtensions(value: string): Array<CalculatorExtensionValue> {
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

/** Serializes configured calculator extensions for the playground URL. */
export function serializePlaygroundExtensions(
  extensions: ReadonlyArray<CalculatorExtensionValue>
): string {
  return extensions.join(",")
}

/** Moves an enabled extension by one position without changing disabled options. */
export function movePlaygroundExtension(
  extensions: ReadonlyArray<CalculatorExtensionValue>,
  extension: CalculatorExtensionValue,
  direction: -1 | 1
): Array<CalculatorExtensionValue> {
  const currentIndex = extensions.indexOf(extension)
  const nextIndex = currentIndex + direction
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= extensions.length) {
    return [...extensions]
  }

  const nextExtensions = [...extensions]
  const [selected] = nextExtensions.splice(currentIndex, 1)
  nextExtensions.splice(nextIndex, 0, selected)
  return nextExtensions
}

/** Orders enabled extension controls first, followed by disabled controls in catalog order. */
export function orderPlaygroundExtensionOptions<Extension extends { id: CalculatorExtensionValue }>(
  extensions: ReadonlyArray<CalculatorExtensionValue>,
  catalog: ReadonlyArray<Extension>
): Array<Extension> {
  const catalogById = new Map(catalog.map((extension) => [extension.id, extension]))
  const enabledExtensions = new Set(extensions)
  return [
    ...extensions.flatMap((extension) => {
      const option = catalogById.get(extension)
      return option ? [option] : []
    }),
    ...catalog.filter((extension) => !enabledExtensions.has(extension.id)),
  ]
}

/** Normalizes untrusted route search values into a valid playground configuration. */
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
  const backdrop =
    search.backdrop === undefined
      ? DEFAULT_PLAYGROUND_SEARCH.backdrop
      : search.backdrop === true || search.backdrop === "true"

  return {
    extensions,
    mode,
    calculatorTheme,
    backdrop,
  }
}

/** Generates the copyable calculator component snippet for a playground configuration. */
export function createPlaygroundSnippet({
  extensions,
  mode,
  calculatorTheme,
  statisticsData,
  toolsData,
}: {
  extensions: ReadonlyArray<CalculatorExtensionValue>
  mode?: CalculatorExtensionValue
  calculatorTheme: CalculatorTheme
  statisticsData: StatisticsInitialData
  toolsData: ToolsInitialData
}): string {
  const extensionLines = extensions.map(
    (extension) => `        CalculatorExtension.${extension.toUpperCase()},`
  )
  const modeLine = mode ? `\n      mode={CalculatorExtension.${mode.toUpperCase()}}` : ""
  const statisticsDataSource = `const statisticsData = {
  xValues: ${JSON.stringify(statisticsData.xValues ?? [])},
  yValues: ${JSON.stringify(statisticsData.yValues ?? [])},
} satisfies StatisticsInitialData`
  const toolsDataSource = `const toolsData = ${JSON.stringify(toolsData, null, 2)} satisfies ToolsInitialData`

  return `${PLAYGROUND_SNIPPET_PREFIX}

${statisticsDataSource}

${toolsDataSource}

/** Supplies a static source sample used by the syntax-highlighted playground preview. */
export function CalculatorWorkspace() {
  return (
    <MiraiCalculator
      extensions={[
${extensionLines.join("\n")}
      ]}${modeLine}
      defaultTheme="${calculatorTheme}"
      defaultStatisticsData={statisticsData}
      defaultToolsData={toolsData}
    />
  )
}`
}
