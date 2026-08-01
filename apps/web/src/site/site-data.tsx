import { BarChart3, Calculator, CirclePercent, LineChart } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { CalculatorExtension } from "@openmirai/calculator-core/configuration"
import type { CalculatorExtension as CalculatorExtensionValue } from "@openmirai/calculator-core/configuration"

export interface ExtensionDetail {
  id: CalculatorExtensionValue
  label: string
  eyebrow: string
  summary: string
  description: string
  icon: LucideIcon
  features: ReadonlyArray<string>
  example: string
}

export const EXTENSIONS: ReadonlyArray<ExtensionDetail> = [
  {
    id: CalculatorExtension.SCIENTIFIC,
    label: "Scientific",
    eyebrow: "Expression engine",
    summary: "A keyboard-first scientific calculator with definitions, memory, and history.",
    description:
      "Evaluate expressions, switch angle modes, define reusable functions, format results, and move quickly through a dense six-column keypad.",
    icon: Calculator,
    features: [
      "Degree and radian modes",
      "Variables and reusable function definitions",
      "History, answer memory, undo, and redo",
      "Fractions, roots, powers, logs, and trigonometry",
    ],
    example: `import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"
import { CalculatorExtension } from "@openmirai/calculator-core/configuration"

export function ScientificCalculator() {
  return (
    <MiraiCalculator
      extensions={[CalculatorExtension.SCIENTIFIC]}
      defaultMode={CalculatorExtension.SCIENTIFIC}
    />
  )
}`,
  },
  {
    id: CalculatorExtension.GRAPHING,
    label: "Graphing",
    eyebrow: "Interactive canvas",
    summary: "Plot expressions, trace curves, inspect roots, and animate variables.",
    description:
      "Compose explicit and implicit equations, pan and zoom the graph, trace values, inspect intersections, and connect expressions to animated sliders.",
    icon: LineChart,
    features: [
      "Explicit and implicit expressions",
      "Roots, extrema, and intersections",
      "Pan, zoom, grid, and curve tracing",
      "Sliders, tables, and regression summaries",
    ],
    example: `import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"
import { CalculatorExtension } from "@openmirai/calculator-core/configuration"

export function GraphingCalculator() {
  return (
    <MiraiCalculator
      extensions={[CalculatorExtension.GRAPHING]}
      defaultMode={CalculatorExtension.GRAPHING}
    />
  )
}`,
  },
  {
    id: CalculatorExtension.STATISTICS,
    label: "Statistics",
    eyebrow: "Data workspace",
    summary: "Explore distributions and regression models from editable datasets.",
    description:
      "Paste lists, compare chart types, calculate descriptive statistics, and fit six regression models with residual analysis.",
    icon: BarChart3,
    features: [
      "Scatter, histogram, box, dot, and residual charts",
      "Descriptive statistics and quantiles",
      "Correlation and covariance",
      "Six regression models with residuals",
    ],
    example: `import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"
import { CalculatorExtension } from "@openmirai/calculator-core/configuration"

export function StatisticsCalculator() {
  return (
    <MiraiCalculator
      extensions={[CalculatorExtension.STATISTICS]}
      defaultMode={CalculatorExtension.STATISTICS}
    />
  )
}`,
  },
  {
    id: CalculatorExtension.TOOLS,
    label: "Math tools",
    eyebrow: "Quick utilities",
    summary: "Focused percentage, ratio, coordinate, and shape calculations.",
    description:
      "Use small, purpose-built workflows for common arithmetic without turning the calculator into a step-by-step solver.",
    icon: CirclePercent,
    features: [
      "Percent increase and decrease",
      "Ratio simplification and scaling",
      "Distance, midpoint, and slope",
      "Circle, triangle, and prism measures",
    ],
    example: `import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"
import { CalculatorExtension } from "@openmirai/calculator-core/configuration"

export function MathToolsCalculator() {
  return (
    <MiraiCalculator
      extensions={[CalculatorExtension.TOOLS]}
      defaultMode={CalculatorExtension.TOOLS}
    />
  )
}`,
  },
] as const

export const ALL_EXTENSION_VALUES = EXTENSIONS.map((extension) => extension.id)

/** Resolves one extension descriptor by its URL-safe identifier. */
export function getExtension(value: string) {
  return EXTENSIONS.find((extension) => extension.id === value)
}

export interface SiteRouteItem {
  path: string
  label: string
  section: "Explore" | "Extensions" | "Docs"
  keywords: string
}

export const SITE_ROUTES: ReadonlyArray<SiteRouteItem> = [
  { path: "/", label: "Overview", section: "Explore", keywords: "home showcase calculator" },
  {
    path: "/playground",
    label: "Playground",
    section: "Explore",
    keywords: "compose configure extensions demo",
  },
  {
    path: "/extensions",
    label: "All extensions",
    section: "Extensions",
    keywords: "modes functionality catalog",
  },
  ...EXTENSIONS.map((extension) => ({
    path: `/extensions/${extension.id}`,
    label: extension.label,
    section: "Extensions" as const,
    keywords: `${extension.eyebrow} ${extension.summary} ${extension.features.join(" ")}`,
  })),
  {
    path: "/docs/installation",
    label: "Installation",
    section: "Docs",
    keywords: "shadcn add setup usage",
  },
  {
    path: "/docs/core",
    label: "Headless core",
    section: "Docs",
    keywords: "npm engine graphing statistics tools api",
  },
]
