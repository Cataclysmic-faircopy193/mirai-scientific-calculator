import { useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CopyStatus = "idle" | "copied" | "error"

function copyButtonLabel(status: CopyStatus, label: string): string {
  switch (status) {
    case "copied":
      return "Copied"
    case "error":
      return "Copy failed"
    case "idle":
      return label
  }
}

function copyButtonAnnouncement(status: CopyStatus): string {
  switch (status) {
    case "copied":
      return "Copied to clipboard."
    case "error":
      return "Unable to copy to clipboard."
    case "idle":
      return ""
  }
}

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
  const [status, setStatus] = useState<CopyStatus>("idle")
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
        {copyButtonLabel(status, label)}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copyButtonAnnouncement(status)}
      </span>
    </>
  )
}
