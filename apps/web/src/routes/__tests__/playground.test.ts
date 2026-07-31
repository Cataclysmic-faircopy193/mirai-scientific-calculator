import { describe, expect, it } from "vitest"

import { CalculatorExtension } from "@/components/mirai-calculator/mirai-calculator"
import {
  createPlaygroundSnippet,
  movePlaygroundExtension,
  normalizePlaygroundSearch,
  orderPlaygroundExtensionOptions,
  parsePlaygroundExtensions,
  PLAYGROUND_STATISTICS_DATA,
  PLAYGROUND_TOOLS_DATA,
} from "@/site/constants/playground"

describe("playground search state", () => {
  it("opens the practice backdrop by default", () => {
    expect(normalizePlaygroundSearch({}).backdrop).toBe(true)
  })

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

  it("keeps enabled extension controls in configured order before disabled controls", () => {
    const catalog = [
      { id: CalculatorExtension.SCIENTIFIC, label: "Scientific" },
      { id: CalculatorExtension.GRAPHING, label: "Graphing" },
      { id: CalculatorExtension.STATISTICS, label: "Statistics" },
      { id: CalculatorExtension.TOOLS, label: "Math tools" },
    ]
    const enabled = [
      CalculatorExtension.STATISTICS,
      CalculatorExtension.GRAPHING,
      CalculatorExtension.SCIENTIFIC,
    ]

    expect(orderPlaygroundExtensionOptions(enabled, catalog).map((item) => item.id)).toEqual([
      CalculatorExtension.STATISTICS,
      CalculatorExtension.GRAPHING,
      CalculatorExtension.SCIENTIFIC,
      CalculatorExtension.TOOLS,
    ])
    expect(movePlaygroundExtension(enabled, CalculatorExtension.GRAPHING, -1)).toEqual([
      CalculatorExtension.GRAPHING,
      CalculatorExtension.STATISTICS,
      CalculatorExtension.SCIENTIFIC,
    ])
  })

  it("includes playground-owned statistics fixtures in the copyable source", () => {
    const snippet = createPlaygroundSnippet({
      extensions: [CalculatorExtension.SCIENTIFIC, CalculatorExtension.STATISTICS],
      mode: CalculatorExtension.STATISTICS,
      calculatorTheme: "dark",
      statisticsData: PLAYGROUND_STATISTICS_DATA,
      toolsData: PLAYGROUND_TOOLS_DATA,
    })

    expect(snippet).toContain("const statisticsData = {")
    expect(snippet).toContain("xValues: [2,4,4,5,7,8,9,12,12,15]")
    expect(snippet).toContain("yValues: [5.1,8.9,9.4,11.2,15.1,17.3,18.8,25.2,24.6,30.4]")
    expect(snippet).toContain("defaultStatisticsData={statisticsData}")
    expect(snippet).toContain("defaultToolsData={toolsData}")
    expect(snippet).not.toContain("showBackdrop")
    expect(snippet).not.toContain("Practice session")
  })
})
