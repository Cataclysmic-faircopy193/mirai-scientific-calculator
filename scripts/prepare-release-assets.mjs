import { spawnSync } from "node:child_process"
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

function run(command, args) {
  const result = spawnSync(command, args, {
    env: { ...process.env, HUSKY: "0" },
    stdio: "inherit",
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`)
  }
}

function runPnpm(args) {
  if (process.env.npm_execpath) {
    run(process.execPath, [process.env.npm_execpath, ...args])
    return
  }

  run("pnpm", args)
}

const coreDirectory = path.resolve("packages/calculator-core")
const packageJson = JSON.parse(await readFile(path.join(coreDirectory, "package.json"), "utf8"))
const releaseDirectory = path.resolve("release")
const registryDirectory = path.join(releaseDirectory, "registry")

await rm(releaseDirectory, { force: true, recursive: true })
await mkdir(registryDirectory, { recursive: true })

runPnpm(["registry:build"])
runPnpm(["--dir", coreDirectory, "pack", "--pack-destination", releaseDirectory])

const tarball = (await readdir(releaseDirectory)).find((file) => file.endsWith(".tgz"))

if (!tarball) {
  throw new Error("pnpm pack did not create a release tarball")
}

await copyFile(
  path.join(releaseDirectory, tarball),
  path.join(releaseDirectory, "openmirai-calculator-core.tgz")
)
await copyFile("registry-dist/calculator.json", path.join(registryDirectory, "calculator.json"))
await copyFile("registry.json", path.join(registryDirectory, "registry.json"))
await writeFile(
  path.join(releaseDirectory, "manifest.json"),
  `${JSON.stringify(
    {
      package: packageJson.name,
      version: packageJson.version,
      registryItem: "@openmirai/calculator",
    },
    null,
    2
  )}\n`
)
