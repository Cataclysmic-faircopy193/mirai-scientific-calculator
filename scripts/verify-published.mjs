import { spawnSync } from "node:child_process"
import { readFile } from "node:fs/promises"

const packageJson = JSON.parse(await readFile("packages/calculator-core/package.json", "utf8"))
const specifier = `${packageJson.name}@${packageJson.version}`

for (let attempt = 1; attempt <= 12; attempt += 1) {
  const result = spawnSync(
    "npm",
    ["view", specifier, "version", "--registry=https://registry.npmjs.org"],
    { encoding: "utf8" }
  )

  if (result.status === 0 && result.stdout.trim() === packageJson.version) {
    process.exit(0)
  }

  if (attempt < 12) {
    await new Promise((resolve) => setTimeout(resolve, 5_000))
  }
}

throw new Error(`Could not verify ${specifier} on npmjs after publication`)
