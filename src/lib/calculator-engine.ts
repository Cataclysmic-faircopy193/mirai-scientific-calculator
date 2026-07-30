import {
  calculateStatistics,
  correlation,
  covariance,
  quantile,
} from "@/lib/statistics"

export type AngleMode = "degrees" | "radians"
export type CalculatorValue = number | boolean | number[]

export interface CalculatorEngineOptions {
  angleMode?: AngleMode
  ans?: number
  definitions?: string[]
  variables?: Record<string, number>
}

export interface NumberFormatOptions {
  decimals?: number | "auto"
  notation?: "auto" | "scientific"
  significantFigures?: number
  thousandsSeparator?: boolean
}

interface Token {
  type:
    | "number"
    | "variable"
    | "function"
    | "+"
    | "-"
    | "*"
    | "/"
    | "^"
    | "!"
    | "%"
    | "("
    | ")"
    | "["
    | "]"
    | "{"
    | "}"
    | "|"
    | ","
    | ":"
    | "<"
    | ">"
    | "<="
    | ">="
    | "="
    | "!="
  value?: number | string
}

interface AstNode {
  op:
    | "number"
    | "list"
    | "variable"
    | "compare"
    | "piecewise"
    | "variableCall"
    | "call"
    | "+"
    | "-"
    | "*"
    | "/"
    | "^"
    | "negative"
    | "percent"
    | "factorial"
  value?: number | string
  left?: AstNode
  right?: AstNode
  relation?: string
  name?: string
  functionName?: string
  args?: AstNode[]
  items?: AstNode[]
  clauses?: Array<{ condition: AstNode | null; value: AstNode }>
}

interface FunctionDefinition {
  parameters: string[]
  source: string
}

interface EvaluationScope {
  locals: Record<string, number>
  variables: Record<string, string>
  functions: Record<string, FunctionDefinition>
  cache: Record<string, number>
  resolving: Set<string>
  depth: number
}

const TOKEN_REPLACEMENTS: Array<[string, string]> = [
  ["×", "*"],
  ["÷", "/"],
  ["−", "-"],
  ["–", "-"],
  ["π", "pi"],
  ["√", "sqrt"],
  ["∛", "cbrt"],
  ["²", "^2"],
  ["³", "^3"],
  ["·", "*"],
  ["≤", "<="],
  ["≥", ">="],
  ["≠", "!="],
  ["⁻¹", "^-1"],
]

const FUNCTION_NAMES = [
  "arcsin",
  "arccos",
  "arctan",
  "arcsec",
  "arccsc",
  "arccot",
  "asin",
  "acos",
  "atan",
  "asec",
  "acsc",
  "acot",
  "sinh",
  "cosh",
  "tanh",
  "nthroot",
  "stdevp",
  "quartile",
  "quantile",
  "median",
  "length",
  "count",
  "total",
  "stdev",
  "sqrt",
  "cbrt",
  "floor",
  "round",
  "range",
  "varp",
  "corr",
  "sort",
  "mean",
  "mode",
  "ceil",
  "logb",
  "ncr",
  "npr",
  "sign",
  "gcd",
  "lcm",
  "mod",
  "min",
  "max",
  "sum",
  "var",
  "iqr",
  "cov",
  "sin",
  "cos",
  "tan",
  "sec",
  "csc",
  "cot",
  "log",
  "ln",
  "exp",
  "abs",
] as const

const LIST_FUNCTIONS = new Set([
  "count",
  "total",
  "sum",
  "mean",
  "median",
  "mode",
  "range",
  "quartile",
  "quantile",
  "stdev",
  "stdevp",
  "var",
  "varp",
  "iqr",
  "min",
  "max",
  "sort",
  "length",
  "corr",
  "cov",
])

function isNumericArray(value: CalculatorValue): value is number[] {
  return Array.isArray(value)
}

function asNumber(value: CalculatorValue): number {
  if (typeof value !== "number") {
    throw new Error("A numeric value is required")
  }
  return value
}

function cleanNumber(value: number): number {
  if (Math.abs(value) < 1e-12) return 0
  if (Math.abs(value - Math.round(value)) < 1e-12) return Math.round(value)
  return value
}

