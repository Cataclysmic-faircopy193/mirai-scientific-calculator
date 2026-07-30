import path from "node:path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === "demo"
      ? []
      : [
          dts({
            entryRoot: "src",
            tsconfigPath: path.resolve(import.meta.dirname, "tsconfig.app.json"),
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: ["src/**/*.test.*", "src/test/**"],
            bundleTypes: true,
            insertTypesEntry: true,
          }),
        ]),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build:
    mode === "demo"
      ? {}
      : {
          lib: {
            entry: path.resolve(import.meta.dirname, "src/index.ts"),
            name: "MiraiScientificCalculator",
            formats: ["es", "cjs"],
            fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
            cssFileName: "styles",
          },
          rollupOptions: {
            external: [
              "class-variance-authority",
              "clsx",
              "lucide-react",
              "radix-ui",
              "react",
              "react-dom",
              "react/jsx-runtime",
              "tailwind-merge",
            ],
            output: {
              globals: {
                react: "React",
                "react-dom": "ReactDOM",
                "react/jsx-runtime": "jsxRuntime",
              },
            },
          },
        },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/components/**/*.tsx"],
    },
  },
}))
