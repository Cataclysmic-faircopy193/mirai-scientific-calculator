import { useMemo, useRef, useState } from "react"
import { Delete, Redo2, Undo2, X, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CalculatorEngine, NumberFormatOptions } from "@openmirai/calculator-core/engine"
import { cn } from "@/lib/utils"

interface HistoryEntry {
  id: number
  expression: string
  result: string
  value?: number
  error?: boolean
}

interface KeyDefinition {
  label: string
  icon?: LucideIcon
  token?: string
  action?: "absolute" | "backspace" | "clear" | "evaluate" | "left" | "right"
  tone?: "default" | "operator" | "primary"
  ariaLabel?: string
  span?: 2
}

export interface ScientificModeProps {
  engine: CalculatorEngine
  definitions: string[]
  onDefinitionsChange: (definitions: string[]) => void
  onAnsChange: (answer: number) => void
  formatOptions: NumberFormatOptions
}

const BASIC_KEYS: KeyDefinition[] = [
  { label: "(" },
  { label: ")" },
  { label: "%", ariaLabel: "Percent" },
  { label: "÷", tone: "operator", ariaLabel: "Divide" },
  {
    label: "Backspace",
    icon: Delete,
    action: "backspace",
    ariaLabel: "Backspace",
  },
  { label: "C", action: "clear", ariaLabel: "Clear" },
  { label: "7" },
  { label: "8" },
  { label: "9" },
  { label: "×", tone: "operator", ariaLabel: "Multiply" },
  { label: "x²", token: "²" },
  { label: "√", token: "√(" },
  { label: "4" },
  { label: "5" },
  { label: "6" },
  { label: "−", tone: "operator", ariaLabel: "Subtract" },
  { label: "xʸ", token: "^" },
  { label: "π", token: "π" },
  { label: "1" },
  { label: "2" },
  { label: "3" },
  { label: "+", tone: "operator", ariaLabel: "Add" },
  { label: "|x|", action: "absolute", ariaLabel: "Absolute value" },
  { label: "e", token: "e" },
  { label: "±", token: "−", ariaLabel: "Toggle sign" },
  { label: "0" },
  { label: "." },
  { label: "a⁄b", token: "÷", ariaLabel: "Fraction" },
  {
    label: "=",
    action: "evaluate",
    tone: "primary",
    ariaLabel: "Equals",
    span: 2,
  },
]

const FUNCTION_KEYS: KeyDefinition[] = [
  { label: "x²", token: "²" },
  { label: "x³", token: "³" },
  { label: "xʸ", token: "^" },
  { label: "√", token: "√(" },
  { label: "∛", token: "∛(" },
  { label: "1/x", token: "1÷(" },
  { label: "|x|", action: "absolute", ariaLabel: "Absolute value" },
  { label: "10ˣ", token: "10^(" },
  { label: "eˣ", token: "exp(" },
  { label: "log", token: "log(" },
  { label: "ln", token: "ln(" },
  { label: "logᵦ", token: "logb(" },
  { label: "n√x", token: "nthroot(" },
  { label: "x!", token: "!" },
  { label: "%", token: "%" },
  { label: "abs", token: "abs(" },
  { label: "floor", token: "floor(" },
  { label: "ceil", token: "ceil(" },
  { label: "round", token: "round(" },
  { label: "mod", token: "mod(" },
]

const TRIG_KEYS: KeyDefinition[] = [
  { label: "sin", token: "sin(" },
  { label: "cos", token: "cos(" },
  { label: "tan", token: "tan(" },
  { label: "sec", token: "sec(" },
  { label: "csc", token: "csc(" },
  { label: "cot", token: "cot(" },
  { label: "sin⁻¹", token: "asin(" },
  { label: "cos⁻¹", token: "acos(" },
  { label: "tan⁻¹", token: "atan(" },
  { label: "sinh", token: "sinh(" },
  { label: "cosh", token: "cosh(" },
  { label: "tanh", token: "tanh(" },
  { label: "π/2", token: "π÷2" },
  { label: "π/3", token: "π÷3" },
  { label: "π/4", token: "π÷4" },
  { label: "π/6", token: "π÷6" },
  { label: "deg→rad", token: "×π÷180" },
  { label: "rad→deg", token: "×180÷π" },
  { label: "(", token: "(" },
  { label: ")", token: ")" },
]

