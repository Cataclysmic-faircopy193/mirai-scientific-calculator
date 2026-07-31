import { access, readFile } from "node:fs/promises"
import path from "node:path"

const registry = JSON.parse(await readFile("registry.json", "utf8"))
const calculator = registry.items?.find((item) => item.name === "calculator")

if (!calculator || calculator.type !== "registry:block") {
  throw new Error("registry.json must define calculator as a registry:block")
}

const expectedNpmDependencies = new Set([
  "@openmirai/calculator-core@^0.2.0",
  "lucide-react@^1.28.0",
])
const actualNpmDependencies = new Set(calculator.dependencies)

if (
  actualNpmDependencies.size !== expectedNpmDependencies.size ||
  [...expectedNpmDependencies].some((dependency) => !actualNpmDependencies.has(dependency))
) {
  throw new Error("Calculator registry npm dependencies must use explicit ranges")
}

const expectedDependencies = new Set([
  "badge",
  "button",
  "card",
  "input",
  "scroll-area",
  "select",
  "separator",
  "switch",
  "tabs",
  "textarea",
  "tooltip",
])
const actualDependencies = new Set(calculator.registryDependencies)

for (const dependency of expectedDependencies) {
  if (!actualDependencies.has(dependency)) {
    throw new Error(`Missing registry dependency: ${dependency}`)
  }
}

if (actualDependencies.size !== expectedDependencies.size) {
  throw new Error("Calculator registry dependencies contain unexpected items")
}

const targets = new Set()

for (const file of calculator.files) {
  await access(path.resolve("apps/web", file.path))

  if (
    file.path.includes("packages/calculator-core/") ||
    file.target?.startsWith("@lib/mirai-calculator/")
  ) {
    throw new Error(`Registry must consume calculator core instead of copying it: ${file.path}`)
  }

  if (!file.target?.startsWith("@components/mirai-calculator/")) {
    throw new Error(`Registry target is not calculator-scoped: ${file.target}`)
  }

  if (targets.has(file.target)) {
    throw new Error(`Duplicate registry target: ${file.target}`)
  }

  targets.add(file.target)
}

const css = await readFile(
  "packages/calculator-registry/src/components/mirai-calculator/mirai-calculator.css",
  "utf8"
)

for (const forbidden of [":root", "@layer base", "body {", "html {"]) {
  if (css.includes(forbidden)) {
    throw new Error(`Calculator registry CSS contains global selector: ${forbidden}`)
  }
}

if (/(^|})\s*\.dark\s*{/m.test(css)) {
  throw new Error("Calculator registry CSS must not override the consumer dark theme")
}

if (/#[\da-f]{3,8}\b/i.test(css)) {
  throw new Error("Calculator registry CSS must use consumer theme tokens")
}

console.log(`Validated ${calculator.files.length} calculator registry files.`)
