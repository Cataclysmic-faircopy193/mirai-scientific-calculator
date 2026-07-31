# Mirai Scientific Calculator

[![CI](https://img.shields.io/github/actions/workflow/status/openmirai/mirai-scientific-calculator/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/openmirai/mirai-scientific-calculator/actions/workflows/ci.yml)
[![GitHub Release](https://img.shields.io/github/v/release/openmirai/mirai-scientific-calculator?style=flat-square)](https://github.com/openmirai/mirai-scientific-calculator/releases)
[![npm](https://img.shields.io/npm/v/mirai-scientific-calculator?style=flat-square&color=2A9D90)](https://www.npmjs.com/package/mirai-scientific-calculator)
[![npm downloads](https://img.shields.io/npm/dm/mirai-scientific-calculator?style=flat-square&color=2A9D90)](https://www.npmjs.com/package/mirai-scientific-calculator)
[![License: MIT](https://img.shields.io/badge/license-MIT-2A9D90?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178C6?style=flat-square)](https://www.typescriptlang.org/)

A production-ready React calculator for scientific computation, graphing,
statistics, and common math tools. It preserves the OpenMirai practice-player
interface while exposing a reusable, typed package for any React application.

- Vite, React, and TypeScript
- Tailwind CSS v4 with shadcn/ui source components
- ESM and CommonJS package outputs
- Self-hosted Inter variable typography
- Light, dark, and system theme support
- Draggable, resizable, and fullscreen practice-player panel
- 178 automated tests covering math rules, hostile edge cases, seeded
  properties, package exports, and UI interactions

## Interface

| Scientific calculator | Graphing calculator |
|:---:|:---:|
| ![Scientific calculator](https://raw.githubusercontent.com/openmirai/mirai-scientific-calculator/main/docs/images/scientific-light.png) | ![Graphing calculator](https://raw.githubusercontent.com/openmirai/mirai-scientific-calculator/main/docs/images/graphing-light.png) |

| Statistics in dark mode | Math tools |
|:---:|:---:|
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

## Installation

Install the package from the public npm registry:

```bash
pnpm add mirai-scientific-calculator
```

Alternatively, install the tarball from the latest GitHub Release:

```bash
pnpm add https://github.com/openmirai/mirai-scientific-calculator/releases/latest/download/mirai-scientific-calculator.tgz
```

Both installation methods are public and require no registry authentication.
React and React DOM are peer dependencies; React 18.2 or newer is supported.

## Quick start

Import the component and its compiled stylesheet:

```tsx
import {
  MiraiCalculator,
  type CalculatorMode,
} from "mirai-scientific-calculator"
import "mirai-scientific-calculator/styles.css"

export function CalculatorPage() {
  const handleModeChange = (mode: CalculatorMode) => {
    console.log("Calculator mode:", mode)
  }

  return (
    <MiraiCalculator
      height={660}
      defaultMode="scientific"
      defaultTheme="system"
      onModeChange={handleModeChange}
    />
  )
}
```

No Tailwind configuration is required in the consuming application. The
package ships its generated CSS as a separate export.

## Practice-player panel

Enable the OpenMirai backdrop and floating panel with `showBackdrop`. The
header becomes draggable, the bottom-right corner resizes the calculator, and
double-clicking the header toggles fullscreen.

```tsx
import { MiraiCalculator } from "mirai-scientific-calculator"
import "mirai-scientific-calculator/styles.css"

export function PracticePlayer() {
  return (
    <MiraiCalculator
      showBackdrop
      title="OpenMirai Calculator"
      defaultTheme="light"
    />
  )
}
```

The floating panel starts at `1040 × 660` pixels and respects a `720 × 460`
minimum while remaining bounded by the backdrop.

## Controlled state

Mode, angle mode, and theme can each be controlled or uncontrolled.

```tsx
import { useState } from "react"
import {
  MiraiCalculator,
  type CalculatorMode,
  type CalculatorTheme,
} from "mirai-scientific-calculator"
import "mirai-scientific-calculator/styles.css"

export function ControlledCalculator() {
  const [mode, setMode] = useState<CalculatorMode>("graphing")
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

## Component API

| Prop | Type | Default | Description |
|---|---|---:|---|
| `className` | `string` | — | Additional class names for the calculator panel |
| `style` | `CSSProperties` | — | Inline styles for the calculator panel |
| `height` | `number \| string` | `660` | Standalone panel height |
| `mode` | `CalculatorMode` | — | Controlled calculator mode |
| `defaultMode` | `CalculatorMode` | `"scientific"` | Initial uncontrolled mode |
| `onModeChange` | `(mode) => void` | — | Called after the mode changes |
| `angleMode` | `"degrees" \| "radians"` | — | Controlled angle mode |
| `defaultAngleMode` | `"degrees" \| "radians"` | `"degrees"` | Initial uncontrolled angle mode |
| `onAngleModeChange` | `(mode) => void` | — | Called after the angle mode changes |
| `theme` | `"light" \| "dark" \| "system"` | — | Controlled color theme |
| `defaultTheme` | `"light" \| "dark" \| "system"` | `"light"` | Initial uncontrolled theme |
| `onThemeChange` | `(theme) => void` | — | Called after the theme changes |
| `startFullscreen` | `boolean` | `false` | Opens the panel in fullscreen mode |
| `showBackdrop` | `boolean` | `false` | Enables the practice backdrop and panel drag/resize |
| `title` | `string` | `"Calculator"` | Accessible panel title |
| `onClose` | `() => void` | — | Adds a close button and handles its action |

```ts
type CalculatorMode = "scientific" | "graphing" | "statistics" | "tools"
type CalculatorTheme = "light" | "dark" | "system"
```

## Calculation APIs

The calculation modules are exported independently for use without the UI:

```ts
import {
  calculatePercent,
  calculateStatistics,
  evaluateExpression,
  fitRegression,
} from "mirai-scientific-calculator"

const value = evaluateExpression("sin(30) + sqrt(81)", {
  angleMode: "degrees",
})

const summary = calculateStatistics([2, 4, 4, 5, 7, 8, 9])
const percent = calculatePercent(15, 240)
const regression = fitRegression([1, 2, 3], [3, 5, 7], "linear")
```

Public utilities also include graph-expression compilation, roots, extrema,
intersections, correlation, covariance, ratios, coordinate calculations, and
shape calculations. All public APIs ship with TypeScript declarations.

## Numerical reliability

The expression engine rejects undefined domains and non-finite results instead
of displaying a misleading value. Decimal rounding uses consistent
half-away-from-zero ties, degree-mode trigonometry reduces large angles before
conversion, and equality checks use a scale-aware floating-point tolerance.

Statistics use compensated summation, overflow-safe interpolation, scaled
variance and correlation, and normalized QR least-squares regression. Graph
searches reject discontinuities as roots and bound their sampling work.
Expressions are limited to 4,096 source characters and 512 tokens, and parsed
expressions use a bounded 256-entry cache.

Like other JavaScript calculators, this package uses IEEE 754 double-precision
numbers. Results are therefore limited to roughly 15–16 significant decimal
digits and the finite range supported by JavaScript `number`. Operations whose
real result exceeds that range return a clear error. Graph roots, extrema, and
regression results are numerical approximations rather than symbolic proofs.

## Development

```bash
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm lint
pnpm test
pnpm build
pnpm publint
```

`pnpm build` produces:

- `dist/index.js` — ESM
- `dist/index.cjs` — CommonJS
- `dist/index.d.ts` and `dist/index.d.cts` — TypeScript declarations
- `dist/styles.css` — compiled component styles

## Continuous integration and publishing

The CI workflow runs linting, all tests, the production package build,
`publint`, and an installable tarball build for every push and pull request.

Releases are tag-driven. After updating the version in `package.json`, push a
matching version tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The Release workflow verifies the version, runs all checks, publishes
`mirai-scientific-calculator` to npm with provenance, builds and uploads the
package tarball, and creates a GitHub Release with generated notes. Publishing
uses the repository's `NPM_TOKEN` secret. Existing package versions are
detected and are not republished.

## License

Released under the [MIT License](./LICENSE).
