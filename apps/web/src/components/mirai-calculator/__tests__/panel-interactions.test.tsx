import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"

describe("MiraiCalculator panel interactions", () => {
  it("switches keypad tabs with Tailwind-only line styling", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator />)

    const basic = screen.getByRole("tab", { name: "Basic" })
    const functions = screen.getByRole("tab", { name: "Functions" })
    const tabList = screen.getByRole("tablist")

    expect(basic).toHaveAttribute("aria-selected", "true")
    expect(tabList).toHaveClass("h-10!", "overflow-x-auto", "overflow-y-hidden")
    expect(basic).toHaveClass("data-active:text-primary", "after:bg-primary!")
    expect(screen.getByRole("button", { name: "7" })).toHaveClass(
      "mirai-scientific-key",
      "data-[key-label-size=single]:text-lg"
    )

    await user.click(functions)

    expect(functions).toHaveAttribute("aria-selected", "true")
    expect(basic).toHaveAttribute("aria-selected", "false")
    expect(screen.getByRole("button", { name: "round" })).toHaveAttribute(
      "data-key-label-size",
      "medium"
    )
  })

  it("delegates inline sizing and resizing to its host page", () => {
    const { container } = render(
      <div className="h-160 w-225 resize overflow-hidden">
        <MiraiCalculator />
      </div>
    )
    const panel = container.querySelector<HTMLElement>(".mirai-calculator")

    expect(panel).toHaveClass("h-full", "w-full", "@container")
    expect(panel?.style.width).toBe("")
    expect(panel?.style.height).toBe("")
    expect(screen.queryByRole("separator", { name: "Resize calculator" })).not.toBeInTheDocument()
  })

  it("keeps the calculator header on one container-responsive row", () => {
    const { container } = render(<MiraiCalculator />)
    const header = container.querySelector<HTMLElement>(".mirai-calculator-header")
    const main = container.querySelector<HTMLElement>(".mirai-calculator > main")
    const scientificPrimary = container.querySelector<HTMLElement>(".mirai-scientific-primary")
    const switcher = screen.getByRole("navigation", { name: "Calculator modes" })

    expect(header).toHaveClass("flex-nowrap", "overflow-hidden", "@max-[699px]:gap-1")
    expect(main).toHaveClass("min-h-0", "overflow-hidden")
    expect(scientificPrimary).toHaveClass("overflow-hidden")
    expect(switcher).toHaveClass("min-w-0", "overflow-hidden", "@max-[699px]:hidden")
    expect(container.querySelector(".mirai-mode-select")).toHaveClass(
      "hidden",
      "@max-[699px]:block"
    )
  })

  it("opens settings as a scrollable modal contained inside the calculator pane", async () => {
    const user = userEvent.setup()
    const { container } = render(<MiraiCalculator defaultMode="graphing" />)
    const panel = container.querySelector<HTMLElement>(".mirai-calculator")

    if (!panel) {
      throw new Error("Calculator panel did not render")
    }
    await user.click(screen.getByRole("button", { name: "Calculator settings" }))

    const dialog = screen.getByRole("dialog", { name: "Calculator settings" })
    expect(panel).toContainElement(dialog)
    expect(dialog.parentElement).toHaveClass(
      "absolute",
      "inset-0",
      "overflow-hidden",
      "rounded-[inherit]",
      "backdrop-blur-[7px]"
    )
    expect(dialog.querySelector("[data-calculator-settings-body]")).toHaveClass(
      "overflow-y-auto",
      "overscroll-contain"
    )

    fireEvent.keyDown(dialog.parentElement!, { key: "Escape" })
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Calculator settings" })).not.toBeInTheDocument()
    )
  })

  it("hides and restores through a simple page-positioned launcher", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator defaultHidden />)

    const launcher = screen.getByRole("button", { name: "Show calculator" })
    expect(launcher.style.left).toBe("")
    expect(launcher.style.top).toBe("")
    await user.click(launcher)
    expect(screen.getByRole("button", { name: "Hide calculator" })).toBeInTheDocument()
  })

  it("uses the consumer dark theme for portaled select content without copied variables", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator defaultTheme="dark" />)

    await user.click(screen.getByRole("button", { name: "Calculator settings" }))
    await user.click(screen.getAllByRole("combobox")[0])

    const listbox = await screen.findByRole("listbox")
    const portal = listbox.closest<HTMLElement>("[data-slot='select-content']")

    expect(portal).toHaveClass("dark", "z-2147483002")
    expect(portal).toHaveAttribute("data-theme", "dark")
    expect(portal?.style.getPropertyValue("--background")).toBe("")
    expect(portal?.style.getPropertyValue("--popover")).toBe("")
  })

  it("keeps fullscreen sizing controlled by the viewport", async () => {
    const user = userEvent.setup()
    render(<MiraiCalculator />)

    await user.click(screen.getByRole("button", { name: "Enter full screen" }))

    const fullscreenPanel = document.querySelector<HTMLElement>(".mirai-calculator")
    expect(fullscreenPanel).toHaveClass(
      "fixed",
      "inset-3",
      "h-[calc(100dvh-1.5rem)]",
      "z-2147483000"
    )
    expect(fullscreenPanel?.style.height).toBe("")
    expect(document.querySelector("[data-mirai-fullscreen-guard]")).toHaveClass(
      "fixed",
      "inset-0",
      "z-2147482999"
    )
    expect(fullscreenPanel?.parentElement?.parentElement).toBe(document.body)
    expect(document.documentElement).toHaveStyle({ overflow: "hidden" })

    await user.click(screen.getByRole("button", { name: "Exit full screen" }))
    expect(document.documentElement.style.overflow).toBe("")
  })

  it("preserves active mode state while moving fullscreen into the viewport portal", async () => {
    const user = userEvent.setup()
    render(
      <MiraiCalculator
        defaultMode="graphing"
        defaultGraphingData={{ expressions: [{ value: "x² + y² = 25" }] }}
      />
    )
    const expression = screen.getByRole("textbox", { name: "Graph expression 1" })

    fireEvent.change(expression, { target: { value: "x^2-y^2=0" } })
    await user.click(screen.getByRole("button", { name: "Enter full screen" }))

    expect(screen.getByRole("textbox", { name: "Graph expression 1" })).toHaveValue("x^2-y^2=0")
  })

  it("contains graph wheel zoom inside the calculator", () => {
    const { container } = render(<MiraiCalculator defaultMode="graphing" />)
    const canvas = container.querySelector("canvas")
    if (!canvas) {
      throw new Error("Graph canvas did not render")
    }

    const wheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    void act(() => canvas.dispatchEvent(wheelEvent))
    expect(wheelEvent.defaultPrevented).toBe(true)
  })

  it("shows dragged curve coordinates only while the pointer is active", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MiraiCalculator
        defaultMode="graphing"
        defaultGraphingData={{ expressions: [{ value: "y = x" }] }}
      />
    )
    const canvas = container.querySelector("canvas")
    if (!canvas) {
      throw new Error("Graph canvas did not render")
    }
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400 }) as DOMRect

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 300, clientY: 233 })
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 400, clientY: 133.333333333 })
    expect(container.querySelector("[data-graph-trace-coordinate]")).toHaveTextContent("(3, 3)")

    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 400, clientY: 133.333333333 })
    expect(container.querySelector("[data-graph-trace-coordinate]")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Calculator settings" }))
    expect(screen.getByLabelText("x min")).toHaveValue(-8)
  })

  it("updates table cells while dragging a point and clears the transient trace on release", () => {
    const { container } = render(
      <MiraiCalculator
        defaultMode="graphing"
        defaultGraphingData={{
          table: { xValues: [0], series: [{ label: "y₁", values: [0] }] },
        }}
      />
    )
    const canvas = container.querySelector("canvas")
    if (!canvas) {
      throw new Error("Graph canvas did not render")
    }
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400 }) as DOMRect

    fireEvent.pointerDown(canvas, { pointerId: 2, clientX: 300, clientY: 233 })
    fireEvent.pointerMove(canvas, { pointerId: 2, clientX: 400, clientY: 133.333333333 })
    expect(container.querySelector("[data-graph-trace-coordinate]")).toBeInTheDocument()
    fireEvent.pointerUp(canvas, { pointerId: 2, clientX: 400, clientY: 133.333333333 })

    expect(screen.getByRole("textbox", { name: "x₁ row 1" })).toHaveValue("3")
    expect(screen.getByRole("textbox", { name: "y₁ row 1" })).toHaveValue("3")
    expect(container.querySelector("[data-graph-trace-coordinate]")).not.toBeInTheDocument()
  })
})