const STATS_KEYS: KeyDefinition[] = [
  { label: "[ ]", token: "[" },
  { label: ",", token: "," },
  { label: "mean", token: "mean([" },
  { label: "median", token: "median([" },
  { label: "mode", token: "mode([" },
  { label: "Σ", token: "sum([" },
  { label: "min", token: "min([" },
  { label: "max", token: "max([" },
  { label: "range", token: "range([" },
  { label: "Q₁", token: "quartile([" },
  { label: "σ", token: "stdevp([" },
  { label: "s", token: "stdev([" },
  { label: "variance", token: "var([" },
  { label: "IQR", token: "iqr([" },
  { label: "sort", token: "sort([" },
  { label: "nCr", token: "ncr(" },
  { label: "nPr", token: "npr(" },
  { label: "gcd", token: "gcd(" },
  { label: "lcm", token: "lcm(" },
  { label: "corr", token: "corr([" },
]

const VARIABLE_KEYS: KeyDefinition[] = [
  { label: "a" },
  { label: "b" },
  { label: "c" },
  { label: "d" },
  { label: "x" },
  { label: "y" },
  { label: "n" },
  { label: "r" },
  { label: "t" },
  { label: "Ans", token: "Ans" },
  { label: "π", token: "π" },
  { label: "e", token: "e" },
  { label: "=", token: "=" },
  { label: "<", token: "<" },
  { label: ">", token: ">" },
  { label: "{ }", token: "{" },
  { label: ":", token: ":" },
  { label: "[ ]", token: "[" },
  { label: "(", token: "(" },
  { label: ")", token: ")" },
]

const KEY_SETS = {
  basic: BASIC_KEYS,
  functions: FUNCTION_KEYS,
  trig: TRIG_KEYS,
  stats: STATS_KEYS,
  variables: VARIABLE_KEYS,
}

/** Returns a label-length bucket used to fit keypad text within compact buttons. */
function getKeyLabelSize(label: string) {
  const length = [...label].length
  if (length === 1) return "single"
  if (length <= 3) return "short"
  if (length <= 5) return "medium"
  return "long"
}

const EXAMPLES = [
  { expression: "(2÷3)+(1÷6)", label: "Add fractions" },
  { expression: "sin(30)", label: "sin(30°)" },
  { expression: "10ncr3", label: "10 choose 3" },
  { expression: "logb(2,32)", label: "log₂ 32" },
  { expression: "−3^2", label: "Order of operations" },
  { expression: "f(4)", label: "Use f(x)" },
]

