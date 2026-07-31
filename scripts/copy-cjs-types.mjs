import { copyFile, readdir } from "node:fs/promises"
import path from "node:path"

const dist = path.resolve(process.cwd(), process.argv[2] ?? "dist")

async function copyDeclarations(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await copyDeclarations(source)
      continue
    }

    if (!entry.name.endsWith(".d.ts")) continue
    await copyFile(source, source.replace(/\.d\.ts$/, ".d.cts"))
  }
}

await copyDeclarations(dist)