export function greatestCommonDivisor(a: number, b: number): number {
  let left = Math.abs(Math.round(a))
  let right = Math.abs(Math.round(b))

  while (right !== 0) {
    ;[left, right] = [right, left % right]
  }
  return left
}

export function factorial(value: number): number {
  if (value < 0 || !Number.isInteger(value)) {
    throw new Error("Factorial needs a non-negative whole number")
  }
  if (value > 170) throw new Error("Result is too large to display")

  let result = 1
  for (let current = 2; current <= value; current += 1) result *= current
  return result
}

function permutations(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    throw new Error("nPr needs whole numbers where 0 ≤ r ≤ n")
  }

  let result = 1
  for (let index = 0; index < r; index += 1) result *= n - index
  return result
}

export class CalculatorEngine {
  private angleMode: AngleMode
  private ans: number
  private definitions: string[]
  private variables: Record<string, number>
  private readonly astCache = new Map<string, AstNode>()

  constructor(options: CalculatorEngineOptions = {}) {
    this.angleMode = options.angleMode ?? "degrees"
    this.ans = options.ans ?? 0
    this.definitions = options.definitions ?? []
    this.variables = options.variables ?? {}
  }

  setAngleMode(angleMode: AngleMode) {
    this.angleMode = angleMode
  }

  setAns(ans: number) {
    this.ans = ans
  }

  setDefinitions(definitions: string[]) {
    this.definitions = definitions
    this.astCache.clear()
  }

  setVariables(variables: Record<string, number>) {
    this.variables = variables
  }

  evaluate(expression: string, locals: Record<string, number> = {}): CalculatorValue {
    if (!expression.trim()) throw new Error("Enter an expression")
    return this.evaluateNode(this.parseCached(expression), this.createScope(locals))
  }

  normalize(expression: string): string {
    let normalized = String(expression)
    for (const [source, target] of TOKEN_REPLACEMENTS) {
      normalized = normalized.split(source).join(target)
    }

    return normalized
      .replace(/\s+/g, "")
      .replace(/(\d+(?:\.\d+)?)ncr(\d+(?:\.\d+)?)/gi, "ncr($1,$2)")
      .replace(/(\d+(?:\.\d+)?)npr(\d+(?:\.\d+)?)/gi, "npr($1,$2)")
  }

  format(value: CalculatorValue, options: NumberFormatOptions = {}): string {
    if (typeof value === "boolean") return value ? "true" : "false"
    if (Array.isArray(value)) {
      const visible = value
        .slice(0, 12)
        .map((item) => this.format(item, options))
        .join(", ")
      return `[${visible}${value.length > 12 ? ", …" : ""}]`
    }
    if (!Number.isFinite(value)) return "—"
    if (value === 0) return "0"

    const significantFigures = Math.max(
      1,
      Math.min(15, options.significantFigures ?? 12),
    )
    const absolute = Math.abs(value)
    if (
      options.notation === "scientific" ||
      absolute >= 1e12 ||
      absolute < 1e-9
    ) {
      const [coefficient, exponent] = value
        .toExponential(significantFigures - 1)
        .split("e")
      return `${Number(coefficient)} × 10^${Number(exponent)}`
    }

    let formatted =
      options.decimals !== undefined && options.decimals !== "auto"
        ? value.toFixed(Math.max(0, Math.min(10, options.decimals)))
        : String(Number(value.toPrecision(significantFigures)))

    if (options.thousandsSeparator !== false) {
      const [integer, fraction] = formatted.split(".")
      const signedInteger = Number(integer).toLocaleString("en-US")
      formatted = fraction ? `${signedInteger}.${fraction}` : signedInteger
    }

    return formatted
  }

