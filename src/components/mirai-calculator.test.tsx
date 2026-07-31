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

  it("inserts paired absolute-value bars and evaluates implicit multiplication", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator defaultTheme="light" />)

    await user.click(screen.getByRole("button", { name: "6" }))
    await user.click(screen.getByRole("button", { name: "Multiply" }))
    await user.click(screen.getByRole("button", { name: "Absolute value" }))
    await user.click(screen.getByRole("button", { name: "6" }))

    expect(screen.getByLabelText("Calculator expression")).toHaveValue(
      "6×|6|",
    )

    await user.click(screen.getByRole("button", { name: "Equals" }))
    expect(screen.getAllByText("36")).toHaveLength(2)
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

  it("keeps the active mode highlight inside the responsive switcher", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator />)
    const switcher = screen.getByRole("navigation", {
      name: "Calculator modes",
    })
    const tools = screen.getByRole("button", { name: "Tools" })

    await user.click(tools)

    expect(switcher).toHaveClass("min-w-0", "max-w-full", "overflow-hidden")
    expect(tools).toHaveAttribute("aria-current", "page")
    expect(tools).toHaveAttribute("data-active")
    expect(tools).toHaveClass("min-w-0", "w-full", "data-active:bg-background")
    expect(switcher.querySelectorAll("button[data-active]")).toHaveLength(1)
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
