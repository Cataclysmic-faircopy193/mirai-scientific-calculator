import { spawnSync } from "node:child_process"
import { readFile, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

const rootDirectory = path.resolve(import.meta.dirname, "..")
const registryItemPath = path.join(rootDirectory, "registry-dist", "calculator.json")
const localRegistryItemPath = path.join(rootDirectory, "registry-dist", "calculator.workspace.json")
const shadcnPath = path.join(rootDirectory, "node_modules", "shadcn", "dist", "index.js")
const installedCalculatorDirectory = path.join(
  rootDirectory,
  "apps",
  "web",
  "src",
  "components",
  "mirai-calculator"
)
const coreDependency = "@openmirai/calculator-core@^0.2.0"
const workspaceCoreDependency = "@openmirai/calculator-core@workspace:*"

const registryItem = JSON.parse(await readFile(registryItemPath, "utf8"))
const coreDependencyIndex = registryItem.dependencies?.indexOf(coreDependency) ?? -1

if (coreDependencyIndex === -1) {
  throw new Error(`Built registry item must depend on ${coreDependency}`)
}

registryItem.dependencies[coreDependencyIndex] = workspaceCoreDependency
registryItem.registryDependencies = []
await writeFile(localRegistryItemPath, `${JSON.stringify(registryItem, null, 2)}\n`)

try {
  for (const entry of await readdir(installedCalculatorDirectory, {
    withFileTypes: true,
  })) {
    if (entry.name === "__tests__") continue
    await rm(path.join(installedCalculatorDirectory, entry.name), {
      force: true,
      recursive: entry.isDirectory(),
    })
  }

  const result = spawnSync(
    process.execPath,
    [
      shadcnPath,
      "add",
      localRegistryItemPath,
      "--cwd",
      path.join(rootDirectory, "apps", "web"),
      "--yes",
    ],
    {
      cwd: rootDirectory,
      env: { ...process.env, HUSKY: "0" },
      stdio: "inherit",
    }
  )

  if (result.status !== 0) {
    throw new Error("Failed to install the local calculator registry item into apps/web")
  }
} finally {
  await rm(localRegistryItemPath, { force: true })
}
