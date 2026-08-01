import { Play, Plus, Square, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalculatorEmptyStateAction } from "@/components/mirai-calculator/calculator-empty-state-action"
import type {
  GraphExpressionRow,
  GraphTableColumn,
  GraphTableRow,
  TableGraphPoint,
} from "@/components/mirai-calculator/modes/graphing-state"
import type { CompiledGraphExpression } from "@openmirai/calculator-core/graphing"
import type { RegressionResult } from "@openmirai/calculator-core/statistics"
import { cn } from "@/lib/utils"

interface GraphingSidebarProps {
  compiled: Array<{ row: GraphExpressionRow; expression: CompiledGraphExpression }>
  rows: Array<GraphExpressionRow>
  tableColumns: Array<GraphTableColumn>
  table: Array<GraphTableRow>
  tableMinimumWidth: number
  tableSeries: Array<{
    column: GraphTableColumn & { color: string }
    points: Array<TableGraphPoint>
    regression: RegressionResult
  }>
  formatNumber: (value: number) => string
  updateRow: (id: number, patch: Partial<GraphExpressionRow>) => void
  commitRows: React.Dispatch<React.SetStateAction<Array<GraphExpressionRow>>>
  addTableVariable: () => void
  addTableRow: () => void
  setTable: React.Dispatch<React.SetStateAction<Array<GraphTableRow>>>
  setTableColumns: React.Dispatch<React.SetStateAction<Array<GraphTableColumn>>>
  removeTableVariable: (columnId: number) => void
  updateCell: (rowId: number, columnId: number, value: string) => void
  addExpression: () => void
}

function describeGraphExpression(
  expression: CompiledGraphExpression,
  formatNumber: (value: number) => string
): string {
  switch (expression.kind) {
    case "invalid":
      return expression.message
    case "explicit":
      return "Plotted"
    case "implicit":
      return "Implicit relation"
    case "points":
      return `${expression.points.length} plotted points`
    case "variable":
      return `${expression.name} = ${formatNumber(expression.value)}`
  }
}

