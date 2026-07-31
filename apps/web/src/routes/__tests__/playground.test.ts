import { describe, expect, it } from "vitest"

import { CalculatorExtension } from "@/components/mirai-calculator/mirai-calculator"
import { normalizePlaygroundSearch, parsePlaygroundExtensions } from "@/site/constants/playground"

describe("playground search state", () => {
  it("preserves supported extension order and removes invalid duplicates", () => {
    expect(parsePlaygroundExtensions("tools,invalid,scientific,tools")).toEqual([
      CalculatorExtension.TOOLS,
      CalculatorExtension.SCIENTIFIC,
    ])
  })

  it("falls back to the first enabled extension and normalizes display options", () => {
    expect(
      normalizePlaygroundSearch({
        extensions: "graphing,statistics",
        mode: "tools",
        calculatorTheme: "invalid",
        backdrop: "true",
      })
    ).toEqual({
      extensions: "graphing,statistics",
      mode: CalculatorExtension.GRAPHING,
      calculatorTheme: "system",
      backdrop: true,
    })
  })
})
