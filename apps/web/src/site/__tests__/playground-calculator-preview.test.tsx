import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PlaygroundCalculatorPreview } from "@/site/playground-calculator-preview"

describe("PlaygroundCalculatorPreview", () => {
  it("keeps the practice backdrop in the app layer and themes it with the calculator", () => {
    const { container } = render(<PlaygroundCalculatorPreview showBackdrop theme="dark" />)
    const preview = container.querySelector<HTMLElement>("[data-playground-calculator-preview]")
    const backdrop = container.querySelector<HTMLElement>("[data-playground-backdrop]")

    expect(preview).toHaveClass("h-190", "overflow-hidden")
    expect(preview).not.toHaveClass("resize")
    expect(backdrop).toHaveClass("dark", "bg-background")
    expect(backdrop).toHaveAttribute("data-theme", "dark")
    expect(screen.getByText("Practice session")).toBeInTheDocument()
    expect(container.querySelectorAll('svg[aria-label="OpenMirai"]')).toHaveLength(1)
  })

  it("keeps resizing on the calculator frame instead of the backdrop", () => {
    const { container } = render(<PlaygroundCalculatorPreview showBackdrop={false} />)
    const preview = container.querySelector<HTMLElement>("[data-playground-calculator-preview]")
    const frame = container.querySelector<HTMLElement>("[data-playground-calculator-frame]")

    expect(preview).toHaveClass("h-175", "overflow-hidden")
    expect(preview).not.toHaveClass("resize")
    expect(container.querySelector("[data-playground-surface]")).toBeInTheDocument()
    expect(container.querySelector("[data-playground-backdrop]")).not.toBeInTheDocument()
    expect(screen.queryByText("Practice session")).not.toBeInTheDocument()
    expect(frame).toHaveClass("absolute", "max-w-[calc(100%-2rem)]")
    expect(frame).toHaveAttribute("data-min-width", "320")
    expect(frame).toHaveAttribute("data-min-height", "520")
    expect(screen.getByRole("button", { name: "Resize calculator" })).toBeInTheDocument()
  })

  it("drags and resizes the calculator frame within the preview bounds", () => {
    const { container } = render(<PlaygroundCalculatorPreview showBackdrop />)
    const preview = container.querySelector<HTMLElement>("[data-playground-calculator-preview]")!
    const frame = container.querySelector<HTMLElement>("[data-playground-calculator-frame]")!
    const dragHandle = container.querySelector<HTMLElement>("[data-calculator-drag-handle]")!

    preview.getBoundingClientRect = () => ({ width: 1200, height: 760 }) as DOMRect
    fireEvent.resize(window)

    fireEvent.pointerDown(dragHandle, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(window, { clientX: 120, clientY: 105 })
    fireEvent.pointerUp(window)

    expect(frame).toHaveStyle({ left: "84px", top: "81px" })

    fireEvent.pointerDown(screen.getByRole("button", { name: "Resize calculator" }), {
      button: 0,
      clientX: 1000,
      clientY: 700,
    })
    fireEvent.pointerMove(window, { clientX: 100, clientY: 100 })
    fireEvent.pointerUp(window)

    expect(frame).toHaveStyle({ width: "320px", height: "520px" })
  })

  it("moves a hidden calculator immediately without treating the drag as a show click", () => {
    const { container } = render(<PlaygroundCalculatorPreview showBackdrop />)
    const preview = container.querySelector<HTMLElement>("[data-playground-calculator-preview]")!
    const frame = container.querySelector<HTMLElement>("[data-playground-calculator-frame]")!

    preview.getBoundingClientRect = () => ({ width: 1200, height: 760 }) as DOMRect
    fireEvent.resize(window)
    fireEvent.click(screen.getByRole("button", { name: "Hide calculator" }))

    const launcher = screen.getByRole("button", { name: "Show calculator" })
    expect(frame).toHaveStyle({ width: "48px", height: "48px" })
    expect(screen.queryByRole("button", { name: "Resize calculator" })).not.toBeInTheDocument()

    fireEvent.pointerDown(launcher, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(window, { clientX: 140, clientY: 105 })
    fireEvent.pointerUp(window)
    fireEvent.click(launcher)

    expect(frame).toHaveStyle({ left: "104px", top: "81px" })
    expect(screen.getByRole("button", { name: "Show calculator" })).toBeInTheDocument()

    fireEvent.click(launcher)
    expect(screen.getByRole("button", { name: "Hide calculator" })).toBeInTheDocument()
    expect(frame).toHaveStyle({ width: "1040px", height: "660px" })
    expect(screen.getByRole("button", { name: "Resize calculator" })).toBeInTheDocument()
  })

  it("reacts to system color-scheme changes and scopes explicit light mode", () => {
    const originalMatchMedia = window.matchMedia
    const listeners = new Set<() => void>()
    let matches = false
    const mediaQuery = {
      matches,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: (_type: string, listener: () => void) => {
        listeners.add(listener)
      },
      removeEventListener: (_type: string, listener: () => void) => {
        listeners.delete(listener)
      },
      dispatchEvent: () => true,
    } as unknown as MediaQueryList
    window.matchMedia = () => mediaQuery

    const { container, rerender, unmount } = render(
      <PlaygroundCalculatorPreview showBackdrop theme="system" />
    )
    const preview = container.querySelector<HTMLElement>("[data-playground-calculator-preview]")!

    expect(preview).toHaveClass("light")
    matches = true
    Object.defineProperty(mediaQuery, "matches", { configurable: true, value: true })
    act(() => listeners.forEach((listener) => listener()))
    expect(preview).toHaveClass("dark")

    document.documentElement.classList.add("dark")
    rerender(<PlaygroundCalculatorPreview showBackdrop theme="light" />)
    expect(preview).toHaveClass("light")
    expect(container.querySelector(".mirai-calculator")).toHaveClass("light")

    unmount()
    document.documentElement.classList.remove("dark")
    window.matchMedia = originalMatchMedia
  })
})
