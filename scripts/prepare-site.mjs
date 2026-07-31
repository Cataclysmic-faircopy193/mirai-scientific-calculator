import { copyFile, mkdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"

const rootDirectory = path.resolve(import.meta.dirname, "..")
const siteDirectory = path.resolve(rootDirectory, process.argv[2] ?? "site-dist")
const registryDirectory = path.join(siteDirectory, "r")

const requiredFiles = [
  path.join(siteDirectory, "index.html"),
  path.join(siteDirectory, "llms.txt"),
  path.join(rootDirectory, "registry-dist", "calculator.json"),
  path.join(rootDirectory, "registry.json"),
]

for (const file of requiredFiles) {
  try {
    const details = await stat(file)
    if (!details.isFile()) throw new Error("not a file")
  } catch {
    throw new Error(`Required site input is missing: ${path.relative(rootDirectory, file)}`)
  }
}

await mkdir(registryDirectory, { recursive: true })
await Promise.all([
  copyFile(
    path.join(rootDirectory, "registry-dist", "calculator.json"),
    path.join(registryDirectory, "calculator.json")
  ),
  copyFile(
    path.join(rootDirectory, "registry.json"),
    path.join(registryDirectory, "registry.json")
  ),
])

const headersText = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), geolocation=(), microphone=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/r/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Cache-Control: public, max-age=300, s-maxage=900, stale-while-revalidate=86400

/llms.txt
  Cache-Control: public, max-age=300, s-maxage=900
`

await Promise.all([writeFile(path.join(siteDirectory, "_headers"), headersText)])

console.log(`Prepared static site assets in ${path.relative(rootDirectory, siteDirectory)}`)
