# Mirai Scientific Calculator

[![CI](https://img.shields.io/github/actions/workflow/status/openmirai/mirai-scientific-calculator/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/openmirai/mirai-scientific-calculator/actions/workflows/ci.yml)
[![GitHub Release](https://img.shields.io/github/v/release/openmirai/mirai-scientific-calculator?style=flat-square)](https://github.com/openmirai/mirai-scientific-calculator/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-2A9D90?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178C6?style=flat-square)](https://www.typescriptlang.org/)

A scientific, graphing, statistics, and math tools calculator with two
distribution channels:

- **Editable React UI:** the `@openmirai/calculator` shadcn registry item
- **Headless APIs:** the dependency-free `@openmirai/calculator-core` npm package

The UI preserves the OpenMirai practice-player interface. The core package
provides the same calculation engines without React, styles, or UI dependencies.

## Interface

|                                                          Scientific calculator                                                          |                                                         Graphing calculator                                                         |
| :-------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------: |
| ![Scientific calculator](https://raw.githubusercontent.com/openmirai/mirai-scientific-calculator/main/docs/images/scientific-light.png) | ![Graphing calculator](https://raw.githubusercontent.com/openmirai/mirai-scientific-calculator/main/docs/images/graphing-light.png) |

|                                                               Statistics in dark mode                                                               |                                                       Math tools                                                        |
| :-------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------: |
| ![Statistics calculator in dark mode](https://raw.githubusercontent.com/openmirai/mirai-scientific-calculator/main/docs/images/statistics-dark.png) | ![Math tools](https://raw.githubusercontent.com/openmirai/mirai-scientific-calculator/main/docs/images/tools-light.png) |

## Features

### Scientific

- Arithmetic, powers, roots, factorials, percentages, fractions, and absolute values
- Trigonometric, inverse-trigonometric, logarithmic, and statistical functions
- Degree and radian modes
- Variables, reusable function definitions, answer memory, history, undo, and redo
- Keyboard entry and a six-column calculator keypad

### Graphing

- Explicit and implicit equations
- Point lists and connected shapes
- Variables with interactive sliders
- Pan, zoom, grid controls, and curve tracing
- Roots, extrema, and intersections
- Data tables and regression summaries

### Statistics

- Scatter, histogram, box, dot, and residual charts
- Descriptive statistics, variance, standard deviation, correlation, and covariance
- Linear, quadratic, cubic, exponential, logarithmic, and power regression

### Math tools

- Percent calculations
- Ratio simplification and scaling
- Coordinate distance, midpoint, slope, and line equations
- Circle, triangle, and rectangular-prism measures

## Install the editable UI

Run the shadcn CLI in an existing shadcn project:

```bash
pnpm dlx shadcn@latest add @openmirai/calculator
```

The registry item copies the calculator into
`components/mirai-calculator`, installs its shadcn primitives, and automatically
installs `@openmirai/calculator-core`. The copied component owns its styles, so
there is no separate UI package or stylesheet package to install.

The OpenMirai wordmark is embedded directly in the calculator header and is
always rendered, including when `extensions={[]}`. The supported component API
does not expose a branding toggle or external logo asset.

The registry supports projects initialized with Base UI or Radix without
replacing unrelated components or global theme variables.

## Use the UI

Import the installed component from your application:

```tsx
import {
  CalculatorExtension,
  MiraiCalculator,
  type CalculatorMode,
} from "@/components/mirai-calculator/mirai-calculator"

export function CalculatorPage() {
  const handleModeChange = (mode: CalculatorMode) => {
    console.log("Calculator mode:", mode)
  }

  return (
    <MiraiCalculator
      extensions={[CalculatorExtension.SCIENTIFIC, CalculatorExtension.GRAPHING]}
      height={660}
      defaultMode={CalculatorExtension.SCIENTIFIC}
      defaultTheme="system"
      onModeChange={handleModeChange}
    />
  )
}
```

### Practice-player panel

Enable the OpenMirai backdrop and floating panel with `showBackdrop`. The
header becomes draggable, the bottom-right corner resizes the calculator, and
double-clicking the header toggles fullscreen.

```tsx
import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"

export function PracticePlayer() {
  return <MiraiCalculator showBackdrop title="OpenMirai Calculator" defaultTheme="light" />
}
```

The floating panel starts at `1040 × 660` pixels and respects a `720 × 460`
minimum while remaining bounded by the backdrop.

### Controlled state

Mode, angle mode, and theme can each be controlled or uncontrolled.

```tsx
import { useState } from "react"
import {
  CalculatorExtension,
  MiraiCalculator,
  type CalculatorMode,
  type CalculatorTheme,
} from "@/components/mirai-calculator/mirai-calculator"

export function ControlledCalculator() {
  const [mode, setMode] = useState<CalculatorMode>(CalculatorExtension.GRAPHING)
  const [theme, setTheme] = useState<CalculatorTheme>("dark")

  return (
    <MiraiCalculator
      mode={mode}
      onModeChange={setMode}
      theme={theme}
      onThemeChange={setTheme}
      angleMode="degrees"
    />
  )
}
```

### Component API

| Prop                | Type                             |        Default | Description                                         |
| ------------------- | -------------------------------- | -------------: | --------------------------------------------------- |
| `className`         | `string`                         |              — | Additional class names for the calculator panel     |
| `style`             | `CSSProperties`                  |              — | Inline styles for the calculator panel              |
| `height`            | `number \| string`               |          `660` | Standalone panel height                             |
| `extensions`        | `readonly CalculatorExtension[]` |      all modes | Enabled modes in their navigation order             |
| `mode`              | `CalculatorMode`                 |              — | Controlled calculator mode                          |
| `defaultMode`       | `CalculatorMode`                 | `"scientific"` | Initial uncontrolled mode                           |
| `onModeChange`      | `(mode) => void`                 |              — | Called after the mode changes                       |
| `angleMode`         | `"degrees" \| "radians"`         |              — | Controlled angle mode                               |
| `defaultAngleMode`  | `"degrees" \| "radians"`         |    `"degrees"` | Initial uncontrolled angle mode                     |
| `onAngleModeChange` | `(mode) => void`                 |              — | Called after the angle mode changes                 |
| `theme`             | `"light" \| "dark" \| "system"`  |              — | Controlled color theme                              |
| `defaultTheme`      | `"light" \| "dark" \| "system"`  |      `"light"` | Initial uncontrolled theme                          |
| `onThemeChange`     | `(theme) => void`                |              — | Called after the theme changes                      |
| `startFullscreen`   | `boolean`                        |        `false` | Opens the panel in fullscreen mode                  |
| `showBackdrop`      | `boolean`                        |        `false` | Enables the practice backdrop and panel drag/resize |
| `title`             | `string`                         | `"Calculator"` | Accessible panel title                              |
| `onClose`           | `() => void`                     |              — | Adds a close button and handles its action          |

```ts
const CalculatorExtension = {
  SCIENTIFIC: "scientific",
  GRAPHING: "graphing",
  STATISTICS: "statistics",
  TOOLS: "tools",
} as const

type CalculatorMode = (typeof CalculatorExtension)[keyof typeof CalculatorExtension]
type CalculatorTheme = "light" | "dark" | "system"
```

## Use the headless APIs

Install version `0.2.0` of the dependency-free core package:

```bash
pnpm add @openmirai/calculator-core@0.2.0
```

Import from the root export when several calculator domains are needed:

```ts
import {
  calculatePercent,
  calculateStatistics,
  evaluateExpression,
  fitRegression,
} from "@openmirai/calculator-core"

const value = evaluateExpression("sin(30) + sqrt(81)", {
  angleMode: "degrees",
})

const summary = calculateStatistics([2, 4, 4, 5, 7, 8, 9])
const percent = calculatePercent(15, 240)
const regression = fitRegression([1, 2, 3], [3, 5, 7], "linear")
```

The package provides focused exports for narrower imports:

| Export                                  | APIs                                                        |
| --------------------------------------- | ----------------------------------------------------------- |
| `@openmirai/calculator-core`            | All public headless APIs                                    |
| `@openmirai/calculator-core/engine`     | Expression evaluation, formatting, and calculator engine    |
| `@openmirai/calculator-core/graphing`   | Expression compilation, roots, extrema, and intersections   |
| `@openmirai/calculator-core/statistics` | Descriptive statistics, correlation, covariance, regression |
| `@openmirai/calculator-core/tools`      | Percent, ratio, coordinate, and shape calculations          |

All exports include TypeScript declarations.

## Development

Use Node 24. The included `.nvmrc` follows the current LTS line:

```bash
nvm use
```

Install dependencies and start the demo:

```bash
pnpm install
pnpm dev
```

The repository is split into focused workspaces:

- `packages/calculator-core` — the publishable dependency-free library
- `packages/calculator-registry` — the canonical shadcn calculator source
- `apps/web` — the TanStack Router showcase and registry consumer

`pnpm app:install` builds the core, builds the registry item, and installs the
calculator into the web app with the shadcn CLI. The installed copy is generated
and is not maintained separately.

Run the repository checks:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm publint
pnpm registry:build
pnpm build:site
pnpm smoke:site
pnpm smoke:registry
```

## Continuous integration and release

CI runs formatting, type-aware linting, TypeScript checks, tests and coverage,
the dependency-free core build, package-export validation, registry validation,
and Base UI and Radix registry consumer smoke tests.

The release workflow is designed to publish the committed
`@openmirai/calculator-core` version, create the matching Git tag, and create a
GitHub Release. The React UI is distributed only through the shadcn registry;
it is not published as an npm package or bundled as a package release asset.

### Release status

Normal checks and merges do not publish `@openmirai/calculator-core` or
deprecate any package. Publishing requires a manual Release workflow dispatch,
and any deprecation remains a separate future manual action.

The `@openmirai/calculator` command is the intended sole UI installation
surface. It becomes resolvable after the hosted registry is live and the
namespace is accepted into the shadcn registry directory; no fallback install
command is required or documented here.

## License

Released under the [MIT License](./LICENSE).
