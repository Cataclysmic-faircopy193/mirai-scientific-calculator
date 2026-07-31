import path from "node:path"

import dts from "vite-plugin-dts"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    dts({
      entryRoot: "src",
      tsconfigPath: path.resolve(import.meta.dirname, "tsconfig.json"),
      include: ["src/index.ts", "src/mirai-calculator/**/*.ts"],
      exclude: ["src/**/__tests__/**"],
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: path.resolve(import.meta.dirname, "src/index.ts"),
        engine: path.resolve(import.meta.dirname, "src/mirai-calculator/calculator-engine.ts"),
        graphing: path.resolve(import.meta.dirname, "src/mirai-calculator/graphing.ts"),
        statistics: path.resolve(import.meta.dirname, "src/mirai-calculator/statistics.ts"),
        tools: path.resolve(import.meta.dirname, "src/mirai-calculator/tools.ts"),
      },
      name: "OpenMiraiCalculatorCore",
      formats: ["es", "cjs"],
      fileName: (format, entryName) => (format === "es" ? `${entryName}.js` : `${entryName}.cjs`),
    },
    rollupOptions: {
      external: [],
    },
  },
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/__tests__/**"],
    },
  },
})
