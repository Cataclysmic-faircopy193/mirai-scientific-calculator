import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { CodeBlock } from "@/site/code-block"
import { CodePreview } from "@/site/code-preview"

const TSX_CODE = `export function Example() {
  return <MiraiCalculator extensions={[CalculatorExtension.SCIENTIFIC]} />
}`
const SHELL_CODE = "pnpm dlx shadcn@latest add @openmirai/calculator"

describe("highlighted code surfaces", () => {
  it.each([
    { language: "tsx", code: TSX_CODE, minimumTokens: 2 },
    { language: "shell", code: SHELL_CODE, minimumTokens: 1 },
  ] as const)(
    "tokenizes $language code while preserving accessible source text",
    ({ language, code, minimumTokens }) => {
      render(<CodeBlock code={code} label="Example" language={language} />)

      const region = screen.getByRole("region", { name: `Example ${language} source code` })
      const highlightedSource = within(region).getByRole("region", {
        name: "Example highlighted source",
      })
      expect(highlightedSource.textContent).toBe(code)
      expect(highlightedSource.querySelectorAll(".token").length).toBeGreaterThanOrEqual(
        minimumTokens
      )
    }
  )

  it("uses the same highlighted renderer in code previews", async () => {
    const user = userEvent.setup()
    render(
      <CodePreview preview={<div>Calculator preview</div>} code={TSX_CODE} previewLabel="Demo" />
    )

    await user.click(screen.getByRole("tab", { name: "Code" }))

    const codeRegion = screen.getByRole("region", { name: "Demo source code" })
    expect(codeRegion.querySelectorAll(".token").length).toBeGreaterThan(1)
  })

  it("keeps copying the original source", async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    render(<CodeBlock code={TSX_CODE} label="Example" />)

    await user.click(
      within(screen.getByRole("region", { name: "Example tsx source code" })).getByRole("button", {
        name: "Copy",
      })
    )

    expect(writeText).toHaveBeenCalledWith(TSX_CODE)
  })
})