/** Renders graph expressions, editable table data, and regression summaries. */
export function GraphingSidebar({
  compiled,
  rows,
  tableColumns,
  table,
  tableMinimumWidth,
  tableSeries,
  formatNumber,
  updateRow,
  commitRows,
  addTableVariable,
  addTableRow,
  setTable,
  setTableColumns,
  removeTableVariable,
  updateCell,
  addExpression,
}: GraphingSidebarProps) {
  return (
    <aside className="mirai-graphing-sidebar flex min-h-0 flex-col border-r bg-card @max-[699px]:order-2 @max-[699px]:min-h-75 @max-[699px]:max-h-[50%] @max-[699px]:border-r-0 @max-[699px]:border-b">
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y">
          {compiled.map(({ row, expression }) => {
            const slider = row.slider
            return (
              <div key={row.id} className="flex gap-2.5 px-3 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => updateRow(row.id, { visible: !row.visible })}
                  aria-label={row.visible ? "Hide expression" : "Show expression"}
                  className="mt-0.5 size-5.5 shrink-0 rounded-full border-2 p-0"
                  style={{
                    borderColor: row.color,
                    backgroundColor: row.visible ? row.color : "transparent",
                  }}
                >
                  <span className="sr-only">{row.visible ? "Visible" : "Hidden"}</span>
                </Button>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={row.text}
                      onChange={(event) => updateRow(row.id, { text: event.target.value })}
                      aria-label={`Graph expression ${row.id}`}
                      placeholder="y = 2x + 5"
                      className="h-7 min-w-0 rounded-none border-0 border-b border-transparent bg-transparent px-0 font-mono text-base font-medium shadow-none focus-visible:border-primary focus-visible:ring-0 dark:bg-transparent"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        commitRows((current) => current.filter((item) => item.id !== row.id))
                      }
                      aria-label={`Delete expression ${row.id}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X />
                    </Button>
                  </div>
                  <p
                    className={cn(
                      "text-xs text-muted-foreground",
                      expression.kind === "invalid" && "text-destructive"
                    )}
                  >
                    {describeGraphExpression(expression, formatNumber)}
                  </p>
                  {slider && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{slider.min}</span>
                      <Input
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        step={slider.step}
                        value={slider.value}
                        onChange={(event) =>
                          updateRow(row.id, {
                            slider: {
                              ...slider,
                              value: Number(event.target.value),
                            },
                          })
                        }
                        aria-label={`Slider for expression ${row.id}`}
                        className="h-5 flex-1 border-0 p-0 shadow-none"
                      />
                      <span className="text-xs text-muted-foreground">{slider.max}</span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          updateRow(row.id, {
                            slider: {
                              ...slider,
                              playing: !slider.playing,
                            },
                          })
                        }
                        aria-label={slider.playing ? "Stop slider" : "Play slider"}
                        className="rounded-full text-primary"
                      >
                        {slider.playing ? <Square /> : <Play />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {rows.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-semibold">No expressions yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <CalculatorEmptyStateAction label="Add expression" onClick={addExpression} /> one to
                start graphing.
              </p>
            </div>
          )}

          <section className="p-3">
            <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
              <h3 className="mr-auto text-sm font-semibold">Table 1</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addTableVariable}
                className="h-7 rounded-md text-xs"
              >
                <Plus />
                Variable
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={addTableRow}
                className="h-7 rounded-md text-xs"
              >
                <Plus />
                Add row
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTable([])}
                className="h-7 rounded-md text-xs"
              >
                Clear
              </Button>
            </div>
            <div className="mirai-graphing-table-scroll min-w-0 max-w-full overflow-x-auto overscroll-x-contain border-y contain-[inline-size]">
              <table
                className="w-full table-fixed border-collapse text-sm"
                style={{ minWidth: tableMinimumWidth }}
              >
                <colgroup>
                  <col className="w-9" />
                  {tableColumns.map((column) => (
                    <col className="w-28" key={column.id} />
                  ))}
                  <col className="w-8" />
                </colgroup>
                <thead className="bg-muted/35">
                  <tr>
                    <th
                      scope="col"
                      className="w-9 border-r px-2 py-1 text-center font-mono text-xs text-muted-foreground"
                    >
                      #
                    </th>
                    {tableColumns.map((column) => (
                      <th key={column.id} scope="col" className="border-r p-0 font-normal">
                        <div className="flex items-center">
                          {column.color && (
                            <span
                              aria-hidden="true"
                              className="ml-2 size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: column.color }}
                            />
                          )}
                          <Input
                            value={column.label}
                            onChange={(event) =>
                              setTableColumns((current) =>
                                current.map((item) =>
                                  item.id === column.id
                                    ? { ...item, label: event.target.value }
                                    : item
                                )
                              )
                            }
                            aria-label={`Table variable ${column.label}`}
                            className="h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2 font-mono text-sm font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
                          />
                          {column.role === "y" && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeTableVariable(column.id)}
                              aria-label={`Remove variable ${column.label}`}
                              className="rounded-none text-muted-foreground hover:text-destructive"
                            >
                              <X />
                            </Button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th scope="col" className="w-8">
                      <span className="sr-only">Row actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row, rowIndex) => (
                    <tr key={row.id} className="border-t">
                      <th
                        scope="row"
                        className="border-r px-2 text-center font-mono text-xs font-normal text-muted-foreground"
                      >
                        {rowIndex + 1}
                      </th>
                      {tableColumns.map((column) => (
                        <td key={column.id} className="border-r p-0">
                          <Input
                            value={row.values[column.id] ?? ""}
                            onChange={(event) => updateCell(row.id, column.id, event.target.value)}
                            aria-label={`${column.label} row ${rowIndex + 1}`}
                            className="h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2 font-mono text-sm shadow-none focus-visible:ring-1 dark:bg-transparent"
                          />
                        </td>
                      ))}
                      <td className="p-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setTable((current) => current.filter((item) => item.id !== row.id))
                          }
                          aria-label={`Remove table row ${rowIndex + 1}`}
                          className="rounded-none text-muted-foreground hover:text-destructive"
                        >
                          <X />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {table.length === 0 && (
                    <tr>
                      <td
                        colSpan={tableColumns.length + 2}
                        className="h-12 px-3 text-center text-xs text-muted-foreground"
                      >
                        <CalculatorEmptyStateAction label="Add table row" onClick={addTableRow} /> a
                        row to plot table data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="p-3">
            <h3 className="mb-3 text-sm font-semibold">Regression</h3>
            <div className="space-y-3">
              {tableSeries.map(({ column, regression }) => (
                <div key={column.id}>
                  <Badge variant="secondary" className="mb-2 font-mono text-xs">
                    {column.label} ~ m{tableColumns[0]?.label ?? "x"} + b
                  </Badge>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["m", regression.params[1]?.value],
                      ["b", regression.params[0]?.value],
                      ["R²", regression.r2],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-lg border p-2">
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div
                          className={cn(
                            "font-mono text-sm font-semibold",
                            label === "R²" && "text-primary"
                          )}
                        >
                          {typeof value === "number" && Number.isFinite(value)
                            ? formatNumber(value)
                            : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {tableSeries.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  <CalculatorEmptyStateAction label="Add y variable" onClick={addTableVariable} /> a
                  y variable to fit data.
                </p>
              )}
            </div>
          </section>
        </div>
      </ScrollArea>

      <div className="flex shrink-0 gap-2 border-t bg-muted/35 p-3">
        <Button variant="outline" size="sm" onClick={addExpression} className="flex-1 rounded-md">
          <Plus />
          Expression
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => commitRows([])}
          className="rounded-md text-muted-foreground hover:text-destructive"
        >
          Clear all
        </Button>
      </div>
    </aside>
  )
}
