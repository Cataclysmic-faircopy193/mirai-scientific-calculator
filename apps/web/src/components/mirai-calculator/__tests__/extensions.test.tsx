import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"
import { CalculatorExtension } from "@openmirai/calculator-core/configuration"
import type { CalculatorExtension as CalculatorExtensionType } from "@openmirai/calculator-core/configuration"

describe("MiraiCalculator extensions", () => {
  it("exports enum-like uppercase keys with URL-friendly values", () => {
    expect(CalculatorExtension).toEqual({
      SCIENTIFIC: "scientific",
      GRAPHING: "graphing",
      STATISTICS: "statistics",
      TOOLS: "tools",
    })
  })

  it("defaults to every built-in extension", () => {
    render(<MiraiCalculator />)

    expect(
      within(screen.getByRole("navigation", { name: "Calculator modes" }))
        .getAllByRole("button")
        .map((button) => button.textContent)
    ).toEqual(["Scientific", "Graphing", "Stats", "Tools"])
  })

  it("preserves order, removes duplicates, ignores invalid values, and falls back silently", () => {
    const onModeChange = vi.fn()
    const extensions = [
      CalculatorExtension.TOOLS,
      "unsupported",
      CalculatorExtension.TOOLS,
      CalculatorExtension.SCIENTIFIC,
    ] as unknown as ReadonlyArray<CalculatorExtensionType>

    render(
      <MiraiCalculator
        extensions={extensions}
        defaultMode={CalculatorExtension.STATISTICS}
        onModeChange={onModeChange}
      />
    )

    expect(
      within(screen.getByRole("navigation", { name: "Calculator modes" }))
        .getAllByRole("button")
        .map((button) => button.textContent)
    ).toEqual(["Tools", "Scientific"])
    expect(screen.getByText("Ratio and proportion")).toBeInTheDocument()
    expect(onModeChange).not.toHaveBeenCalled()
  })

  it("falls back from a disabled controlled mode without firing its callback", () => {
    const onModeChange = vi.fn()

    render(
      <MiraiCalculator
        extensions={[CalculatorExtension.STATISTICS]}
        mode={CalculatorExtension.GRAPHING}
        onModeChange={onModeChange}
      />
    )

    expect(screen.getByText("One-variable statistics · x list")).toBeInTheDocument()
    expect(onModeChange).not.toHaveBeenCalled()
  })

  it("renders an accessible state when no extensions are enabled", () => {
    render(<MiraiCalculator extensions={[]} />)

    expect(screen.queryByRole("navigation", { name: "Calculator modes" })).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("No calculator extensions enabled")
  })

  it("renders a plain mode label when only one extension is enabled", () => {
    render(<MiraiCalculator extensions={[CalculatorExtension.GRAPHING]} />)

    expect(screen.queryByRole("navigation", { name: "Calculator modes" })).not.toBeInTheDocument()
    expect(screen.getByText("Graphing", { selector: "[data-calculator-mode-label]" })).toBeVisible()
  })

  it("keeps graphing demo data opt-in and supports multiple table variables", async () => {
    const user = userEvent.setup()
    const { unmount } = render(<MiraiCalculator extensions={[CalculatorExtension.GRAPHING]} />)

    expect(screen.getByText("No expressions yet")).toBeInTheDocument()
    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    expect(screen.queryByRole("region", { name: "Graph analysis" })).not.toBeInTheDocument()

    unmount()
    render(
      <MiraiCalculator
        extensions={[CalculatorExtension.GRAPHING]}
        defaultDefinitions={["f(x) = x²"]}
        defaultGraphingData={{
          expressions: [{ value: "y = f(x)" }],
          table: {
            xValues: [0, 1],
            series: [
              { label: "y₁", values: [1, 2] },
              { label: "y₂", values: [3, 4] },
            ],
          },
        }}
      />
    )

    expect(screen.getByRole("textbox", { name: "Graph expression 1" })).toHaveValue("y = f(x)")
    expect(screen.getAllByRole("columnheader")).toHaveLength(5)
    expect(screen.getByRole("textbox", { name: "y₂ row 2" })).toHaveValue("4")
    const graphTable = screen.getByRole("table")
    expect(graphTable).toHaveClass("table-fixed", "w-full")
    expect(graphTable.parentElement).toHaveClass(
      "mirai-graphing-table-scroll",
      "max-w-full",
      "overflow-x-auto"
    )
    expect(screen.getByRole("button", { name: "Variable" })).toHaveClass("rounded-md")
    expect(screen.getByRole("button", { name: "Add row" })).toHaveClass("rounded-md")
    expect(screen.getByRole("button", { name: "Clear" })).toHaveClass("rounded-md")

    await user.click(screen.getByRole("button", { name: "Analysis" }))
    expect(screen.getByText("Analysis", { selector: "h3" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Hide analysis" })).toBeInTheDocument()
  })

  it("lets graphing empty-state Add actions create the missing content", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator extensions={[CalculatorExtension.GRAPHING]} />)

    await user.click(screen.getByRole("button", { name: "Add expression" }))
    expect(screen.getByRole("textbox", { name: "Graph expression 1" })).toHaveValue("")

    await user.click(screen.getByRole("button", { name: "Add table row" }))
    expect(screen.getByRole("textbox", { name: "x₁ row 1" })).toHaveValue("")
    expect(screen.getByRole("textbox", { name: "y₁ row 1" })).toHaveValue("")
  })

  it("lets the scientific empty-state Add action create a definition", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator extensions={[CalculatorExtension.SCIENTIFIC]} />)

    await user.click(screen.getByRole("button", { name: "Add definition" }))

    expect(screen.getByRole("textbox", { name: "Definition 1" })).toHaveValue("")
  })

  it("keeps definition rows aligned when an earlier definition is removed", async () => {
    const user = userEvent.setup()
    render(
      <MiraiCalculator
        extensions={[CalculatorExtension.SCIENTIFIC]}
        defaultDefinitions={["a = 1", "b = 2"]}
      />
    )

    await user.click(screen.getByRole("button", { name: "Remove definition 1" }))

    expect(screen.getByRole("textbox", { name: "Definition 1" })).toHaveValue("b = 2")
    expect(screen.queryByRole("textbox", { name: "Definition 2" })).not.toBeInTheDocument()
  })

  it("shows angle and graph controls only for extensions that use them", async () => {
    const user = userEvent.setup()
    const { unmount } = render(<MiraiCalculator extensions={[CalculatorExtension.STATISTICS]} />)

    expect(screen.queryByRole("combobox", { name: "Angle mode" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Calculator settings" }))
    expect(screen.queryByRole("combobox", { name: "Angle mode" })).not.toBeInTheDocument()
    expect(screen.queryByText("Grid lines")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("x min")).not.toBeInTheDocument()

    unmount()
    render(<MiraiCalculator extensions={[CalculatorExtension.GRAPHING]} />)

    expect(screen.queryByRole("combobox", { name: "Angle mode" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Calculator settings" }))
    expect(screen.getByRole("combobox", { name: "Angle mode" })).toHaveTextContent("Degrees")
    expect(screen.getByText("Grid lines")).toBeInTheDocument()
    expect(screen.getByLabelText("x min")).toBeInTheDocument()
  })

  it("keeps statistics cards inside a responsive overflow-safe grid", () => {
    const { container } = render(
      <MiraiCalculator
        extensions={[CalculatorExtension.STATISTICS]}
        defaultStatisticsData={{
          xValues: [2, 4, 4, 5, 7, 8, 9, 12, 12, 15],
          yValues: [5.1, 8.9, 9.4, 11.2, 15.1, 17.3, 18.8, 25.2, 24.6, 30.4],
        }}
      />
    )
    const statisticsGrid = container.querySelector<HTMLElement>(".mirai-statistics-grid")

    expect(statisticsGrid).toBeInTheDocument()
    expect(statisticsGrid?.children).toHaveLength(15)
    expect(statisticsGrid?.firstElementChild).toHaveClass("min-w-0", "overflow-hidden")
    expect(container.querySelector(".mirai-statistics-chart")).toBeInTheDocument()
    expect(container.querySelector(".mirai-statistics-summary")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "X values" })).toHaveClass("text-foreground")
    expect(screen.getByRole("textbox", { name: "Y values" })).toHaveClass("text-foreground")
  })

  it("marks tool result rows for compact stacked layout", () => {
    const { container } = render(<MiraiCalculator extensions={[CalculatorExtension.TOOLS]} />)

    const resultRows = container.querySelectorAll(".mirai-tools-result")
    expect(resultRows.length).toBeGreaterThan(0)
    expect(resultRows[0]?.querySelector("strong")).toHaveClass("min-w-0", "max-w-full")
    expect(container.querySelectorAll(".mirai-tools-fields")).toHaveLength(4)
    expect(container.querySelector(".mirai-tools-shape-results")).toBeInTheDocument()
  })

  it("keeps statistics values empty unless the consumer supplies initial data", () => {
    const { unmount } = render(<MiraiCalculator extensions={[CalculatorExtension.STATISTICS]} />)

    expect(screen.getByRole("textbox", { name: "X values" })).toHaveValue("")
    expect(screen.getByRole("textbox", { name: "Y values" })).toHaveValue("")

    unmount()
    render(
      <MiraiCalculator
        extensions={[CalculatorExtension.STATISTICS]}
        defaultStatisticsData={{ xValues: [1, 2], yValues: [3, 4] }}
      />
    )

    expect(screen.getByRole("textbox", { name: "X values" })).toHaveValue("1, 2")
    expect(screen.getByRole("textbox", { name: "Y values" })).toHaveValue("3, 4")
  })
})
