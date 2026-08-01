import {
  CalculatorExtension,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_GRAPH_VIEW,
  EMPTY_CALCULATOR_DEFINITIONS,
  calculatorExtensions,
  calculatorNumberFormatOptions,
  collectSliderVariables,
  normalizeCalculatorExtensions,
} from "../configuration"

describe("calculator configuration", () => {
  it("exposes stable defaults and canonical extension ordering", () => {
    expect(calculatorExtensions()).toEqual([
      CalculatorExtension.SCIENTIFIC,
      CalculatorExtension.GRAPHING,
      CalculatorExtension.STATISTICS,
      CalculatorExtension.TOOLS,
    ])
    expect(DEFAULT_DISPLAY_SETTINGS).toEqual({
      notation: "auto",
      decimals: "auto",
      significantFigures: 12,
      thousandsSeparator: true,
    })
    expect(DEFAULT_GRAPH_VIEW).toEqual({ xmin: -8, xmax: 8, ymin: -5, ymax: 7 })
    expect(EMPTY_CALCULATOR_DEFINITIONS).toEqual([])
  })

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
    expect(normalizeCalculatorExtensions([])).toEqual([])
    expect(
      normalizeCalculatorExtensions([
        CalculatorExtension.GRAPHING,
        "unsupported",
      ] as ReadonlyArray<CalculatorExtension>)
    ).toEqual([CalculatorExtension.GRAPHING])
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
        { expression: " C = 3", value: 3 },
        { expression: "d", value: 4 },
        { expression: "1 = 5", value: 5 },
      ])
    ).toEqual({ a: 4, c: 3, d: 4 })
    expect(collectSliderVariables([])).toEqual({})
  })
})
