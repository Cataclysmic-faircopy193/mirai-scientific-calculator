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

const SCALAR_FUNCTION_ARITY: Record<string, number | readonly [number, number]> = {
  arcsin: 1,
  arccos: 1,
  arctan: 1,
  arcsec: 1,
  arccsc: 1,
  arccot: 1,
  asin: 1,
  acos: 1,
  atan: 1,
  asec: 1,
  acsc: 1,
  acot: 1,
  sin: 1,
  cos: 1,
  tan: 1,
  sec: 1,
  csc: 1,
  cot: 1,
  sinh: 1,
  cosh: 1,
  tanh: 1,
  sqrt: 1,
  cbrt: 1,
  log: 1,
  ln: 1,
  exp: 1,
  abs: 1,
  floor: 1,
  ceil: 1,
  sign: 1,
  nthroot: 2,
  logb: 2,
  gcd: 2,
  lcm: 2,
  mod: 2,
  ncr: 2,
  npr: 2,
  round: [1, 2],
}

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
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) {
    throw new Error("gcd needs safe whole numbers")
  }

  let left = Math.abs(a)
  let right = Math.abs(b)

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
  if (
    !Number.isSafeInteger(n) ||
    !Number.isSafeInteger(r) ||
    n < 0 ||
    r < 0 ||
    r > n
  ) {
    throw new Error("nPr needs whole numbers where 0 ≤ r ≤ n")
  }

  let result = 1
  for (let index = 0; index < r; index += 1) {
    result *= n - index
    if (!Number.isFinite(result)) {
      throw new Error("Result is too large to display")
    }
  }
  return result
}

