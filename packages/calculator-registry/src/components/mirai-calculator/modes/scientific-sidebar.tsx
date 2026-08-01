import { useRef } from "react"
import { X } from "lucide-react"

import { CalculatorEmptyStateAction } from "@/components/mirai-calculator/calculator-empty-state-action"
import { SCIENTIFIC_EXAMPLES } from "@/components/mirai-calculator/modes/scientific-keypad-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatExpressionInput } from "@openmirai/calculator-core/engine"
import { cn } from "@/lib/utils"

/** Completed scientific calculation shown in the local history panel. */
export interface ScientificHistoryEntry {
  id: number
  expression: string
  result: string
  value?: number
  error?: boolean
}

interface ScientificSidebarProps {
  definitions: Array<string>
  onDefinitionsChange: (definitions: Array<string>) => void
  history: Array<ScientificHistoryEntry>
  onHistoryClear: () => void
  onExpressionReuse: (expression: string) => void
}

/** Renders reusable definitions, calculation history, and scientific examples. */
export function ScientificSidebar({
  definitions,
  onDefinitionsChange,
  history,
  onHistoryClear,
  onExpressionReuse,
}: ScientificSidebarProps) {
  const definitionIdsRef = useRef<Array<number>>([])
  const nextDefinitionIdRef = useRef(0)
  while (definitionIdsRef.current.length < definitions.length) {
    nextDefinitionIdRef.current += 1
    definitionIdsRef.current.push(nextDefinitionIdRef.current)
  }
  definitionIdsRef.current.length = definitions.length

  const addDefinition = () => {
    nextDefinitionIdRef.current += 1
    definitionIdsRef.current.push(nextDefinitionIdRef.current)
    onDefinitionsChange([...definitions, ""])
  }

  const removeDefinition = (index: number) => {
    definitionIdsRef.current.splice(index, 1)
    onDefinitionsChange(definitions.filter((_, current) => current !== index))
  }

  const updateDefinition = (index: number, value: string) => {
    onDefinitionsChange(
      definitions.map((definition, current) => (current === index ? value : definition))
    )
  }

  return (
    <aside className="mirai-scientific-secondary flex min-h-0 flex-col bg-muted/25 @max-[699px]:min-h-75">
      <ScrollArea className="min-h-0 flex-1">
        <section className="border-b p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Definitions
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={addDefinition}
              className="h-6 px-1.5 text-xs text-primary"
            >
              Add
            </Button>
          </div>
          <div className="space-y-2.5">
            {definitions.map((definition, index) => (
              <div className="space-y-0.5" key={definitionIdsRef.current[index]}>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={definition}
                    onChange={(event) => updateDefinition(index, event.target.value)}
                    placeholder="a = 5"
                    aria-label={`Definition ${index + 1}`}
                    className="h-8 rounded-md bg-background px-2.5 font-sans text-sm font-medium"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeDefinition(index)}
                    aria-label={`Remove definition ${index + 1}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X />
                  </Button>
                </div>
                <p className="pl-0.5 text-xs text-muted-foreground">
                  Reusable in calculations and graphs
                </p>
              </div>
            ))}
            {definitions.length === 0 && (
              <p className="py-2 text-xs text-muted-foreground">
                <CalculatorEmptyStateAction label="Add definition" onClick={addDefinition} /> a
                variable or function definition.
              </p>
            )}
          </div>
        </section>

        <section className="min-h-47.5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              History
            </h3>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onHistoryClear}
                className="h-6 px-1.5 text-xs text-primary"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {history.map((entry) => (
              <Button
                key={entry.id}
                variant="outline"
                onClick={() => onExpressionReuse(entry.expression)}
                className="h-auto w-full flex-col items-stretch gap-0.5 rounded-lg px-3 py-2.5 text-left"
              >
                <span className="break-all text-xs text-muted-foreground">
                  <span className="font-[math,var(--font-sans,system-ui),sans-serif]!">
                    {entry.expression}
                  </span>
                </span>
                <span
                  className={cn(
                    "font-[math,var(--font-sans,system-ui),sans-serif]! text-lg font-semibold",
                    entry.error && "text-destructive"
                  )}
                >
                  {entry.result}
                </span>
              </Button>
            ))}
            {history.length === 0 && (
              <p className="px-3 py-5 text-center text-sm leading-5 text-muted-foreground">
                Your calculations appear here. Tap one to reuse it.
              </p>
            )}
          </div>
        </section>
      </ScrollArea>

      <section className="shrink-0 border-t p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Try this
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {SCIENTIFIC_EXAMPLES.map((example) => (
            <Button
              key={example.expression}
              variant="outline"
              size="sm"
              onClick={() => onExpressionReuse(formatExpressionInput(example.expression))}
              className="h-6.5 rounded-full px-2.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              {example.label}
            </Button>
          ))}
        </div>
      </section>

      <p className="shrink-0 border-t px-4 py-3 text-xs leading-5 text-muted-foreground">
        Type with your keyboard too—<strong>sin</strong>, <strong>sqrt</strong>, <strong>^</strong>,
        Enter to evaluate.
      </p>
    </aside>
  )
}
