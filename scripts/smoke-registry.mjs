import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const base = process.argv[2]

if (base !== "base" && base !== "radix") {
  throw new Error("Usage: node scripts/smoke-registry.mjs <base|radix>")
}

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const coreDirectory = path.join(root, "packages", "calculator-core")
const shadcn = path.join(root, "node_modules", "shadcn", "dist", "index.js")
const pnpm = process.env.npm_execpath
const workspace = await mkdtemp(path.join(tmpdir(), `mirai-calculator-${base}-`))
const project = path.join(workspace, "consumer")
const packDirectory = path.join(workspace, "package")
const coreDependency = "@openmirai/calculator-core@^0.2.0"

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

function runShadcn(args, cwd = root) {
  run(process.execPath, [shadcn, ...args], cwd)
}

try {
  await mkdir(packDirectory)
  runPnpm(["pack", "--pack-destination", packDirectory], coreDirectory)

  const tarballs = (await readdir(packDirectory)).filter((file) => file.endsWith(".tgz"))

  if (tarballs.length !== 1) {
    throw new Error(`Expected one core package tarball, found ${tarballs.length}`)
  }

  const tarball = path.join(packDirectory, tarballs[0])
  runPnpm(["registry:build"])
  await mkdir(path.join(project, "src"), { recursive: true })
  await writeFile(
    path.join(project, "package.json"),
    `${JSON.stringify(
      {
        name: `mirai-registry-${base}-smoke`,
        private: true,
        type: "module",
        packageManager: "pnpm@10.28.0",
        scripts: {
          build: "tsc -b && vite build",
        },
        dependencies: {
          ...(base === "base" ? { "@base-ui/react": "^1.6.0" } : { "radix-ui": "^1.6.7" }),
          "@tailwindcss/vite": "^4.3.3",
          "@types/node": "^24.13.3",
          "@vitejs/plugin-react": "^6.0.5",
          "@types/react": "^19.2.17",
          "@types/react-dom": "^19.2.3",
          "class-variance-authority": "^0.7.1",
          clsx: "^2.1.1",
          "lucide-react": "^1.28.0",
          react: "^19.2.8",
          "react-dom": "^19.2.8",
          "tailwind-merge": "^3.6.0",
          tailwindcss: "^4.3.3",
          typescript: "^7.0.2",
          vite: "^8.2.0",
        },
      },
      null,
      2
    )}\n`
  )
  await writeFile(
    path.join(project, "components.json"),
    `${JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema.json",
        style: `${base}-nova`,
        rsc: false,
        tsx: true,
        tailwind: {
          config: "",
          css: "src/index.css",
          baseColor: "neutral",
          cssVariables: true,
          prefix: "",
        },
        iconLibrary: "lucide",
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
          ui: "@/components/ui",
          lib: "@/lib",
          hooks: "@/hooks",
        },
      },
      null,
      2
    )}\n`
  )
  await writeFile(
    path.join(project, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "Bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
          paths: { "@/*": ["./src/*"] },
          types: ["vite/client", "node"],
        },
        include: ["src", "vite.config.ts"],
      },
      null,
      2
    )}\n`
  )
  await writeFile(
    path.join(project, "vite.config.ts"),
    `import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
`
  )
  await writeFile(
    path.join(project, "index.html"),
    '<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n'
  )
  await writeFile(
    path.join(project, "src", "main.tsx"),
    `import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`
  )
  await writeFile(
    path.join(project, "src", "App.tsx"),
    "export default function App() { return null }\n"
  )
  await mkdir(path.join(project, "src", "lib"), { recursive: true })
  await writeFile(
    path.join(project, "src", "lib", "utils.ts"),
    `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`
  )
  await writeFile(
    path.join(project, "src", "index.css"),
    `@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
}

:root {
  --consumer-sentinel: preserve-me;
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
}
`
  )
  runPnpm(["install"], project)

  const globalCssPath = path.join(project, "src", "index.css")
  const globalCss = await readFile(globalCssPath, "utf8")
  const sentinelPath = path.join(project, "src", "components", "unrelated.tsx")
  const sentinel = 'export const unrelated = "preserve-me"\n'

  await mkdir(path.dirname(sentinelPath), { recursive: true })
  await writeFile(sentinelPath, sentinel)
  const registryItem = JSON.parse(
    await readFile(path.join(root, "registry-dist", "calculator.json"), "utf8")
  )
  const coreDependencyIndex = registryItem.dependencies?.indexOf(coreDependency) ?? -1

  if (coreDependencyIndex === -1) {
    throw new Error(`Built registry item must depend on ${coreDependency}`)
  }

  registryItem.dependencies[coreDependencyIndex] = `file:${tarball}`
  await writeFile(
    path.join(project, "calculator.json"),
    `${JSON.stringify(registryItem, null, 2)}\n`
  )

  runShadcn(["add", "./calculator.json", "--cwd", project, "--yes"], project)

  if ((await readFile(globalCssPath, "utf8")) !== globalCss) {
    throw new Error("Registry installation changed the consumer global theme CSS")
  }

  if ((await readFile(sentinelPath, "utf8")) !== sentinel) {
    throw new Error("Registry installation overwrote an unrelated component")
  }

  const copiedCoreDirectory = path.join(project, "src", "lib", "mirai-calculator")

  try {
    const copiedCoreFiles = await readdir(copiedCoreDirectory)
    throw new Error(
      `Registry copied core source files instead of installing the package: ${copiedCoreFiles.join(
        ", "
      )}`
    )
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error
    }
  }

  const installedCore = JSON.parse(
    await readFile(
      path.join(project, "node_modules", "@openmirai", "calculator-core", "package.json"),
      "utf8"
    )
  )

  if (installedCore.name !== "@openmirai/calculator-core" || installedCore.version !== "0.2.0") {
    throw new Error("Registry did not install the locally packed calculator core")
  }

  await writeFile(
    path.join(project, "src", "App.tsx"),
    `import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"

export default function App() {
  return <MiraiCalculator height={660} />
}
`
  )

  runPnpm(["build"], project)
  console.log(`Registry smoke passed for ${base}.`)
} finally {
  if (!process.env.MIRAI_KEEP_SMOKE) {
    await rm(workspace, { force: true, recursive: true })
  } else {
    console.log(`Kept registry smoke project at ${project}`)
  }
}
