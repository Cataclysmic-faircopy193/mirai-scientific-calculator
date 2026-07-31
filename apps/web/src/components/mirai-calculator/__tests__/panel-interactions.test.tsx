import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"

describe("MiraiCalculator panel interactions", () => {
  it("switches keypad tabs with a line-style active state", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator />)

    const basic = screen.getByRole("tab", { name: "Basic" })
    const functions = screen.getByRole("tab", { name: "Functions" })
    const tabList = screen.getByRole("tablist")

    expect(basic).toHaveAttribute("aria-selected", "true")
    expect(tabList).toHaveClass("mirai-keypad-tabs-list")

    await user.click(functions)

    expect(functions).toHaveAttribute("aria-selected", "true")
    expect(basic).toHaveAttribute("aria-selected", "false")
  })

  it("drags and resizes the backdrop panel", () => {
    const { container } = render(<MiraiCalculator showBackdrop />)
    const panel = container.querySelector<HTMLElement>(".mirai-calculator")
    const backdrop = panel?.parentElement
    const header = panel?.querySelector<HTMLElement>("header")
    const resizeHandle = screen.getByRole("separator", {
      name: "Resize calculator",
    })

    if (!panel || !backdrop || !header) {
      throw new Error("Calculator panel did not render")
    }

    backdrop.getBoundingClientRect = () =>
      ({
        bottom: 880,
        height: 880,
        left: 0,
        right: 1400,
        top: 0,
        width: 1400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect

    fireEvent.pointerDown(header, {
      button: 0,
      clientX: 500,
      clientY: 110,
    })
    fireEvent.pointerMove(window, { clientX: 580, clientY: 150 })
    fireEvent.pointerUp(window)

    expect(panel).toHaveStyle({ left: "152px", top: "132px" })

    fireEvent.pointerDown(resizeHandle, {
      button: 0,
      clientX: 1192,
      clientY: 792,
    })
    fireEvent.pointerMove(window, { clientX: 1072, clientY: 712 })
    fireEvent.pointerUp(window)

    expect(panel).toHaveStyle({ height: "580px", width: "920px" })
  })

  it("carries the calculator theme into portaled select content", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator defaultTheme="dark" />)

    await user.click(screen.getByRole("button", { name: "Calculator settings" }))
    await user.click(screen.getAllByRole("combobox")[0])

    const listbox = await screen.findByRole("listbox")
    const portal = listbox.closest<HTMLElement>("[data-slot='select-content']")

    if (!portal) {
      throw new Error("Select portal did not render")
    }

    expect(portal).toHaveClass("mirai-calculator-package", "mirai-calculator-portal", "dark")
    expect(portal).toHaveAttribute("data-theme", "dark")
    expect(portal.style.getPropertyValue("--background")).toBeTruthy()
    expect(portal.style.getPropertyValue("--popover")).toBeTruthy()
  })
})
