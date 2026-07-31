import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const coreDirectory = path.join(root, "packages", "calculator-core")
const pnpm = process.env.npm_execpath
const workspace = await mkdtemp(path.join(tmpdir(), "mirai-core-package-smoke-"))
const packDirectory = path.join(workspace, "package")
const consumer = path.join(workspace, "consumer")
const extracted = path.join(workspace, "extracted")
const packageName = "@openmirai/calculator-core"
const expectedRuntimeExports = {
  [packageName]: [
    "CalculatorEngine",
    "calculatePercent",
    "calculateStatistics",
    "compileGraphExpression",
    "evaluateExpression",
  ],
  [`${packageName}/engine`]: ["CalculatorEngine", "evaluateExpression"],
  [`${packageName}/graphing`]: ["compileGraphExpression", "findRoots"],
  [`${packageName}/statistics`]: ["calculateStatistics", "fitRegression"],
  [`${packageName}/tools`]: ["calculatePercent", "calculateRatio"],
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, HUSKY: "0" },
    stdio: "inherit",
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`)
  }
}

function runPnpm(args, cwd = root) {
  if (pnpm) {
    run(process.execPath, [pnpm, ...args], cwd)
    return
  }

  run("pnpm", args, cwd)
}

async function collectFiles(directory, relative = "") {
  const files = []

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryRelative = path.join(relative, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path.join(directory, entry.name), entryRelative)))
    } else {
      files.push(entryRelative)
    }
  }

  return files
}

try {
  await mkdir(packDirectory)
  await mkdir(consumer)
  await mkdir(extracted)
  runPnpm(["pack", "--pack-destination", packDirectory], coreDirectory)

  const tarballs = (await readdir(packDirectory)).filter((file) => file.endsWith(".tgz"))

  if (tarballs.length !== 1) {
    throw new Error(`Expected one package tarball, found ${tarballs.length}`)
  }

  const tarball = path.join(packDirectory, tarballs[0])
  run("tar", ["-xzf", tarball, "-C", extracted])

  const packedRoot = path.join(extracted, "package")
  const packedPackage = JSON.parse(await readFile(path.join(packedRoot, "package.json"), "utf8"))

  if (packedPackage.name !== packageName || packedPackage.version !== "0.2.0") {
    throw new Error(`Expected ${packageName}@0.2.0 in the tarball`)
  }

  for (const field of [
    "bundleDependencies",
    "bundledDependencies",
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    if (Object.keys(packedPackage[field] ?? {}).length > 0) {
      throw new Error(`Headless core tarball must not declare ${field}`)
    }
  }

  if (
    packedPackage.style ||
    packedPackage.exports?.["./styles.css"] ||
    (packedPackage.sideEffects ?? []).some?.((entry) => entry.includes(".css"))
  ) {
    throw new Error("Headless core tarball must not expose CSS")
  }

  const packedFiles = await collectFiles(packedRoot)
  const forbiddenFile = packedFiles.find((file) =>
    /(^|[/\\])(assets?|components?|ui)([/\\]|$)|\.(?:css|jsx|tsx|svg|png|jpe?g|gif|webp|woff2?)$/i.test(
      file
    )
  )

  if (forbiddenFile) {
    throw new Error(`Headless core tarball contains UI/CSS/asset file: ${forbiddenFile}`)
  }

  for (const file of packedFiles.filter((candidate) =>
    /\.(?:[cm]?js|d\.[cm]?ts)$/.test(candidate)
  )) {
    const contents = await readFile(path.join(packedRoot, file), "utf8")

    if (/(?:from\s*|require\(|import\()\s*["']react(?:\/|["'])/.test(contents)) {
      throw new Error(`Headless core tarball contains a React runtime/type import: ${file}`)
    }
  }

  await writeFile(
    path.join(consumer, "package.json"),
    `${JSON.stringify(
      {
        name: "mirai-calculator-core-smoke",
        private: true,
        type: "module",
        packageManager: "pnpm@10.28.0",
        dependencies: {
          [packageName]: `file:${tarball}`,
          typescript: "^7.0.2",
        },
      },
      null,
      2
    )}\n`
  )

  const moduleChecks = Object.entries(expectedRuntimeExports)
    .map(
      ([specifier, exports], index) =>
        `import * as module${index} from ${JSON.stringify(specifier)}