/** Renders the scientific expression workspace and calculator keypad. */
export function ScientificMode({
  engine,
  definitions,
  onDefinitionsChange,
  onAnsChange,
  formatOptions,
}: ScientificModeProps) {
  const [expression, setExpression] = useState("")
  const [tab, setTab] = useState<keyof typeof KEY_SETS>("basic")
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [fractionView, setFractionView] = useState(false)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const liveResult = useMemo(() => {
    if (!expression.trim()) return null
    try {
      const value = engine.evaluate(expression)
      const fraction = fractionView && typeof value === "number" ? engine.toFraction(value) : null
      return {
        value,
        text: fraction ?? engine.format(value, formatOptions),
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
    if (start === 0 && end === 0) return
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
    if (!expression.trim()) return
    try {
      const value = engine.evaluate(expression)
      const result = engine.format(value, formatOptions)
      if (typeof value === "number") onAnsChange(value)
      setHistory((entries) =>
        [
          {
            id: Date.now(),
            expression,
            result,
            value: typeof value === "number" ? value : undefined,
          },
          ...entries,
        ].slice(0, 40)
      )
    } catch (error) {
      setHistory((entries) =>
        [
          {
            id: Date.now(),
            expression,
            result: error instanceof Error ? error.message : "Invalid expression",
            error: true,
          },
          ...entries,
        ].slice(0, 40)
      )
    }
  }

  const pressKey = (key: KeyDefinition) => {
    if (key.action === "absolute") return insertAbsoluteValue()
    if (key.action === "backspace") return removePreviousCharacter()
    if (key.action === "clear") return updateExpression("")
    if (key.action === "evaluate") return commit()
    insert(key.token ?? key.label)
  }

  const undo = () => {
    const previous = undoStack[0]
    if (previous === undefined) return
    setRedoStack((stack) => [expression, ...stack])
    setUndoStack((stack) => stack.slice(1))
    setExpression(previous)
  }

  const redo = () => {
    const next = redoStack[0]
    if (next === undefined) return
    setUndoStack((stack) => [expression, ...stack])
    setRedoStack((stack) => stack.slice(1))
    setExpression(next)
  }

  const updateDefinition = (index: number, value: string) => {
    onDefinitionsChange(
      definitions.map((definition, current) => (current === index ? value : definition))
    )
  }

  return (
    <div className="mirai-scientific-layout grid min-h-0 flex-1 grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)] overflow-hidden @max-[699px]:grid-cols-1 @max-[699px]:overflow-y-auto">
      <section className="mirai-scientific-primary flex min-h-0 min-w-0 flex-col overflow-hidden border-r @max-[699px]:min-h-[450px] @max-[699px]:border-r-0 @max-[699px]:border-b">
        <div className="flex min-h-[132px] shrink-0 flex-col justify-center gap-2 px-6 py-4">
          <label className="sr-only" htmlFor="mirai-expression">
            Calculator expression
          </label>
          <Input
            ref={inputRef}
            id="mirai-expression"
            value={expression}
            onChange={(event) => updateExpression(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commit()
              }
            }}
            placeholder="Type or tap to start"
            autoComplete="off"
            spellCheck={false}
            className="h-auto border-0 bg-transparent px-0 text-right font-sans !text-[28px] font-semibold tracking-[-0.02em] shadow-none focus-visible:ring-0 dark:bg-transparent sm:!text-[34px]"
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
                "font-sans text-2xl font-semibold tracking-[-0.015em] text-primary sm:text-[28px]",
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

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as keyof typeof KEY_SETS)}
          className="min-h-0 flex-1 gap-0"
        >
          <TabsList
            variant="line"
            className="mirai-keypad-tabs-list h-10! w-full flex-none justify-start gap-1 overflow-hidden rounded-none border-y bg-muted/45 px-4 py-0"
          >
            <TabsTrigger
              className="mirai-keypad-tab h-10 flex-none rounded-none bg-transparent! px-3 text-sm font-semibold text-muted-foreground shadow-none! hover:bg-transparent! data-active:bg-transparent! data-active:text-primary after:right-0 after:bottom-[-1px]! after:left-0 after:h-0.5! after:bg-primary!"
              value="basic"
            >
              Basic
            </TabsTrigger>
            <TabsTrigger
              className="mirai-keypad-tab h-10 flex-none rounded-none bg-transparent! px-3 text-sm font-semibold text-muted-foreground shadow-none! hover:bg-transparent! data-active:bg-transparent! data-active:text-primary after:right-0 after:bottom-[-1px]! after:left-0 after:h-0.5! after:bg-primary!"
              value="functions"
            >
              Functions
            </TabsTrigger>
            <TabsTrigger
              className="mirai-keypad-tab h-10 flex-none rounded-none bg-transparent! px-3 text-sm font-semibold text-muted-foreground shadow-none! hover:bg-transparent! data-active:bg-transparent! data-active:text-primary after:right-0 after:bottom-[-1px]! after:left-0 after:h-0.5! after:bg-primary!"
              value="trig"
            >
              Trig
            </TabsTrigger>
            <TabsTrigger
              className="mirai-keypad-tab h-10 flex-none rounded-none bg-transparent! px-3 text-sm font-semibold text-muted-foreground shadow-none! hover:bg-transparent! data-active:bg-transparent! data-active:text-primary after:right-0 after:bottom-[-1px]! after:left-0 after:h-0.5! after:bg-primary!"
              value="stats"
            >
              Stats
            </TabsTrigger>
            <TabsTrigger
              className="mirai-keypad-tab h-10 flex-none rounded-none bg-transparent! px-3 text-sm font-semibold text-muted-foreground shadow-none! hover:bg-transparent! data-active:bg-transparent! data-active:text-primary after:right-0 after:bottom-[-1px]! after:left-0 after:h-0.5! after:bg-primary!"
              value="variables"
            >
              Variables
            </TabsTrigger>
          </TabsList>
          <div className="grid min-h-[246px] flex-1 grid-cols-6 auto-rows-fr gap-2 p-4">
            {KEY_SETS[tab].map((key, index) => {
              const Icon = key.icon
              return (
                <Button
                  key={`${key.label}-${index}`}
                  variant={key.tone === "primary" ? "default" : "outline"}
                  onClick={() => pressKey(key)}
                  aria-label={key.ariaLabel ?? key.label}
                  data-key-label-size={key.icon ? "single" : getKeyLabelSize(key.label)}
                  className={cn(
                    "mirai-scientific-key h-auto min-h-11 min-w-0 overflow-hidden rounded-[6px] px-[clamp(0.125rem,1cqi,0.75rem)] font-sans text-[clamp(0.5rem,2.4cqi,1.0625rem)] leading-[1.15] font-medium whitespace-nowrap data-[key-label-size=single]:text-[clamp(0.875rem,5cqi,1.0625rem)] data-[key-label-size=short]:text-[clamp(0.7rem,4cqi,1.0625rem)] data-[key-label-size=medium]:text-[clamp(0.6rem,3.2cqi,1.0625rem)] data-[key-label-size=long]:px-px data-[key-label-size=long]:text-[clamp(0.46875rem,2.2cqi,1.0625rem)]",
                    key.tone === "operator" &&
                      "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10",
                    key.span === 2 && "col-span-2"
                  )}
                >
                  {Icon ? <Icon aria-hidden="true" /> : key.label}
                </Button>
              )
            })}
          </div>
        </Tabs>
      </section>

      <aside className="mirai-scientific-secondary flex min-h-0 flex-col bg-muted/25 @max-[699px]:min-h-[300px]">
        <ScrollArea className="min-h-0 flex-1">
          <section className="border-b p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Definitions
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDefinitionsChange([...definitions, ""])}
                className="h-6 px-1.5 text-xs text-primary"
              >
                Add
              </Button>
            </div>
            <div className="space-y-2.5">
              {definitions.map((definition, index) => (
                <div className="space-y-0.5" key={index}>
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={definition}
                      onChange={(event) => updateDefinition(index, event.target.value)}
                      placeholder="a = 5"
                      aria-label={`Definition ${index + 1}`}
                      className="h-8 rounded-md bg-background px-2.5 font-sans text-[15px] font-medium"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        onDefinitionsChange(definitions.filter((_, current) => current !== index))
                      }
                      aria-label={`Remove definition ${index + 1}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X />
                    </Button>
                  </div>
                  <p className="pl-0.5 text-[11px] text-muted-foreground">
                    Reusable in calculations and graphs
                  </p>
                </div>
              ))}
              {definitions.length === 0 && (
                <p className="py-2 text-xs text-muted-foreground">
                  Add a variable or function definition.
                </p>
              )}
            </div>
          </section>

          <section className="min-h-[190px] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                History
              </h3>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHistory([])}
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
                  onClick={() => updateExpression(entry.expression)}
                  className="h-auto w-full flex-col items-stretch gap-0.5 rounded-lg px-3 py-2.5 text-left"
                >
                  <span className="break-all text-xs text-muted-foreground">
                    {entry.expression}
                  </span>
                  <span
                    className={cn(
                      "font-sans text-[17px] font-semibold",
                      entry.error && "text-destructive"
                    )}
                  >
                    {entry.result}
                  </span>
                </Button>
              ))}
              {history.length === 0 && (
                <p className="px-3 py-5 text-center text-[13px] leading-5 text-muted-foreground">
                  Your calculations appear here. Tap one to reuse it.
                </p>
              )}
            </div>
          </section>
        </ScrollArea>

        <section className="shrink-0 border-t p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Try this
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <Button
                key={example.expression}
                variant="outline"
                size="sm"
                onClick={() => updateExpression(example.expression)}
                className="h-[26px] rounded-full px-2.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                {example.label}
              </Button>
            ))}
          </div>
        </section>

        <p className="shrink-0 border-t px-4 py-3 text-xs leading-5 text-muted-foreground">
          Type with your keyboard too—<strong>sin</strong>, <strong>sqrt</strong>,{" "}
          <strong>^</strong>, Enter to evaluate.
        </p>
      </aside>
    </div>
  )
}
