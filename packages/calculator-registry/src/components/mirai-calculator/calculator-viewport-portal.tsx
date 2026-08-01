import { useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

/** Moves calculator content between its inline host and the fullscreen viewport layer. */
export function CalculatorViewportPortal({
  fullscreen,
  children,
}: {
  fullscreen: boolean
  children: React.ReactNode
}) {
  const inlineContainerRef = useRef<HTMLDivElement>(null)
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const host = document.createElement("div")
    host.style.display = "contents"
    setPortalHost(host)
    return () => host.remove()
  }, [])

  useLayoutEffect(() => {
    if (!portalHost) {
      return
    }
    const target = fullscreen ? document.body : inlineContainerRef.current
    target?.append(portalHost)
  }, [fullscreen, portalHost])

  return (
    <div ref={inlineContainerRef} style={{ display: "contents" }}>
      {portalHost
        ? createPortal(
            <>
              {fullscreen && (
                <div
                  aria-hidden="true"
                  data-mirai-fullscreen-guard=""
                  className="fixed inset-0 z-2147482999 bg-black/35 backdrop-blur-[1px]"
                />
              )}
              {children}
            </>,
            portalHost
          )
        : children}
    </div>
  )
}
