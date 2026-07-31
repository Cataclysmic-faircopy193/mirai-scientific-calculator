import { describe, expect, it } from "vitest"

import siteStyles from "@/styles.css?raw"

describe("calculator showcase styles", () => {
  it("includes generated calculator utilities in Tailwind source discovery", () => {
    expect(siteStyles).toContain(
      '@source "../../../packages/calculator-registry/src/components/mirai-calculator";'
    )
  })
})
