import { CALCULATOR_CHART_TOKENS } from "@/components/mirai-calculator/calculator-ui-config"

/** Reads a shadcn color property with a computed foreground or background fallback. */
export function readCanvasColor(element: Element, property: string): string {
  const computed = getComputedStyle(element)
  const value = computed.getPropertyValue(property).trim()
  return value || (property === "--background" ? computed.backgroundColor : computed.color)
}

/** Resolves a CSS custom-property token to a canvas-compatible color. */
export function resolveCanvasColor(element: Element, token: string): string {
  const computed = getComputedStyle(element)
  const match = /^var\((--[^)]+)\)$/.exec(token.trim())
  if (!match) {
    return token || computed.color
  }
  return computed.getPropertyValue(match[1]).trim() || computed.color
}

/** Returns every configured shadcn chart color resolved for a canvas element. */
export function readCanvasChartColors(element: Element): Array<string> {
  return CALCULATOR_CHART_TOKENS.map((token) => resolveCanvasColor(element, token))
}