  toFraction(value: number, maximumDenominator = 9999): string | null {
    if (!Number.isFinite(value)) return null
    if (Number.isInteger(value)) return String(value)

    const sign = value < 0 ? -1 : 1
    const target = Math.abs(value)
    let x = target
    let previousNumerator = 0
    let numerator = 1
    let previousDenominator = 1
    let denominator = 0

    for (let iteration = 0; iteration < 32; iteration += 1) {
      const whole = Math.floor(x)
      ;[previousNumerator, numerator] = [
        numerator,
        whole * numerator + previousNumerator,
      ]
      ;[previousDenominator, denominator] = [
        denominator,
        whole * denominator + previousDenominator,
      ]

      if (
        denominator > maximumDenominator ||
        Math.abs(numerator / denominator - target) < 1e-12
      ) {
        break
      }
      const remainder = x - whole
      if (remainder < 1e-12) break
      x = 1 / remainder
    }

    if (
      denominator === 0 ||
      denominator > maximumDenominator ||
      Math.abs(numerator / denominator - target) > 1e-9
    ) {
      return null
    }
    return `${sign * numerator}/${denominator}`
  }

  private tokenize(source: string): Token[] {
    const expression = this.normalize(source)
    const tokens: Token[] = []
    let index = 0

    while (index < expression.length) {
      const character = expression[index]

      if (/[0-9.]/.test(character)) {
        let end = index
        while (end < expression.length && /[0-9.]/.test(expression[end])) end += 1
        if (
          /[eE]/.test(expression[end] ?? "") &&
          /[0-9+-]/.test(expression[end + 1] ?? "")
        ) {
          end += 1
          if (/[+-]/.test(expression[end])) end += 1
          while (end < expression.length && /[0-9]/.test(expression[end])) end += 1
        }
        const number = Number(expression.slice(index, end))
        if (!Number.isFinite(number)) throw new Error("Invalid number")
        tokens.push({ type: "number", value: number })
        index = end
        continue
      }

      if (/[a-zA-Z]/.test(character)) {
        const remaining = expression.slice(index).toLowerCase()
        const functionName = FUNCTION_NAMES.find((name) =>
          remaining.startsWith(name),
        )
        if (functionName) {
          tokens.push({ type: "function", value: functionName })
          index += functionName.length
          continue
        }
        if (remaining.startsWith("pi")) {
          tokens.push({ type: "number", value: Math.PI })
          index += 2
          continue
        }
        if (remaining.startsWith("ans")) {
          tokens.push({ type: "variable", value: "ans" })
          index += 3
          continue
        }
        if (remaining.startsWith("infinity")) {
          tokens.push({ type: "number", value: Number.POSITIVE_INFINITY })
          index += 8
          continue
        }
        tokens.push({ type: "variable", value: character.toLowerCase() })
        index += 1
        continue
      }

      const twoCharacters = expression.slice(index, index + 2)
      if (["<=", ">=", "!="].includes(twoCharacters)) {
        tokens.push({ type: twoCharacters as Token["type"] })
        index += 2
        continue
      }
      if ("+-*/^!%()[]{}|,:<>=".includes(character)) {
        tokens.push({ type: character as Token["type"] })
        index += 1
        continue
      }

      throw new Error(`Unexpected character "${character}"`)
    }

    return tokens
  }

