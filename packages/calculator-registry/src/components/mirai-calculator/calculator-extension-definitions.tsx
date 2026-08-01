import { GraphingMode } from "@/components/mirai-calculator/modes/graphing-mode"
import { ScientificMode } from "@/components/mirai-calculator/modes/scientific-mode"
import { StatisticsMode } from "@/components/mirai-calculator/modes/statistics-mode"
import { ToolsMode } from "@/components/mirai-calculator/modes/tools-mode"
import { CalculatorExtension } from "@openmirai/calculator-core/configuration"
import type {
  CalculatorEngine,
  AngleMode,
  NumberFormatOptions,
} from "@openmirai/calculator-core/engine"
import type { GraphingInitialData } from "@openmirai/calculator-core/graphing-data"
import type { GraphView } from "@openmirai/calculator-core/graphing-view"
import type { StatisticsInitialData } from "@openmirai/calculator-core/statistics-data"
import type { ToolsInitialData } from "@openmirai/calculator-core/tools"

interface ModeRendererProps {
  resetSignal: number
  engine: CalculatorEngine
  activeAngleMode: AngleMode
  ans: number
  definitions: Array<string>
  setDefinitions: (definitions: Array<string>) => void
  setAns: (ans: number) => void
  formatOptions: NumberFormatOptions
  formatNumber: (value: number) => string
  setVariables: (variables: Record<string, number>) => void
  graphView: GraphView
  setGraphView: (view: GraphView) => void
  graphGridVisible: boolean
  setGraphGridVisible: (visible: boolean) => void
  resolvedTheme: "light" | "dark"
  defaultGraphingData?: GraphingInitialData
  defaultStatisticsData?: StatisticsInitialData
  defaultToolsData?: ToolsInitialData
}

interface ExtensionDefinition {
  label: string
  compactLabel: string
  usesAngleMode: boolean
  hasGraphSettings: boolean
  render: (props: ModeRendererProps) => React.ReactNode
}

export const CALCULATOR_EXTENSION_DEFINITIONS: Record<CalculatorExtension, ExtensionDefinition> = {
  [CalculatorExtension.SCIENTIFIC]: {
    label: "Scientific",
    compactLabel: "Sci",
    usesAngleMode: true,
    hasGraphSettings: false,
    render: ({ resetSignal, engine, definitions, setDefinitions, setAns, formatOptions }) => (
      <ScientificMode
        key={`scientific-${resetSignal}`}
        engine={engine}
        definitions={definitions}
        onDefinitionsChange={setDefinitions}
        onAnsChange={setAns}
        formatOptions={formatOptions}
      />
    ),
  },
  [CalculatorExtension.GRAPHING]: {
    label: "Graphing",
    compactLabel: "Graph",
    usesAngleMode: true,
    hasGraphSettings: true,
    render: ({
      resetSignal,
      activeAngleMode,
      ans,
      definitions,
      formatNumber,
      setVariables,
      graphView,
      setGraphView,
      graphGridVisible,
      setGraphGridVisible,
      resolvedTheme,
      defaultGraphingData,
    }) => (
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
        defaultData={defaultGraphingData}
      />
    ),
  },
  [CalculatorExtension.STATISTICS]: {
    label: "Stats",
    compactLabel: "Stats",
    usesAngleMode: false,
    hasGraphSettings: false,
    render: ({ resetSignal, formatNumber, resolvedTheme, defaultStatisticsData }) => (
      <StatisticsMode
        key={`statistics-${resetSignal}`}
        formatNumber={formatNumber}
        colorScheme={resolvedTheme}
        defaultData={defaultStatisticsData}
      />
    ),
  },
  [CalculatorExtension.TOOLS]: {
    label: "Tools",
    compactLabel: "Tools",
    usesAngleMode: false,
    hasGraphSettings: false,
    render: ({ resetSignal, formatNumber, defaultToolsData }) => (
      <ToolsMode
        key={`tools-${resetSignal}`}
        formatNumber={formatNumber}
        defaultData={defaultToolsData}
      />
    ),
  },
}