for (const name of ${JSON.stringify(exports)}) {
  if (!(name in module${index})) throw new Error(${JSON.stringify(
    `${specifier} missing ESM export: `
  )} + name)
}`
    )
    .join("\n\n")
  await writeFile(path.join(consumer, "esm.mjs"), `${moduleChecks}\n`)

  const commonJsChecks = Object.entries(expectedRuntimeExports)
    .map(
      ([specifier, exports], index) =>
        `const module${index} = require(${JSON.stringify(specifier)})
for (const name of ${JSON.stringify(exports)}) {
  if (!(name in module${index})) throw new Error(${JSON.stringify(
    `${specifier} missing CommonJS export: `
  )} + name)
}`
    )
    .join("\n\n")
  await writeFile(path.join(consumer, "commonjs.cjs"), `${commonJsChecks}\n`)

  await writeFile(
    path.join(consumer, "consumer.ts"),
    `import {
  CalculatorEngine,
  calculatePercent,
  calculateStatistics,
  compileGraphExpression,
  evaluateExpression,
  type CalculatorValue,
  type CompiledGraphExpression,
} from "@openmirai/calculator-core"
import {
  CalculatorEngine as SubpathCalculatorEngine,
  evaluateExpression as subpathEvaluateExpression,
  type CalculatorEngineOptions,
} from "@openmirai/calculator-core/engine"
import {
  compileGraphExpression as subpathCompileGraphExpression,
  type GraphPoint,
} from "@openmirai/calculator-core/graphing"
import {
  calculateStatistics as subpathCalculateStatistics,
  type DescriptiveStatistics,
} from "@openmirai/calculator-core/statistics"
import {
  calculatePercent as subpathCalculatePercent,
  type PercentResults,
} from "@openmirai/calculator-core/tools"

export const rootValue: CalculatorValue = evaluateExpression("1 + 1")
export const rootEngine = new CalculatorEngine()
export const rootGraph: CompiledGraphExpression = compileGraphExpression("x", rootEngine)
export const rootStatistics = calculateStatistics([1, 2])
export const rootPercent = calculatePercent(1, 2)
export const engineOptions: CalculatorEngineOptions = {}
export const subpathEngine = new SubpathCalculatorEngine(engineOptions)
export const subpathValue: CalculatorValue = subpathEvaluateExpression("2 + 2")
export const point: GraphPoint = { x: 0, y: 0 }
export const subpathGraph: CompiledGraphExpression = subpathCompileGraphExpression(
  "x",
  subpathEngine
)
export const statistics: DescriptiveStatistics = subpathCalculateStatistics([1, 2])
export const percent: PercentResults = subpathCalculatePercent(1, 2)
`
  )
  await writeFile(
    path.join(consumer, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          noEmit: true,
        },
        include: ["consumer.ts"],
      },
      null,
      2
    )}\n`
  )

  runPnpm(["install", "--frozen-lockfile=false"], consumer)
  runPnpm(["exec", "tsc", "-p", "tsconfig.json"], consumer)
  run("node", ["esm.mjs"], consumer)
  run("node", ["commonjs.cjs"], consumer)

  const installedPackage = JSON.parse(
    await readFile(
      path.join(consumer, "node_modules", "@openmirai", "calculator-core", "package.json"),
      "utf8"
    )
  )

  if (installedPackage.name !== packageName || installedPackage.version !== "0.2.0") {
    throw new Error("Tarball installed with the wrong package identity")
  }

  console.log("Headless calculator core tarball smoke passed for ESM, CommonJS, and TypeScript.")
} finally {
  if (!process.env.MIRAI_KEEP_SMOKE) {
    await rm(workspace, { force: true, recursive: true })
  } else {
    console.log(`Kept package smoke workspace at ${workspace}`)
  }
}