  private parse(source: string): AstNode {
    const tokens = this.tokenize(source)
    let position = 0
    const peek = () => tokens[position]
    const eat = (type: Token["type"]) => {
      if (tokens[position]?.type !== type) return false
      position += 1
      return true
    }

    const parseTop = (): AstNode => {
      const left = parseExpression()
      const relation = peek()?.type
      if (
        relation &&
        ["<", ">", "<=", ">=", "=", "!="].includes(relation)
      ) {
        position += 1
        return {
          op: "compare",
          relation,
          left,
          right: parseExpression(),
        }
      }
      return left
    }

    const parseExpression = (): AstNode => {
      let node = parseTerm()
      while (peek()?.type === "+" || peek()?.type === "-") {
        const op = tokens[position].type as "+" | "-"
        position += 1
        node = { op, left: node, right: parseTerm() }
      }
      return node
    }

    const startsImplicitTerm = (token: Token | undefined) =>
      token &&
      ["number", "variable", "function", "(", "|", "["].includes(token.type)

    const parseTerm = (): AstNode => {
      let node = parseUnary()
      for (;;) {
        const token = peek()
        if (token?.type === "*" || token?.type === "/") {
          position += 1
          node = { op: token.type, left: node, right: parseUnary() }
          continue
        }
        if (startsImplicitTerm(token)) {
          node = { op: "*", left: node, right: parseUnary() }
          continue
        }
        break
      }
      return node
    }

    const parseUnary = (): AstNode => {
      if (eat("-")) return { op: "negative", left: parseUnary() }
      if (eat("+")) return parseUnary()
      return parsePostfix()
    }

    const parsePostfix = (): AstNode => {
      let node = parsePower()
      for (;;) {
        if (eat("!")) {
          node = { op: "factorial", left: node }
          continue
        }
        if (eat("%")) {
          node = { op: "percent", left: node }
          continue
        }
        break
      }
      return node
    }

    const parsePower = (): AstNode => {
      const base = parseAtom()
      if (eat("^")) return { op: "^", left: base, right: parseUnary() }
      return base
    }

    const parseArguments = (): AstNode[] => {
      if (eat(")")) return []
      const args = [parseTop()]
      while (eat(",")) args.push(parseTop())
      if (!eat(")")) throw new Error("Missing closing parenthesis")
      return args
    }

    const parseAtom = (): AstNode => {
      const token = peek()
      if (!token) throw new Error("Expression is incomplete")

      if (token.type === "number") {
        position += 1
        return { op: "number", value: token.value as number }
      }

      if (token.type === "variable") {
        position += 1
        const name = token.value as string
        if (eat("(")) {
          return { op: "variableCall", name, args: parseArguments() }
        }
        return { op: "variable", value: name }
      }

      if (eat("[")) {
        if (eat("]")) return { op: "list", items: [] }
        const items = [parseTop()]
        while (eat(",")) items.push(parseTop())
        if (!eat("]")) throw new Error("Missing closing bracket")
        return { op: "list", items }
      }

      if (eat("{")) {
        const clauses: Array<{ condition: AstNode | null; value: AstNode }> = []
        do {
          const first = parseTop()
          if (eat(":")) {
            clauses.push({ condition: first, value: parseExpression() })
          } else {
            clauses.push({ condition: null, value: first })
          }
        } while (eat(","))
        if (!eat("}")) throw new Error("Missing closing brace in piecewise")
        return { op: "piecewise", clauses }
      }

      if (token.type === "function") {
        position += 1
        const functionName = token.value as string
        if (eat("(")) {
          return { op: "call", functionName, args: parseArguments() }
        }
        return { op: "call", functionName, args: [parseAtom()] }
      }

      if (eat("(")) {
        const node = parseTop()
        if (!eat(")")) throw new Error("Missing closing parenthesis")
        return node
      }

      if (eat("|")) {
        const node = parseTop()
        if (!eat("|")) throw new Error("Missing closing absolute-value bar")
        return { op: "call", functionName: "abs", args: [node] }
      }

      throw new Error("Unexpected symbol")
    }

    const root = parseTop()
    if (position < tokens.length) throw new Error("Unexpected symbol")
    return root
  }

  private parseCached(source: string): AstNode {
    const cached = this.astCache.get(source)
    if (cached) return cached
    const ast = this.parse(source)
    this.astCache.set(source, ast)
    return ast
  }

  private createScope(locals: Record<string, number>): EvaluationScope {
    const variableSources: Record<string, string> = {}
    const functions: Record<string, FunctionDefinition> = {}

    for (const [name, value] of Object.entries(this.variables)) {
      variableSources[name.toLowerCase()] = String(value)
    }

    for (const definition of this.definitions) {
      const equals = definition.indexOf("=")
      if (equals < 1) continue
      const left = definition.slice(0, equals).trim().toLowerCase()
      const source = definition.slice(equals + 1).trim()
      const functionMatch = left.match(
        /^([a-z])\(([a-z](?:\s*,\s*[a-z])*)\)$/,
      )

      if (functionMatch) {
        functions[functionMatch[1]] = {
          parameters: functionMatch[2].split(",").map((name) => name.trim()),
          source,
        }
      } else if (/^[a-z]$/.test(left)) {
        variableSources[left] = source
      }
    }

    return {
      locals: Object.fromEntries(
        Object.entries(locals).map(([key, value]) => [key.toLowerCase(), value]),
      ),
      variables: variableSources,
      functions,
      cache: {},
      resolving: new Set(),
      depth: 0,
    }
  }

