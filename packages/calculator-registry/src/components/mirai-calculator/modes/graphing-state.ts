import { CALCULATOR_CHART_TOKENS } from "@/components/mirai-calculator/calculator-ui-config"
import type { GraphingInitialData } from "@openmirai/calculator-core/graphing-data"
import type { GraphPoint } from "@openmirai/calculator-core/graphing-view"

/** Editable graph expression state owned by the graphing interface. */
export interface GraphExpressionRow {
  id: number
  text: string
  color: string
  visible: boolean
  slider?: {
    min: number
    max: number
    step: number
    value: number
    playing: boolean
  }
}

/** Editable table row keyed by graph table column identifiers. */
export interface GraphTableRow {
  id: number
  values: Record<number, string>
}

/** Editable graph table column. */
export interface GraphTableColumn {
  id: number
  label: string
  color?: string
  role: "x" | "y"
}

/** Clustered graph-analysis point with presentation metadata. */
export interface GraphMarkCluster extends GraphPoint {
  labels: Array<string>
  colors: Array<string>
  count: number
}

/** Plottable table point connected to its editable source cells. */
export interface TableGraphPoint extends GraphPoint {
  rowId: number
  columnId: number
  color: string
}

/** Active trace point and its optional editable source. */
export interface GraphTrace extends GraphPoint {
  color: string
  source?:
    | { kind: "expression"; rowId: number }
    | { kind: "table"; rowId: number; columnId: number }
}

/** Maximum pointer distance in viewport pixels for selecting a graph point. */
export const GRAPH_POINT_HIT_RADIUS = 14

/** Maximum number of implicit-render cache entries retained by the graph canvas. */
export const IMPLICIT_CACHE_LIMIT = 24

/** Fixed graph-table index column width in pixels for canvas-independent table sizing. */
export const TABLE_INDEX_COLUMN_WIDTH = 36

/** Fixed editable graph-table value column width. */
export const TABLE_VALUE_COLUMN_WIDTH = 112

/** Fixed graph-table row-action column width. */
export const TABLE_ACTION_COLUMN_WIDTH = 32

/** Converts consumer graphing defaults into editable expression rows. */
export function createInitialGraphExpressionRows(
  data: GraphingInitialData | undefined
): Array<GraphExpressionRow> {
  return (data?.expressions ?? []).map((expression, index) => ({
    id: index + 1,
    text: expression.value,
    color: expression.color ?? CALCULATOR_CHART_TOKENS[index % CALCULATOR_CHART_TOKENS.length],
    visible: expression.visible ?? true,
    slider: expression.slider
      ? { ...expression.slider, playing: expression.slider.playing ?? false }
      : undefined,
  }))
}

/** Converts consumer graphing defaults into editable multi-variable table state. */
export function createInitialGraphTableState(data: GraphingInitialData | undefined): {
  columns: Array<GraphTableColumn>
  rows: Array<GraphTableRow>
} {
  const table = data?.table
  const series = table?.series?.length
    ? table.series
    : [{ label: "y₁", color: CALCULATOR_CHART_TOKENS[2], values: [] }]
  const columns: Array<GraphTableColumn> = [
    { id: 1, label: table?.xLabel ?? "x₁", role: "x" },
    ...series.map((item, index) => ({
      id: index + 2,
      label: item.label ?? `y${String(index + 1)}`,
      color: item.color ?? CALCULATOR_CHART_TOKENS[(index + 2) % CALCULATOR_CHART_TOKENS.length],
      role: "y" as const,
    })),
  ]
  const rowCount = Math.max(
    table?.xValues?.length ?? 0,
    ...series.map((item) => item.values.length)
  )
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => ({
    id: rowIndex + 1,
    values: Object.fromEntries([
      [1, String(table?.xValues?.[rowIndex] ?? "")],
      ...series.map((item, seriesIndex) => [seriesIndex + 2, String(item.values[rowIndex] ?? "")]),
    ]),
  }))
  return { columns, rows }
}
