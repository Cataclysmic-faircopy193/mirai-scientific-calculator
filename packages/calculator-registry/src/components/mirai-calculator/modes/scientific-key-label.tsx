import type { ScientificKeyDefinition } from "@/components/mirai-calculator/modes/scientific-keypad-config"

/** Renders structured keypad notation with the host application's mathematical font fallback. */
export function ScientificKeyLabel({ definition }: { definition: ScientificKeyDefinition }) {
  const notation = definition.notation
  if (!notation) {
    return definition.label
  }

  return (
    <span
      aria-hidden="true"
      data-math-notation=""
      className="inline-flex items-baseline font-[math,var(--font-sans,system-ui),sans-serif]! leading-none"
    >
      {notation.kind === "fraction" && (
        <span data-math-fraction="">
          {notation.numerator}⁄{notation.denominator}
        </span>
      )}
      {notation.kind === "root" && (
        <span>
          <sup className="mr-px leading-none">{notation.index}</sup>√{notation.radicand}
        </span>
      )}
      {notation.kind === "subscript" && (
        <span>
          {notation.base}
          <sub className="leading-none">{notation.script}</sub>
        </span>
      )}
      {notation.kind === "superscript" && (
        <span>
          {notation.base}
          <sup className="leading-none">{notation.script}</sup>
        </span>
      )}
    </span>
  )
}