  private lookup(name: string, scope: EvaluationScope): number {
    const key = name.toLowerCase()
    if (key === "ans") return this.ans
    if (key === "e") return Math.E
    if (key === "pi") return Math.PI
    if (key in scope.locals) return scope.locals[key]
    if (key in scope.cache) return scope.cache[key]
    if (!(key in scope.variables)) throw new Error(`Unknown variable "${name}"`)
    if (scope.resolving.has(key)) {
      throw new Error(`Circular definition for "${name}"`)
    }

    scope.resolving.add(key)
    const value = asNumber(
      this.evaluateNode(this.parseCached(scope.variables[key]), scope),
    )
    scope.resolving.delete(key)
    scope.cache[key] = value
    return value
  }

  private lift(
    operation: (left: number, right: number) => number | boolean,
    left: CalculatorValue,
    right: CalculatorValue,
  ): CalculatorValue {
    if (isNumericArray(left) || isNumericArray(right)) {
      const length = Math.max(
        isNumericArray(left) ? left.length : 0,
        isNumericArray(right) ? right.length : 0,
      )
      const results = Array.from({ length }, (_, index) =>
        operation(
          isNumericArray(left) ? left[index] : asNumber(left),
          isNumericArray(right) ? right[index] : asNumber(right),
        ),
      )
      if (results.every((value): value is number => typeof value === "number")) {
        return results
      }
      throw new Error("Boolean list results cannot be used here")
    }

    return operation(asNumber(left), asNumber(right))
  }

  private evaluateNode(node: AstNode, scope: EvaluationScope): CalculatorValue {
    const angleFactor = this.angleMode === "degrees" ? Math.PI / 180 : 1

    switch (node.op) {
      case "number":
        return node.value as number
      case "list":
        return (node.items ?? []).map((item) =>
          asNumber(this.evaluateNode(item, scope)),
        )
      case "variable":
        return this.lookup(node.value as string, scope)
      case "compare": {
        const left = this.evaluateNode(node.left!, scope)
        const right = this.evaluateNode(node.right!, scope)
        const relation = node.relation
        return this.lift(
          (a, b) =>
            relation === "<"
              ? a < b
              : relation === ">"
                ? a > b
                : relation === "<="
                  ? a <= b
                  : relation === ">="
                    ? a >= b
                    : relation === "!="
                      ? Math.abs(a - b) > 1e-12
                      : Math.abs(a - b) < 1e-12,
          left,
          right,
        )
      }
      case "piecewise": {
        for (const clause of node.clauses ?? []) {
          if (
            clause.condition === null ||
            this.evaluateNode(clause.condition, scope) === true
          ) {
            return this.evaluateNode(clause.value, scope)
          }
        }
        return Number.NaN
      }
      case "variableCall": {
        const definition = scope.functions[node.name!]
        if (!definition) {
          throw new Error(`Unknown function "${node.name}"`)
        }
        if (scope.depth > 30) throw new Error("Function recursion limit reached")
        const values = (node.args ?? []).map((argument) =>
          asNumber(this.evaluateNode(argument, scope)),
        )
        const functionLocals = { ...scope.locals }
        definition.parameters.forEach((parameter, index) => {
          functionLocals[parameter] = values[index] ?? Number.NaN
        })
        return this.evaluateNode(this.parseCached(definition.source), {
          ...scope,
          locals: functionLocals,
          depth: scope.depth + 1,
        })
      }
      case "+":
        return this.lift(
          (a, b) => a + b,
          this.evaluateNode(node.left!, scope),
          this.evaluateNode(node.right!, scope),
        )
      case "-":
        return this.lift(
          (a, b) => a - b,
          this.evaluateNode(node.left!, scope),
          this.evaluateNode(node.right!, scope),
        )
      case "*":
        return this.lift(
          (a, b) => a * b,
          this.evaluateNode(node.left!, scope),
          this.evaluateNode(node.right!, scope),
        )
      case "/":
        return this.lift(
          (a, b) => {
            if (b === 0) throw new Error("Undefined: division by zero")
            return a / b
          },
          this.evaluateNode(node.left!, scope),
          this.evaluateNode(node.right!, scope),
        )
      case "^":
        return this.lift(
          (a, b) => {
            if (a === 0 && b < 0) {
              throw new Error("Undefined: zero to a negative power")
            }
            if (a < 0 && !Number.isInteger(b)) {
              throw new Error("Result is not a real number")
            }
            return Math.pow(a, b)
          },
          this.evaluateNode(node.left!, scope),
          this.evaluateNode(node.right!, scope),
        )
      case "negative":
        return this.lift(
          (value) => -value,
          this.evaluateNode(node.left!, scope),
          0,
        )
      case "percent":
        return this.lift(
          (value) => value / 100,
          this.evaluateNode(node.left!, scope),
          0,
        )
      case "factorial":
        return factorial(asNumber(this.evaluateNode(node.left!, scope)))
      case "call": {
        const values = (node.args ?? []).map((argument) =>
          this.evaluateNode(argument, scope),
        )
        if (LIST_FUNCTIONS.has(node.functionName!)) {
          return this.evaluateListFunction(node.functionName!, values)
        }
        if (values.some(isNumericArray)) {
          const length = Math.max(
            ...values.map((value) => (isNumericArray(value) ? value.length : 0)),
          )
          return Array.from({ length }, (_, index) =>
            this.evaluateScalarFunction(
              node.functionName!,
              values.map((value) =>
                isNumericArray(value) ? value[index] : asNumber(value),
              ),
              angleFactor,
            ),
          )
        }
        return this.evaluateScalarFunction(
          node.functionName!,
          values.map(asNumber),
          angleFactor,
        )
      }
    }
  }

