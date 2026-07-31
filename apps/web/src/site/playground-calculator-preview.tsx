import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
} from "react"

import {
  MiraiCalculator,
  OpenMiraiLogo,
  type CalculatorTheme,
} from "@/components/mirai-calculator/mirai-calculator"
import {
  PLAYGROUND_CALCULATOR_GEOMETRY,
  PLAYGROUND_PRACTICE_ANSWERS,
} from "@/site/constants/playground"
import { useSystemTheme } from "@/site/use-system-theme"

type PlaygroundCalculatorPreviewProps = ComponentProps<typeof MiraiCalculator> & {
  showBackdrop: boolean
}

interface FrameGeometry {
  x: number
  y: number
  width: number
  height: number
}

interface PreviewBounds {
  width: number
  height: number
}

interface FrameInteraction {
  kind: "drag" | "resize"
  startClientX: number
  startClientY: number
  startGeometry: FrameGeometry
  lastGeometry: FrameGeometry
  moved: boolean
  draggedLauncher: boolean
}

const INITIAL_FRAME_GEOMETRY: FrameGeometry = {
  x: PLAYGROUND_CALCULATOR_GEOMETRY.defaultX,
  y: PLAYGROUND_CALCULATOR_GEOMETRY.defaultY,
  width: PLAYGROUND_CALCULATOR_GEOMETRY.defaultWidth,
  height: PLAYGROUND_CALCULATOR_GEOMETRY.defaultHeight,
}

const EMPTY_PREVIEW_BOUNDS: PreviewBounds = { width: 0, height: 0 }

/** Clamps a number to an inclusive range. */
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

/** Keeps a requested calculator frame inside its preview without exceeding responsive bounds. */
function constrainFrameGeometry(geometry: FrameGeometry, bounds: PreviewBounds): FrameGeometry {
  if (bounds.width <= 0 || bounds.height <= 0) return geometry

  const gap = Math.min(
    PLAYGROUND_CALCULATOR_GEOMETRY.boundaryGap,
    bounds.width / 2,
    bounds.height / 2
  )
  const availableWidth = Math.max(1, bounds.width - gap * 2)
  const availableHeight = Math.max(1, bounds.height - gap * 2)
  const minimumWidth = Math.min(PLAYGROUND_CALCULATOR_GEOMETRY.minWidth, availableWidth)
  const minimumHeight = Math.min(PLAYGROUND_CALCULATOR_GEOMETRY.minHeight, availableHeight)
  const width = clamp(geometry.width, minimumWidth, availableWidth)
  const height = clamp(geometry.height, minimumHeight, availableHeight)

  return {
    x: clamp(geometry.x, gap, Math.max(gap, bounds.width - gap - width)),
    y: clamp(geometry.y, gap, Math.max(gap, bounds.height - gap - height)),
    width,
    height,
  }
}

/** Applies pointer-driven geometry immediately so dragging stays synchronized with the pointer. */
function applyFrameGeometry(frame: HTMLDivElement, geometry: FrameGeometry): void {
  frame.style.left = `${geometry.x}px`
  frame.style.top = `${geometry.y}px`
  frame.style.width = `${geometry.width}px`
  frame.style.height = `${geometry.height}px`
}

/** Resolves a calculator theme for app-owned preview scenery. */
function useResolvedCalculatorTheme(theme: CalculatorTheme): "light" | "dark" {
  const systemDark = useSystemTheme()
  return theme === "system" ? (systemDark ? "dark" : "light") : theme
}

