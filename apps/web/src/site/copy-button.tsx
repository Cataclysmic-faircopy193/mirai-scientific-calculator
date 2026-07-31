import { useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Copies provided text and announces the temporary copied state. */
export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle")
  const resetTimer = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      window.clearTimeout(resetTimer.current)
    },
    []
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setStatus("copied")
    } catch {
      setStatus("error")
    }
    window.clearTimeout(resetTimer.current)
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 1800)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copy}
        className={cn("site-copy-button", className)}
      >
        {status === "copied" ? <Check /> : <Copy />}
        {status === "copied" ? "Copied" : status === "error" ? "Copy failed" : label}
      </Button>
      <span className="sr-only" aria-live="polite">
        {status === "copied"
          ? "Copied to clipboard."
          : status === "error"
            ? "Unable to copy to clipboard."
            : ""}
      </span>
    </>
  )
}