  private flatten(values: CalculatorValue[]): number[] {
    return values.flatMap((value) =>
      Array.isArray(value) ? value : typeof value === "number" ? [value] : [],
    )
  }

  private evaluateListFunction(
    functionName: string,
    rawValues: CalculatorValue[],
  ): CalculatorValue {
    if (functionName === "corr" || functionName === "cov") {
      const left = Array.isArray(rawValues[0]) ? rawValues[0] : []
      const right = Array.isArray(rawValues[1]) ? rawValues[1] : []
      return functionName === "corr"
        ? correlation(left, right)
        : covariance(left, right)
    }

    const values = this.flatten(rawValues)
    if (values.length === 0) {
      throw new Error(`Not enough data for ${functionName}`)
    }
    const statistics = calculateStatistics(values)

    switch (functionName) {
      case "count":
      case "length":
        return statistics.n
      case "total":
      case "sum":
        return statistics.sum
      case "mean":
        return statistics.mean
      case "median":
        return statistics.median
      case "mode":
        return statistics.mode ?? Number.NaN
      case "min":
        return statistics.min
      case "max":
        return statistics.max
      case "range":
        return statistics.range
      case "quartile": {
        const last = rawValues.at(-1)
        return typeof last === "number" && rawValues.length > 1
          ? quantile(statistics.sorted, last / 4)
          : statistics.q1
      }
      case "quantile": {
        const percentile = rawValues.at(-1)
        if (typeof percentile !== "number") {
          throw new Error("quantile needs a percentile")
        }
        const sample =
          rawValues.length > 1
            ? this.flatten(rawValues.slice(0, -1)).sort((a, b) => a - b)
            : statistics.sorted
        return quantile(sample, percentile)
      }
      case "iqr":
        return statistics.iqr
      case "stdev":
        return statistics.sampleStandardDeviation
      case "stdevp":
        return statistics.populationStandardDeviation
      case "var":
        return statistics.sampleVariance
      case "varp":
        return statistics.populationVariance
      case "sort":
        return statistics.sorted
      default:
        throw new Error(`Unknown function "${functionName}"`)
    }
  }

