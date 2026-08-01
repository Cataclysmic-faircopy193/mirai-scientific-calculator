import { Delete } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface ScientificKeyDefinition {
  label: string
  notation?: ScientificKeyNotation
  icon?: LucideIcon
  token?: string
  action?: "absolute" | "backspace" | "clear" | "evaluate" | "left" | "right"
  tone?: "default" | "operator" | "primary"
  ariaLabel?: string
  span?: 2
}

type ScientificKeyNotation =
  | { kind: "fraction"; numerator: string; denominator: string }
  | { kind: "root"; index: string; radicand: string }
  | { kind: "subscript"; base: string; script: string }
  | { kind: "superscript"; base: string; script: string }

const BASIC_KEYS: Array<ScientificKeyDefinition> = [
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
  { label: "x²", token: "²", notation: { kind: "superscript", base: "x", script: "2" } },
  { label: "√", token: "√(" },
  { label: "4" },
  { label: "5" },
  { label: "6" },
  { label: "−", tone: "operator", ariaLabel: "Subtract" },
  { label: "xʸ", token: "^", notation: { kind: "superscript", base: "x", script: "y" } },
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
  {
    label: "a⁄b",
    token: "÷",
    ariaLabel: "Fraction",
    notation: { kind: "fraction", numerator: "a", denominator: "b" },
  },
  {
    label: "=",
    action: "evaluate",
    tone: "primary",
    ariaLabel: "Equals",
    span: 2,
  },
]

const FUNCTION_KEYS: Array<ScientificKeyDefinition> = [
  { label: "x²", token: "²", notation: { kind: "superscript", base: "x", script: "2" } },
  { label: "x³", token: "³", notation: { kind: "superscript", base: "x", script: "3" } },
  { label: "xʸ", token: "^", notation: { kind: "superscript", base: "x", script: "y" } },
  { label: "√", token: "√(" },
  { label: "∛", token: "∛(" },
  {
    label: "1/x",
    token: "1÷(",
    notation: { kind: "fraction", numerator: "1", denominator: "x" },
  },
  { label: "|x|", action: "absolute", ariaLabel: "Absolute value" },
  {
    label: "10ˣ",
    token: "10^(",
    notation: { kind: "superscript", base: "10", script: "x" },
  },
  { label: "eˣ", token: "exp(", notation: { kind: "superscript", base: "e", script: "x" } },
  { label: "log", token: "log(" },
  { label: "ln", token: "ln(" },
  {
    label: "logᵦ",
    token: "logb(",
    ariaLabel: "Log base",
    notation: { kind: "subscript", base: "log", script: "b" },
  },
  {
    label: "n√x",
    token: "nthroot(",
    ariaLabel: "Nth root",
    notation: { kind: "root", index: "n", radicand: "x" },
  },
  { label: "x!", token: "!" },
  { label: "%", token: "%" },
  { label: "abs", token: "abs(" },
  { label: "floor", token: "floor(" },
  { label: "ceil", token: "ceil(" },
  { label: "round", token: "round(" },
  { label: "mod", token: "mod(" },
]

const TRIG_KEYS: Array<ScientificKeyDefinition> = [
  { label: "sin", token: "sin(" },
  { label: "cos", token: "cos(" },
  { label: "tan", token: "tan(" },
  { label: "sec", token: "sec(" },
  { label: "csc", token: "csc(" },
  { label: "cot", token: "cot(" },
  {
    label: "sin⁻¹",
    token: "asin(",
    notation: { kind: "superscript", base: "sin", script: "−1" },
  },
  {
    label: "cos⁻¹",
    token: "acos(",
    notation: { kind: "superscript", base: "cos", script: "−1" },
  },
  {
    label: "tan⁻¹",
    token: "atan(",
    notation: { kind: "superscript", base: "tan", script: "−1" },
  },
  { label: "sinh", token: "sinh(" },
  { label: "cosh", token: "cosh(" },
  { label: "tanh", token: "tanh(" },
  {
    label: "π/2",
    token: "π÷2",
    notation: { kind: "fraction", numerator: "π", denominator: "2" },
  },
  {
    label: "π/3",
    token: "π÷3",
    notation: { kind: "fraction", numerator: "π", denominator: "3" },
  },
  {
    label: "π/4",
    token: "π÷4",
    notation: { kind: "fraction", numerator: "π", denominator: "4" },
  },
  {
    label: "π/6",
    token: "π÷6",
    notation: { kind: "fraction", numerator: "π", denominator: "6" },
  },
  { label: "deg→rad", token: "×π÷180" },
  { label: "rad→deg", token: "×180÷π" },
  { label: "(", token: "(" },
  { label: ")", token: ")" },
]

const STATS_KEYS: Array<ScientificKeyDefinition> = [
  { label: "[ ]", token: "[" },
  { label: ",", token: "," },
  { label: "mean", token: "mean([" },
  { label: "median", token: "median([" },
  { label: "mode", token: "mode([" },
  { label: "Σ", token: "sum([" },
  { label: "min", token: "min([" },
  { label: "max", token: "max([" },
  { label: "range", token: "range([" },
  {
    label: "Q₁",
    token: "quartile([",
    notation: { kind: "subscript", base: "Q", script: "1" },
  },
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

const VARIABLE_KEYS: Array<ScientificKeyDefinition> = [
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

export const SCIENTIFIC_KEY_SETS = {
  basic: BASIC_KEYS,
  functions: FUNCTION_KEYS,
  trig: TRIG_KEYS,
  stats: STATS_KEYS,
  variables: VARIABLE_KEYS,
}

/** Available scientific keypad categories. */
export type ScientificKeypadTab = keyof typeof SCIENTIFIC_KEY_SETS

/** Returns a label-length bucket used to fit keypad text within compact buttons. */
export function getScientificKeyLabelSize(label: string) {
  const length = Array.from(label).length
  if (length === 1) {
    return "single"
  }
  if (length <= 3) {
    return "short"
  }
  if (length <= 5) {
    return "medium"
  }
  return "long"
}

export const SCIENTIFIC_EXAMPLES = [
  { expression: "(2÷3)+(1÷6)", label: "Add fractions" },
  { expression: "sin(30)", label: "sin(30°)" },
  { expression: "10ncr3", label: "10 choose 3" },
  { expression: "logb(2,32)", label: "log₂ 32" },
  { expression: "−3^2", label: "Order of operations" },
  { expression: "f(4)", label: "Use f(x)" },
]
