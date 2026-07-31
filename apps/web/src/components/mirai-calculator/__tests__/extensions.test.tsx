import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  CalculatorExtension,
  MiraiCalculator,
  type CalculatorExtension as CalculatorExtensionType,
} from "@/components/mirai-calculator/mirai-calculator"

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
    ] as unknown as readonly CalculatorExtensionType[]

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

  it("shows angle and graph controls only for extensions that use them", async () => {
    const user = userEvent.setup()
    const { unmount } = render(<MiraiCalculator extensions={[CalculatorExtension.STATISTICS]} />)

    expect(screen.queryByRole("button", { name: "Degrees" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Calculator settings" }))
    expect(screen.queryByText("Grid lines")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("x min")).not.toBeInTheDocument()

    unmount()
    render(<MiraiCalculator extensions={[CalculatorExtension.GRAPHING]} />)

    expect(screen.getByRole("button", { name: "Degrees" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Calculator settings" }))
    expect(screen.getByText("Grid lines")).toBeInTheDocument()
    expect(screen.getByLabelText("x min")).toBeInTheDocument()
  })
})