  private evaluateScalarFunction(
    functionName: string,
    args: number[],
    angleFactor: number,
  ): number {
    const need = (count: number) => {
      if (args.length < count || !Number.isFinite(args[count - 1])) {
        throw new Error(`${functionName} needs ${count} values`)
      }
    }
    need(1)

    const inverseAngle = (radians: number) =>
      this.angleMode === "degrees" ? (radians * 180) / Math.PI : radians

    switch (functionName) {
      case "sin":
        return cleanNumber(Math.sin(args[0] * angleFactor))
      case "cos":
        return cleanNumber(Math.cos(args[0] * angleFactor))
      case "tan": {
        const cosine = Math.cos(args[0] * angleFactor)
        if (Math.abs(cosine) < 1e-14) {
          throw new Error("Undefined: tangent is not defined here")
        }
        return cleanNumber(Math.tan(args[0] * angleFactor))
      }
      case "sec":
        return cleanNumber(1 / Math.cos(args[0] * angleFactor))
      case "csc":
        return cleanNumber(1 / Math.sin(args[0] * angleFactor))
      case "cot":
        return cleanNumber(1 / Math.tan(args[0] * angleFactor))
      case "asin":
      case "arcsin":
        if (Math.abs(args[0]) > 1) throw new Error("Result is not a real number")
        return inverseAngle(Math.asin(args[0]))
      case "acos":
      case "arccos":
        if (Math.abs(args[0]) > 1) throw new Error("Result is not a real number")
        return inverseAngle(Math.acos(args[0]))
      case "atan":
      case "arctan":
        return inverseAngle(Math.atan(args[0]))
      case "asec":
      case "arcsec":
        if (Math.abs(args[0]) < 1) throw new Error("Result is not a real number")
        return inverseAngle(Math.acos(1 / args[0]))
      case "acsc":
      case "arccsc":
        if (Math.abs(args[0]) < 1) throw new Error("Result is not a real number")
        return inverseAngle(Math.asin(1 / args[0]))
      case "acot":
      case "arccot":
        return inverseAngle(Math.PI / 2 - Math.atan(args[0]))
      case "sinh":
        return Math.sinh(args[0])
      case "cosh":
        return Math.cosh(args[0])
      case "tanh":
        return Math.tanh(args[0])
      case "sqrt":
        if (args[0] < 0) throw new Error("Result is not a real number")
        return Math.sqrt(args[0])
      case "cbrt":
        return Math.cbrt(args[0])
      case "nthroot":
        need(2)
        return Math.sign(args[1]) * Math.abs(args[1]) ** (1 / args[0])
      case "log":
        if (args[0] <= 0) {
          throw new Error("Undefined: logarithm needs a positive value")
        }
        return Math.log10(args[0])
      case "ln":
        if (args[0] <= 0) {
          throw new Error("Undefined: logarithm needs a positive value")
        }
        return Math.log(args[0])
      case "logb":
        need(2)
        if (args[0] <= 0 || args[0] === 1 || args[1] <= 0) {
          throw new Error("Undefined logarithm base or value")
        }
        return Math.log(args[1]) / Math.log(args[0])
      case "exp":
        return Math.exp(args[0])
      case "abs":
        return Math.abs(args[0])
      case "floor":
        return Math.floor(args[0])
      case "ceil":
        return Math.ceil(args[0])
      case "round":
        return args.length > 1
          ? Math.round(args[0] * 10 ** args[1]) / 10 ** args[1]
          : Math.round(args[0])
      case "sign":
        return Math.sign(args[0])
      case "gcd":
        need(2)
        return greatestCommonDivisor(args[0], args[1])
      case "lcm":
        need(2)
        return (
          Math.abs(args[0] * args[1]) /
          greatestCommonDivisor(args[0], args[1])
        )
      case "mod":
        need(2)
        return ((args[0] % args[1]) + args[1]) % args[1]
      case "ncr":
        need(2)
        return permutations(args[0], args[1]) / factorial(args[1])
      case "npr":
        need(2)
        return permutations(args[0], args[1])
      case "min":
        return Math.min(...args)
      case "max":
        return Math.max(...args)
      case "mean":
        return args.reduce((sum, value) => sum + value, 0) / args.length
      case "median":
        return calculateStatistics(args).median
      case "stdev":
        return calculateStatistics(args).sampleStandardDeviation
      default:
        throw new Error(`Unknown function "${functionName}"`)
    }
  }
}

export function evaluateExpression(
  expression: string,
  options?: CalculatorEngineOptions,
): CalculatorValue {
  return new CalculatorEngine(options).evaluate(expression)
}