/** Renders the website-only practice scene behind the installable calculator component. */
function PracticeBackdrop({ theme }: { theme: "light" | "dark" }) {
  return (
    <div
      aria-hidden="true"
      data-playground-backdrop=""
      data-theme={theme}
      className={`pointer-events-none absolute inset-0 flex flex-col overflow-hidden bg-background text-foreground ${theme}`}
    >
      <div className="flex h-14 shrink-0 items-center border-b bg-card/95 px-6">
        <OpenMiraiLogo />
        <span className="ml-auto text-xs font-medium text-muted-foreground">Practice session</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] bg-muted/20">
        <div className="border-r border-border/70 p-[clamp(1.5rem,4vw,3rem)] text-base leading-7">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Question 14 of 22
          </p>
          The function h is defined by h(x) = x² − 5x + 6. For what values of x does the graph of h
          cross the x-axis?
        </div>
        <div className="space-y-3 bg-background/55 p-[clamp(1.5rem,4vw,3rem)]">
          {PLAYGROUND_PRACTICE_ANSWERS.map((answer, index) => (
            <div
              key={answer}
              className="rounded-lg border bg-card/90 px-4 py-3 text-sm text-card-foreground shadow-sm"
            >
              {String.fromCharCode(65 + index)}. {answer}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Draws an inset three-line resize grip that remains clear of rounded frame corners. */
function CalculatorResizeGrip() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 translate-x-0.5 translate-y-0.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.75"
    >
      <path d="M7 20 20 7M13 20l7-7M18 20l2-2" />
    </svg>
  )
}

/** Composes an app-owned draggable calculator frame over the optional practice backdrop. */
export function PlaygroundCalculatorPreview({
  showBackdrop,
  theme,
  defaultTheme,
  ...calculatorProps
}: PlaygroundCalculatorPreviewProps) {
  const resolvedTheme = useResolvedCalculatorTheme(theme ?? defaultTheme ?? "light")
  const previewRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const interactionRef = useRef<FrameInteraction | null>(null)
  const interactionCleanupRef = useRef<(() => void) | null>(null)
  const suppressLauncherClickRef = useRef(false)
  const [previewBounds, setPreviewBounds] = useState(EMPTY_PREVIEW_BOUNDS)
  const [frameGeometry, setFrameGeometry] = useState(INITIAL_FRAME_GEOMETRY)
  const constrainedGeometry = useMemo(
    () => constrainFrameGeometry(frameGeometry, previewBounds),
    [frameGeometry, previewBounds]
  )

  useLayoutEffect(() => {
    const preview = previewRef.current
    if (!preview) return

    const measure = () => {
      const bounds = preview.getBoundingClientRect()
      setPreviewBounds((current) =>
        current.width === bounds.width && current.height === bounds.height
          ? current
          : { width: bounds.width, height: bounds.height }
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(preview)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  useEffect(
    () => () => {
      interactionCleanupRef.current?.()
    },
    []
  )

  /** Starts an immediate app-layer drag or resize interaction. */
  const startFrameInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    const target = event.target as HTMLElement
    const resizeHandle = target.closest("[data-playground-calculator-resize-handle]")
    const dragHandle = target.closest("[data-calculator-drag-handle]")
    const hiddenLauncher = target.closest("[data-calculator-hidden-launcher]")
    if (!resizeHandle && !dragHandle && !hiddenLauncher) return

    if (
      dragHandle &&
      !hiddenLauncher &&
      target.closest(
        "button, input, select, textarea, a, [role='button'], [data-slot='select-trigger']"
      )
    ) {
      return
    }

    event.preventDefault()
    if (resizeHandle) event.stopPropagation()
    interactionCleanupRef.current?.()

    const interaction: FrameInteraction = {
      kind: resizeHandle ? "resize" : "drag",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startGeometry: constrainedGeometry,
      lastGeometry: constrainedGeometry,
      moved: false,
      draggedLauncher: Boolean(hiddenLauncher),
    }
    interactionRef.current = interaction

    const move = (pointerEvent: PointerEvent) => {
      const activeInteraction = interactionRef.current
      const frame = frameRef.current
      if (!activeInteraction || !frame) return

      const deltaX = pointerEvent.clientX - activeInteraction.startClientX
      const deltaY = pointerEvent.clientY - activeInteraction.startClientY
      activeInteraction.moved ||= Math.abs(deltaX) + Math.abs(deltaY) > 2
      const requestedGeometry =
        activeInteraction.kind === "drag"
          ? {
              ...activeInteraction.startGeometry,
              x: activeInteraction.startGeometry.x + deltaX,
              y: activeInteraction.startGeometry.y + deltaY,
            }
          : {
              ...activeInteraction.startGeometry,
              width: activeInteraction.startGeometry.width + deltaX,
              height: activeInteraction.startGeometry.height + deltaY,
            }
      activeInteraction.lastGeometry = constrainFrameGeometry(requestedGeometry, previewBounds)
      applyFrameGeometry(frame, activeInteraction.lastGeometry)
    }

    const cleanup = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", end)
      window.removeEventListener("pointercancel", end)
      interactionCleanupRef.current = null
    }

    const end = () => {
      const activeInteraction = interactionRef.current
      if (activeInteraction) {
        setFrameGeometry(activeInteraction.lastGeometry)
        suppressLauncherClickRef.current =
          activeInteraction.draggedLauncher && activeInteraction.moved
      }
      interactionRef.current = null
      cleanup()
    }

    interactionCleanupRef.current = cleanup
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", end)
    window.addEventListener("pointercancel", end)
  }

  return (
    <div
      ref={previewRef}
      data-playground-calculator-preview=""
      data-theme={resolvedTheme}
      className={`relative isolate min-h-[560px] w-full min-w-0 max-w-full overflow-hidden bg-background ${showBackdrop ? "h-[760px]" : "h-[700px]"} ${resolvedTheme}`}
    >
      {showBackdrop ? (
        <PracticeBackdrop theme={resolvedTheme} />
      ) : (
        <div
          aria-hidden="true"
          data-playground-surface=""
          className="pointer-events-none absolute inset-0 bg-muted/25"
        />
      )}
      <div
        ref={frameRef}
        data-playground-calculator-frame=""
        data-min-height={PLAYGROUND_CALCULATOR_GEOMETRY.minHeight}
        data-min-width={PLAYGROUND_CALCULATOR_GEOMETRY.minWidth}
        className="absolute min-h-0 min-w-0 max-h-[calc(100%_-_2rem)] max-w-[calc(100%_-_2rem)] touch-none [&_[data-calculator-drag-handle]]:cursor-grab [&_[data-calculator-drag-handle]]:active:cursor-grabbing"
        style={{
          left: constrainedGeometry.x,
          top: constrainedGeometry.y,
          width: constrainedGeometry.width,
          height: constrainedGeometry.height,
        }}
        onPointerDownCapture={startFrameInteraction}
        onClickCapture={(event) => {
          if (
            suppressLauncherClickRef.current &&
            (event.target as HTMLElement).closest("[data-calculator-hidden-launcher]")
          ) {
            suppressLauncherClickRef.current = false
            event.preventDefault()
            event.stopPropagation()
          }
        }}
      >
        <MiraiCalculator {...calculatorProps} theme={theme} defaultTheme={defaultTheme} />
        <button
          type="button"
          aria-label="Resize calculator"
          data-playground-calculator-resize-handle=""
          className="absolute right-0 bottom-0 z-50 flex size-6 cursor-nwse-resize touch-none items-center justify-center bg-transparent text-muted-foreground/70 outline-none hover:text-foreground focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalculatorResizeGrip />
        </button>
      </div>
    </div>
  )
}
