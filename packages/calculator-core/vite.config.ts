import path from "node:path"

import dts from "vite-plugin-dts"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    dts({
      entryRoot: "src",
      tsconfigPath: path.resolve(import.meta.dirname, "tsconfig.json"),
      include: ["src/mirai-calculator/**/*.ts"],
      exclude: ["src/**/__tests__/**"],
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        configuration: path.resolve(import.meta.dirname, "src/mirai-calculator/configuration.ts"),
        engine: path.resolve(import.meta.dirname, "src/mirai-calculator/calculator-engine.ts"),
        graphing: path.resolve(import.meta.dirname, "src/mirai-calculator/graphing.ts"),
        "graphing-data": path.resolve(import.meta.dirname, "src/mirai-calculator/graphing-data.ts"),
        "graphing-view": path.resolve(import.meta.dirname, "src/mirai-calculator/graphing-view.ts"),
        statistics: path.resolve(import.meta.dirname, "src/mirai-calculator/statistics.ts"),
        "statistics-data": path.resolve(
          import.meta.dirname,
          "src/mirai-calculator/statistics-data.ts"
        ),
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
      thresholds: {
        autoUpdate: process.env.COVERAGE_RATCHET ? Math.floor : false,
        statements: 96,
        branches: 93,
        functions: 98,
        lines: 96,
      },
    },
  },
})
