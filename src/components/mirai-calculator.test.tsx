import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { MiraiCalculator } from "@/components/mirai-calculator"

describe("MiraiCalculator", () => {
  it("evaluates an expression from the scientific keypad", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator defaultTheme="light" />)

    await user.click(screen.getByRole("button", { name: "7" }))
    await user.click(screen.getByRole("button", { name: "Multiply" }))
    await user.click(screen.getByRole("button", { name: "8" }))
    await user.click(screen.getByRole("button", { name: "Equals" }))

    expect(screen.getAllByText("56")).toHaveLength(2)
    expect(screen.getByText("7×8")).toBeInTheDocument()
  })

  it("supports dark mode and toggles back to light", async () => {
    const user = userEvent.setup()
    const { container } = render(<MiraiCalculator defaultTheme="dark" />)
    const calculator = container.querySelector(".mirai-calculator")

    expect(calculator).toHaveAttribute("data-theme", "dark")
    await user.click(
      screen.getByRole("button", { name: "Use light mode" }),
    )
    expect(calculator).toHaveAttribute("data-theme", "light")
  })

  it("switches among graphing, statistics, and tools modes", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator />)

    await user.click(screen.getByRole("button", { name: "Graphing" }))
    expect(
      screen.getByRole("textbox", { name: "Graph expression 1" }),
    ).toHaveValue("y = a x² − 5x + 6")

    await user.click(screen.getByRole("button", { name: "Stats" }))
    expect(screen.getByLabelText("X values")).toBeInTheDocument()
    expect(screen.getByText("One-variable statistics · x list")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Tools" }))
    expect(screen.getByText("Ratio and proportion")).toBeInTheDocument()
    expect(screen.getByText("Prism volume")).toBeInTheDocument()
  })

  it("updates tool results as values change", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator defaultMode="tools" />)

    const percent = screen.getByLabelText("Percent")
    await user.clear(percent)
    await user.type(percent, "20")

    expect(screen.getByText("48")).toBeInTheDocument()
  })
})