function combinations(n: number, r: number): number {
  if (
    !Number.isSafeInteger(n) ||
    !Number.isSafeInteger(r) ||
    n < 0 ||
    r < 0 ||
    r > n
  ) {
    throw new Error("nCr needs whole numbers where 0 ≤ r ≤ n")
  }

  const count = Math.min(r, n - r)
  let result = 1
  for (let index = 1; index <= count; index += 1) {
    result = (result * (n - count + index)) / index
    if (!Number.isFinite(result)) {
      throw new Error("Result is too large to display")
    }
  }
  return cleanNumber(result)
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
        const match = expression
          .slice(index)
          .match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/)
        if (!match || expression[index + match[0].length] === ".") {
          throw new Error("Invalid number")
        }
        const number = Number(match[0])
        if (!Number.isFinite(number)) throw new Error("Invalid number")
        tokens.push({ type: "number", value: number })
        index += match[0].length
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

    const parseTop = (stopAtAbsoluteBar = false): AstNode => {
      const left = parseExpression(stopAtAbsoluteBar)
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
          right: parseExpression(stopAtAbsoluteBar),
        }
      }
      return left
    }

    const parseExpression = (stopAtAbsoluteBar = false): AstNode => {
      let node = parseTerm(stopAtAbsoluteBar)
      while (peek()?.type === "+" || peek()?.type === "-") {
        const op = tokens[position].type as "+" | "-"
        position += 1
        node = { op, left: node, right: parseTerm(stopAtAbsoluteBar) }
      }
      return node
    }

    const startsImplicitTerm = (
      token: Token | undefined,
      stopAtAbsoluteBar: boolean,
    ) =>
      Boolean(
        token &&
          !(stopAtAbsoluteBar && token.type === "|") &&
          ["number", "variable", "function", "(", "|", "["].includes(
            token.type,
          ),
      )

    const parseTerm = (stopAtAbsoluteBar = false): AstNode => {
      let node = parseUnary(stopAtAbsoluteBar)
      for (;;) {
        const token = peek()
        if (token?.type === "*" || token?.type === "/") {
          position += 1
          node = {
            op: token.type,
            left: node,
            right: parseUnary(stopAtAbsoluteBar),
          }
          continue
        }
        if (startsImplicitTerm(token, stopAtAbsoluteBar)) {
          node = {
            op: "*",
            left: node,
            right: parseUnary(stopAtAbsoluteBar),
          }
          continue
        }
        break
      }
      return node
    }

    const parseUnary = (stopAtAbsoluteBar = false): AstNode => {
      if (eat("-")) {
        return { op: "negative", left: parseUnary(stopAtAbsoluteBar) }
      }
      if (eat("+")) return parseUnary(stopAtAbsoluteBar)
      return parsePower(stopAtAbsoluteBar)
    }

    const parsePostfix = (stopAtAbsoluteBar = false): AstNode => {
      let node = parseAtom(stopAtAbsoluteBar)
      let usedFactorial = false
      let usedPercent = false
      for (;;) {
        if (eat("!")) {
          if (usedFactorial) {
            throw new Error("Repeated factorial is not supported")
          }
          usedFactorial = true
          node = { op: "factorial", left: node }
          continue
        }
        if (eat("%")) {
          if (usedPercent) {
            throw new Error("Repeated percent is not supported")
          }
          usedPercent = true
          node = { op: "percent", left: node }
          continue
        }
        break
      }
      return node
    }

    const parsePower = (stopAtAbsoluteBar = false): AstNode => {
      const base = parsePostfix(stopAtAbsoluteBar)
      if (eat("^")) {
        return {
          op: "^",
          left: base,
          right: parseUnary(stopAtAbsoluteBar),
        }
      }
      return base
    }

    const parseArguments = (): AstNode[] => {
      if (eat(")")) return []
      const args = [parseTop()]
      while (eat(",")) args.push(parseTop())
      if (!eat(")")) throw new Error("Missing closing parenthesis")
      return args
    }

    const parseAtom = (stopAtAbsoluteBar = false): AstNode => {
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
        return {
          op: "call",
          functionName,
          args: [parseAtom(stopAtAbsoluteBar)],
        }
      }

      if (eat("(")) {
        const node = parseTop()
        if (!eat(")")) throw new Error("Missing closing parenthesis")
        return node
      }

      if (eat("|")) {
        const node = parseTop(true)
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
      if (
        isNumericArray(left) &&
        isNumericArray(right) &&
        left.length !== right.length
      ) {
        throw new Error("Lists must have the same length")
      }
      const length = Math.max(
        isNumericArray(left) ? left.length : 0,
        isNumericArray(right) ? right.length : 0,
      )
      const results = Array.from({ length }, (_, index) => {
        const result = operation(
          isNumericArray(left) ? left[index] : asNumber(left),
          isNumericArray(right) ? right[index] : asNumber(right),
        )
        if (typeof result === "number" && !Number.isFinite(result)) {
          throw new Error("Result is outside the supported numeric range")
        }
        return result
      })
      if (results.every((value): value is number => typeof value === "number")) {
        return results
      }
      throw new Error("Boolean list results cannot be used here")
    }

    const result = operation(asNumber(left), asNumber(right))
    if (typeof result === "number" && !Number.isFinite(result)) {
      throw new Error("Result is outside the supported numeric range")
    }
    return result
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
        if (values.length !== definition.parameters.length) {
          throw new Error(
            `${node.name} needs ${definition.parameters.length} ${
              definition.parameters.length === 1 ? "value" : "values"
            }`,
          )
        }
        const functionLocals = { ...scope.locals }
        definition.parameters.forEach((parameter, index) => {
          functionLocals[parameter] = values[index]
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
            if (a === 0 && b === 0) {
              throw new Error("Undefined: zero to the zero power")
            }
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
        const functionName = node.functionName!
        if (LIST_FUNCTIONS.has(functionName)) {
          return this.evaluateListFunction(functionName, values)
        }
        const arity = SCALAR_FUNCTION_ARITY[functionName]
        const minimum = Array.isArray(arity) ? arity[0] : arity
        const maximum = Array.isArray(arity) ? arity[1] : arity
        if (
          arity === undefined ||
          values.length < minimum ||
          values.length > maximum
        ) {
          const expected =
            minimum === maximum ? String(minimum) : `${minimum} or ${maximum}`
          throw new Error(
            `${functionName} needs ${expected} ${
              maximum === 1 ? "value" : "values"
            }`,
          )
        }
        const evaluateScalar = (args: number[]) => {
          const result = this.evaluateScalarFunction(
            functionName,
            args,
            angleFactor,
          )
          if (!Number.isFinite(result)) {
            throw new Error("Result is outside the supported numeric range")
          }
          return result
        }
        if (values.some(isNumericArray)) {
          const length = Math.max(
            ...values.map((value) => (isNumericArray(value) ? value.length : 0)),
          )
          const listLengths = values
            .filter(isNumericArray)
            .map((value) => value.length)
          if (new Set(listLengths).size > 1) {
            throw new Error("Lists must have the same length")
          }
          return Array.from({ length }, (_, index) =>
            evaluateScalar(
              values.map((value) =>
                isNumericArray(value) ? value[index] : asNumber(value),
              ),
            ),
          )
        }
        return evaluateScalar(values.map(asNumber))
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
      if (
        rawValues.length !== 2 ||
        !Array.isArray(rawValues[0]) ||
        !Array.isArray(rawValues[1])
      ) {
        throw new Error(`${functionName} needs two lists`)
      }
      const left = rawValues[0]
      const right = rawValues[1]
      if (left.length !== right.length) {
        throw new Error("Paired lists must have the same length")
      }
      return functionName === "corr"
        ? correlation(left, right)
        : covariance(left, right)
    }

    if (functionName === "quantile") {
      if (
        rawValues.length !== 2 ||
        !Array.isArray(rawValues[0]) ||
        typeof rawValues[1] !== "number"
      ) {
        throw new Error("quantile needs a list and a percentile")
      }
      const percentile = rawValues[1]
      if (percentile < 0 || percentile > 1) {
        throw new Error("quantile percentile must be between 0 and 1")
      }
      const sample = [...rawValues[0]].sort((a, b) => a - b)
      if (sample.length === 0) throw new Error("Not enough data for quantile")
      return quantile(sample, percentile)
    }

    if (functionName === "quartile") {
      let sample: number[]
      let quartileIndex = 1
      if (rawValues.length === 2 && Array.isArray(rawValues[0])) {
        if (typeof rawValues[1] !== "number") {
          throw new Error("quartile needs a numeric quartile index")
        }
        sample = rawValues[0]
        quartileIndex = rawValues[1]
      } else if (rawValues.length === 1 && Array.isArray(rawValues[0])) {
        sample = rawValues[0]
      } else if (rawValues.some(isNumericArray)) {
        throw new Error("quartile needs one list and an optional index")
      } else {
        sample = this.flatten(rawValues)
      }
      if (
        !Number.isInteger(quartileIndex) ||
        quartileIndex < 0 ||
        quartileIndex > 4
      ) {
        throw new Error("quartile index must be a whole number from 0 to 4")
      }
      if (sample.length === 0) throw new Error("Not enough data for quartile")
      return quantile(
        [...sample].sort((a, b) => a - b),
        quartileIndex / 4,
      )
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
        if (statistics.mode === null) throw new Error("The data has no mode")
        return statistics.mode
      case "min":
        return statistics.min
      case "max":
        return statistics.max
      case "range":
        return statistics.range
      case "iqr":
        return statistics.iqr
      case "stdev":
        if (statistics.n < 2) {
          throw new Error("Sample standard deviation needs at least two values")
        }
        return statistics.sampleStandardDeviation
      case "stdevp":
        return statistics.populationStandardDeviation
      case "var":
        if (statistics.n < 2) {
          throw new Error("Sample variance needs at least two values")
        }
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
    if (args.some((value) => !Number.isFinite(value))) {
      throw new Error(`${functionName} needs finite values`)
    }
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
      case "sec": {
        const cosine = Math.cos(args[0] * angleFactor)
        if (Math.abs(cosine) < 1e-14) {
          throw new Error("Undefined: secant is not defined here")
        }
        return cleanNumber(1 / cosine)
      }
      case "csc": {
        const sine = Math.sin(args[0] * angleFactor)
        if (Math.abs(sine) < 1e-14) {
          throw new Error("Undefined: cosecant is not defined here")
        }
        return cleanNumber(1 / sine)
      }
      case "cot": {
        const sine = Math.sin(args[0] * angleFactor)
        if (Math.abs(sine) < 1e-14) {
          throw new Error("Undefined: cotangent is not defined here")
        }
        return cleanNumber(
          Math.cos(args[0] * angleFactor) / sine,
        )
      }
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
      case "nthroot": {
        need(2)
        const degree = args[0]
        const radicand = args[1]
        if (degree === 0) {
          throw new Error("Undefined: root degree cannot be zero")
        }
        if (
          radicand < 0 &&
          (!Number.isInteger(degree) || Math.abs(degree) % 2 === 0)
        ) {
          throw new Error("Result is not a real number")
        }
        return radicand < 0
          ? -(Math.abs(radicand) ** (1 / degree))
          : radicand ** (1 / degree)
      }
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
        if (args.length === 1) return Math.round(args[0])
        if (!Number.isInteger(args[1]) || Math.abs(args[1]) > 100) {
          throw new Error(
            "round precision must be a whole number from −100 to 100",
          )
        }
        return Math.round(args[0] * 10 ** args[1]) / 10 ** args[1]
      case "sign":
        return Math.sign(args[0])
      case "gcd":
        need(2)
        return greatestCommonDivisor(args[0], args[1])
      case "lcm":
        need(2)
        if (
          !Number.isSafeInteger(args[0]) ||
          !Number.isSafeInteger(args[1])
        ) {
          throw new Error("lcm needs safe whole numbers")
        }
        if (args[0] === 0 || args[1] === 0) return 0
        return Math.abs(
          (args[0] / greatestCommonDivisor(args[0], args[1])) * args[1],
        )
      case "mod":
        need(2)
        if (args[1] === 0) {
          throw new Error("Undefined: modulo by zero")
        }
        return ((args[0] % args[1]) + args[1]) % args[1]
      case "ncr":
        need(2)
        return combinations(args[0], args[1])
      case "npr":
        need(2)
        return permutations(args[0], args[1])
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
