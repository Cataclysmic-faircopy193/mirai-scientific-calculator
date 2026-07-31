export const SCIENTIFIC_PREVIEW_KEYS = ["sin", "cos", "tan", "log", "π", "="] as const
export const STATISTICS_PREVIEW_BARS = [42, 67, 53, 88, 72, 98, 64, 81] as const
export const GRAPH_GRID_PATH =
  "M0 30H320M0 60H320M0 90H320M0 120H320M64 0V150M128 0V150M192 0V150M256 0V150"
export const GRAPH_AXIS_PATH = "M0 75H320M160 0V150"
export const GRAPH_CURVE_PATH =
  "M0 126C44 122 64 99 96 77C130 54 149 36 179 49C213 64 214 116 250 118C282 120 297 96 320 67"

export const HERO_EQUATIONS = [
  { value: "f(x)=x²−5x+6", className: "top-[18%] -left-3 rotate-[-6deg]" },
  { value: "σ = 3.42", className: "right-1 bottom-[20%] rotate-[5deg]" },
  { value: "sin(30°)=0.5", className: "bottom-[8%] left-[12%] rotate-[-2deg]" },
] as const

export const OWNERSHIP_POINTS = [
  "The registry installs editable React source into your project.",
  "Built-in extensions can be enabled, removed, and ordered.",
  "The dependency-free core keeps calculation behavior consistent.",
] as const
