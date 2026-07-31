import {
  CalculatorExtension,
  calculatorNumberFormatOptions,
  collectSliderVariables,
  normalizeCalculatorExtensions,
  resolveCssColorToken,
} from "../configuration"

describe("calculator configuration", () => {
  it("normalizes extensions without changing their selected order", () => {
    expect(
      normalizeCalculatorExtensions([
        CalculatorExtension.STATISTICS,
        CalculatorExtension.SCIENTIFIC,
        CalculatorExtension.STATISTICS,
      ])
    ).toEqual([CalculatorExtension.STATISTICS, CalculatorExtension.SCIENTIFIC])
    expect(normalizeCalculatorExtensions(undefined)).toEqual([
      CalculatorExtension.SCIENTIFIC,
      CalculatorExtension.GRAPHING,
      CalculatorExtension.STATISTICS,
      CalculatorExtension.TOOLS,
    ])
  })

  it("creates engine options without exposing the mutable settings object", () => {
    const settings = {
      notation: "scientific" as const,
      decimals: 4,
      significantFigures: 9,
      thousandsSeparator: false,
    }

    expect(calculatorNumberFormatOptions(settings)).toEqual(settings)
    expect(calculatorNumberFormatOptions(settings)).not.toBe(settings)
  })

  it("collects only slider-backed single-letter variables", () => {
    expect(
      collectSliderVariables([
        { expression: "a = 4", value: 4 },
        { expression: "speed = 8", value: 8 },
        { expression: "b = 2", value: undefined },
      ])
    ).toEqual({ a: 4 })
  })

  it("resolves semantic chart tokens for canvas rendering", () => {
    expect(
      resolveCssColorToken("var(--chart-2)", { "--chart-2": "oklch(0.5 0.1 220)" }, "red")
    ).toBe("oklch(0.5 0.1 220)")
    expect(resolveCssColorToken("var(--chart-3)", {}, "currentColor")).toBe("currentColor")
    expect(resolveCssColorToken("rgb(1 2 3)", {}, "currentColor")).toBe("rgb(1 2 3)")
  })
})
