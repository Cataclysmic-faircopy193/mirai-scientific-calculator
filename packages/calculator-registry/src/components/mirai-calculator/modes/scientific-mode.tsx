import { useMemo, useRef, useState } from "react"
import { Redo2, Undo2 } from "lucide-react"

import { ScientificKeypad } from "@/components/mirai-calculator/modes/scientific-keypad"
import type {
  ScientificKeyDefinition,
  ScientificKeypadTab,
} from "@/components/mirai-calculator/modes/scientific-keypad-config"
import { ScientificSidebar } from "@/components/mirai-calculator/modes/scientific-sidebar"
import type { ScientificHistoryEntry } from "@/components/mirai-calculator/modes/scientific-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { completeExpression, formatExpressionInput } from "@openmirai/calculator-core/engine"
import type { CalculatorEngine, NumberFormatOptions } from "@openmirai/calculator-core/engine"
import { cn } from "@/lib/utils"

export interface ScientificModeProps {
  engine: CalculatorEngine
  definitions: Array<string>
  onDefinitionsChange: (definitions: Array<string>) => void
  onAnsChange: (answer: number) => void
  formatOptions: NumberFormatOptions
}

/** Renders the scientific expression workspace and calculator keypad. */
export function ScientificMode({
  engine,
  definitions,
  onDefinitionsChange,
  onAnsChange,
  formatOptions,
}: ScientificModeProps) {
  const [expression, setExpression] = useState("")
  const [tab, setTab] = useState<ScientificKeypadTab>("basic")
  const [history, setHistory] = useState<Array<ScientificHistoryEntry>>([])
  const [fractionView, setFractionView] = useState(false)
  const [undoStack, setUndoStack] = useState<Array<string>>([])
  const [redoStack, setRedoStack] = useState<Array<string>>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const nextHistoryIdRef = useRef(0)
  const liveResult = useMemo(() => {
    if (!expression.trim()) {
      return null
    }
    try {
      const value = engine.evaluate(completeExpression(expression))
      const fraction = fractionView && typeof value === "number" ? engine.toFraction(value) : null
      return {
        value,
        text: fraction ?? formatExpressionInput(engine.format(value, formatOptions)),
        note: fraction ? "exact fraction" : "=",
        error: false,
      }
    } catch (error) {
      return {
        value: undefined,
        text: error instanceof Error ? error.message : "Invalid expression",
        note: "",
        error: true,
      }
    }
  }, [engine, expression, formatOptions, fractionView])

  const updateExpression = (next: string) => {
    setUndoStack((stack) => [expression, ...stack].slice(0, 50))
    setRedoStack([])
    setExpression(next)
  }

  const updateTypedExpression = (next: string, selectionStart: number, selectionEnd: number) => {
    const formatted = formatExpressionInput(next)
    const formattedStart = formatExpressionInput(next.slice(0, selectionStart)).length
    const formattedEnd = formatExpressionInput(next.slice(0, selectionEnd)).length
    updateExpression(formatted)
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(formattedStart, formattedEnd)
    })
  }

  const insert = (token: string) => {
    const input = inputRef.current
    const start = input?.selectionStart ?? expression.length
    const end = input?.selectionEnd ?? start
    const next = expression.slice(0, start) + token + expression.slice(end)
    updateExpression(next)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const removePreviousCharacter = () => {
    const input = inputRef.current
    const start = input?.selectionStart ?? expression.length
    const end = input?.selectionEnd ?? start
    if (start === 0 && end === 0) {
      return
    }
    const next =
      start === end
        ? expression.slice(0, start - 1) + expression.slice(end)
        : expression.slice(0, start) + expression.slice(end)
    updateExpression(next)
    const cursor = start === end ? start - 1 : start
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(cursor, cursor))
  }

  const insertAbsoluteValue = () => {
    const input = inputRef.current
    const start = input?.selectionStart ?? expression.length
    const end = input?.selectionEnd ?? start
    const selected = expression.slice(start, end)
    const wrapped = `|${selected}|`
    const next = expression.slice(0, start) + wrapped + expression.slice(end)
    updateExpression(next)
    const cursor = selected ? start + wrapped.length : start + 1
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(cursor, cursor)
    })
  }

  const commit = () => {
    if (!expression.trim()) {
      return
    }
    const completedExpression = completeExpression(expression)
    if (completedExpression !== expression) {
      setExpression(completedExpression)
    }
    try {
      const value = engine.evaluate(completedExpression)
      const result = formatExpressionInput(engine.format(value, formatOptions))
      if (typeof value === "number") {
        onAnsChange(value)
      }
      nextHistoryIdRef.current += 1
      const id = nextHistoryIdRef.current
      setHistory((entries) => {
        const current = entries[0]
        if (
          current?.expression === completedExpression &&
          current.result === result &&
          !current.error
        ) {
          return entries
        }

        return [
          {
            id,
            expression: completedExpression,
            result,
            value: typeof value === "number" ? value : undefined,
          },
          ...entries,
        ].slice(0, 40)
      })
    } catch (error) {
      const result = error instanceof Error ? error.message : "Invalid expression"
      nextHistoryIdRef.current += 1
      const id = nextHistoryIdRef.current
      setHistory((entries) => {
        const current = entries[0]
        if (
          current?.expression === completedExpression &&
          current.result === result &&
          current.error
        ) {
          return entries
        }

        return [
          {
            id,
            expression: completedExpression,
            result,
            error: true,
          },
          ...entries,
        ].slice(0, 40)
      })
    }
  }

  const pressKey = (key: ScientificKeyDefinition) => {
    if (key.action === "absolute") {
      return insertAbsoluteValue()
    }
    if (key.action === "backspace") {
      return removePreviousCharacter()
    }
    if (key.action === "clear") {
      return updateExpression("")
    }
    if (key.action === "evaluate") {
      return commit()
    }
    insert(key.token ?? key.label)
  }

  const undo = () => {
    const previous = undoStack[0]
    if (previous === undefined) {
      return
    }
    setRedoStack((stack) => [expression, ...stack])
    setUndoStack((stack) => stack.slice(1))
    setExpression(previous)
  }

  const redo = () => {
    const next = redoStack[0]
    if (next === undefined) {
      return
    }
    setUndoStack((stack) => [expression, ...stack])
    setRedoStack((stack) => stack.slice(1))
    setExpression(next)
  }

  return (
    <div className="mirai-scientific-layout grid min-h-0 flex-1 grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)] overflow-hidden @max-[699px]:grid-cols-1 @max-[699px]:overflow-y-auto">
      <section className="mirai-scientific-primary flex min-h-0 min-w-0 flex-col overflow-hidden border-r @max-[699px]:min-h-112.5 @max-[699px]:border-r-0 @max-[699px]:border-b">
        <div className="flex min-h-33 shrink-0 flex-col justify-center gap-2 px-6 py-4">
          <label className="sr-only" htmlFor="mirai-expression">
            Calculator expression
          </label>
          <Input
            ref={inputRef}
            id="mirai-expression"
            value={expression}
            onChange={(event) =>
              updateTypedExpression(
                event.target.value,
                event.target.selectionStart ?? event.target.value.length,
                event.target.selectionEnd ?? event.target.value.length
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commit()
              }
            }}
            placeholder="Type or tap to start"
            autoComplete="off"
            spellCheck={false}
            className="h-auto border-0 bg-transparent px-0 text-right font-[math,var(--font-sans,system-ui),sans-serif]! text-3xl! font-semibold tracking-[-0.02em] shadow-none placeholder:font-sans focus-visible:ring-0 dark:bg-transparent sm:text-4xl!"
          />
          <div
            aria-live="polite"
            className={cn(
              "flex min-h-9 items-center justify-end gap-2 text-right",
              liveResult?.error && "text-destructive"
            )}
          >
            {liveResult?.note && (
              <span className="text-xs text-muted-foreground">{liveResult.note}</span>
            )}
            <span
              className={cn(
                "font-[math,var(--font-sans,system-ui),sans-serif]! text-2xl font-semibold tracking-[-0.015em] text-primary sm:text-3xl",
                liveResult?.error && "max-w-full text-lg leading-tight text-destructive sm:text-xl"
              )}
            >
              {liveResult?.text ?? " "}
            </span>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant={fractionView ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFractionView((visible) => !visible)}
            >
              {fractionView ? "Decimal" : "Fraction"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => insert("Ans")}>
              Use Ans
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={undo}
              disabled={undoStack.length === 0}
              aria-label="Undo expression edit"
            >
              <Undo2 />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={redo}
              disabled={redoStack.length === 0}
              aria-label="Redo expression edit"
            >
              <Redo2 />
            </Button>
          </div>
        </div>

        <ScientificKeypad tab={tab} onTabChange={setTab} onPressKey={pressKey} />
      </section>

      <ScientificSidebar
        definitions={definitions}
        onDefinitionsChange={onDefinitionsChange}
        history={history}
        onHistoryClear={() => setHistory([])}
        onExpressionReuse={updateExpression}
      />
    </div>
  )
}
