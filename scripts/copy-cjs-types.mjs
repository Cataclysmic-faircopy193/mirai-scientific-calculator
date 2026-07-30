import { copyFile } from "node:fs/promises"

const declarations = new URL("../dist/index.d.ts", import.meta.url)
const commonJsDeclarations = new URL("../dist/index.d.cts", import.meta.url)

await copyFile(declarations, commonJsDeclarations)
