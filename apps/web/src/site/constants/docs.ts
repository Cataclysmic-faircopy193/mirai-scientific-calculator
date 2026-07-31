export const DOCS_NAVIGATION = [
  { label: "Installation", to: "/docs/installation" },
  { label: "Headless core", to: "/docs/core" },
] as const

export const INSTALLATION_NOTES = [
  "Copies the calculator, all four modes, scoped styles, and the embedded OpenMirai mark.",
  "Adds the lightweight @openmirai/calculator-core package automatically.",
  "Uses your project’s configured shadcn style, including Base UI and Radix.",
  "Preserves host theme tokens and unrelated components.",
] as const

export const INSTALL_COMMAND = "pnpm dlx shadcn@latest add @openmirai/calculator"

export const AGENT_PROMPT =
  "Install the OpenMirai calculator with `pnpm dlx shadcn@latest add @openmirai/calculator`, then render `MiraiCalculator` with the Scientific and Graphing extensions enabled. Preserve the host application's theme tokens."

export const INSTALLATION_EXAMPLE = `import {
  CalculatorExtension,
  MiraiCalculator,
} from "@/components/mirai-calculator/mirai-calculator"

export function CalculatorWorkspace() {
  return (
    <MiraiCalculator
      extensions={[
        CalculatorExtension.SCIENTIFIC,
        CalculatorExtension.GRAPHING,
      ]}
      defaultMode={CalculatorExtension.SCIENTIFIC}
    />
  )
}`

export const CORE_INSTALL_COMMAND = "pnpm add @openmirai/calculator-core"

export const CORE_EXAMPLE = `import { evaluateExpression } from "@openmirai/calculator-core/engine"
import { calculateStatistics } from "@openmirai/calculator-core/statistics"

const result = evaluateExpression("sin(30) + sqrt(81)", {
  angleMode: "degrees",
})

const stats = calculateStatistics([2, 4, 4, 5, 7, 8, 9, 12])`

export const CORE_EXPORTS = [
  {
    path: "@openmirai/calculator-core/engine",
    purpose: "Expression evaluation, definitions, formatting, and calculator state.",
  },
  {
    path: "@openmirai/calculator-core/graphing",
    purpose: "Sampling, roots, extrema, intersections, regressions, and graph helpers.",
  },
  {
    path: "@openmirai/calculator-core/statistics",
    purpose: "Descriptive statistics, distributions, quantiles, and regression summaries.",
  },
  {
    path: "@openmirai/calculator-core/tools",
    purpose: "Percentage, ratio, coordinate, and geometry utilities.",
  },
] as const
