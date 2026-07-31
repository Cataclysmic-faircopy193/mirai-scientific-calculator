import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import {
  Calculator as CalculatorIcon,
  Expand,
  EyeOff,
  Minimize2,
  Moon,
  RotateCcw,
  Settings2,
  Sun,
  X,
} from "lucide-react"

import {
  GraphingMode,
  type GraphingInitialData,
} from "@/components/mirai-calculator/modes/graphing-mode"
import { ScientificMode } from "@/components/mirai-calculator/modes/scientific-mode"
import {
  StatisticsMode,
  type StatisticsInitialData,
} from "@/components/mirai-calculator/modes/statistics-mode"
import { ToolsMode } from "@/components/mirai-calculator/modes/tools-mode"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ANGLE_MODE_LABELS,
  CalculatorExtension as CoreCalculatorExtension,
  DECIMAL_OPTIONS,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_GRAPH_VIEW,
  EMPTY_CALCULATOR_DEFINITIONS,
  GRAPH_BOUNDARY_KEYS,
  NOTATION_LABELS,
  THEME_LABELS,
  calculatorNumberFormatOptions,
  collectSliderVariables,
  normalizeCalculatorExtensions,
  type CalculatorDisplaySettings,
  type CalculatorExtension as CalculatorExtensionValue,
  type CalculatorMode,
  type CalculatorTheme,
} from "@openmirai/calculator-core/configuration"
import {
  CalculatorEngine,
  type AngleMode,
  type NumberFormatOptions,
} from "@openmirai/calculator-core/engine"
import type { GraphView } from "@openmirai/calculator-core/graphing"
import type { ToolsInitialData as ToolsInitialDataValue } from "@openmirai/calculator-core/tools"
import { cn } from "@/lib/utils"

/** Identifies an installable calculator workspace. */
export const CalculatorExtension = CoreCalculatorExtension
export type { CalculatorMode, CalculatorTheme }
export type CalculatorExtension = CalculatorExtensionValue
export type {
  GraphingExpressionInitialValue,
  GraphingInitialData,
  GraphingSliderInitialValue,
  GraphingTableInitialValue,
  GraphingTableSeriesInitialValue,
} from "@/components/mirai-calculator/modes/graphing-mode"
export type { StatisticsInitialData } from "@/components/mirai-calculator/modes/statistics-mode"
export type { ToolsInitialData } from "@openmirai/calculator-core/tools"

export interface MiraiCalculatorProps {
  className?: string
  extensions?: readonly CalculatorExtension[]
  mode?: CalculatorMode
  defaultMode?: CalculatorMode
  onModeChange?: (mode: CalculatorMode) => void
  angleMode?: AngleMode
  defaultAngleMode?: AngleMode
  onAngleModeChange?: (mode: AngleMode) => void
  theme?: CalculatorTheme
  defaultTheme?: CalculatorTheme
  onThemeChange?: (theme: CalculatorTheme) => void
  hidden?: boolean
  defaultHidden?: boolean
  onHiddenChange?: (hidden: boolean) => void
  startFullscreen?: boolean
  title?: string
  onClose?: () => void
  defaultDefinitions?: readonly string[]
  defaultGraphingData?: GraphingInitialData
  defaultStatisticsData?: StatisticsInitialData
  defaultToolsData?: ToolsInitialDataValue
}

interface ModeRendererProps {
  resetSignal: number
  engine: CalculatorEngine
  activeAngleMode: AngleMode
  ans: number
  definitions: string[]
  setDefinitions: (definitions: string[]) => void
  setAns: (ans: number) => void
  formatOptions: NumberFormatOptions
  formatNumber: (value: number) => string
  setVariables: (variables: Record<string, number>) => void
  graphView: GraphView
  setGraphView: (view: GraphView) => void
  graphGridVisible: boolean
  setGraphGridVisible: (visible: boolean) => void
  resolvedTheme: "light" | "dark"
  defaultGraphingData?: GraphingInitialData
  defaultStatisticsData?: StatisticsInitialData
  defaultToolsData?: ToolsInitialDataValue
}

interface ExtensionDefinition {
  label: string
  compactLabel: string
  usesAngleMode: boolean
  hasGraphSettings: boolean
  render: (props: ModeRendererProps) => ReactNode
}

const EXTENSION_DEFINITIONS: Record<CalculatorExtension, ExtensionDefinition> = {
  [CalculatorExtension.SCIENTIFIC]: {
    label: "Scientific",
    compactLabel: "Sci",
    usesAngleMode: true,
    hasGraphSettings: false,
    render: ({ resetSignal, engine, definitions, setDefinitions, setAns, formatOptions }) => (
      <ScientificMode
        key={`scientific-${resetSignal}`}
        engine={engine}
        definitions={definitions}
        onDefinitionsChange={setDefinitions}
        onAnsChange={setAns}
        formatOptions={formatOptions}
      />
    ),
  },
  [CalculatorExtension.GRAPHING]: {
    label: "Graphing",
    compactLabel: "Graph",
    usesAngleMode: true,
    hasGraphSettings: true,
    render: ({
      resetSignal,
      activeAngleMode,
      ans,
      definitions,
      formatNumber,
      setVariables,
      graphView,
      setGraphView,
      graphGridVisible,
      setGraphGridVisible,
      resolvedTheme,
      defaultGraphingData,
    }) => (
      <GraphingMode
        key={`graphing-${resetSignal}`}
        angleMode={activeAngleMode}
        ans={ans}
        definitions={definitions}
        formatNumber={formatNumber}
        onVariablesChange={setVariables}
        view={graphView}
        onViewChange={setGraphView}
        gridVisible={graphGridVisible}
        onGridVisibleChange={setGraphGridVisible}
        colorScheme={resolvedTheme}
        defaultData={defaultGraphingData}
      />
    ),
  },
  [CalculatorExtension.STATISTICS]: {
    label: "Stats",
    compactLabel: "Stats",
    usesAngleMode: false,
    hasGraphSettings: false,
    render: ({ resetSignal, formatNumber, resolvedTheme, defaultStatisticsData }) => (
      <StatisticsMode
        key={`statistics-${resetSignal}`}
        formatNumber={formatNumber}
        colorScheme={resolvedTheme}
        defaultData={defaultStatisticsData}
      />
    ),
  },
  [CalculatorExtension.TOOLS]: {
    label: "Tools",
    compactLabel: "Tools",
    usesAngleMode: false,
    hasGraphSettings: false,
    render: ({ resetSignal, formatNumber, defaultToolsData }) => (
      <ToolsMode
        key={`tools-${resetSignal}`}
        formatNumber={formatNumber}
        defaultData={defaultToolsData}
      />
    ),
  },
}

function subscribeToSystemTheme(onStoreChange: () => void): () => void {
  const query = window.matchMedia("(prefers-color-scheme: dark)")
  query.addEventListener("change", onStoreChange)
  return () => query.removeEventListener("change", onStoreChange)
}

function getSystemThemeSnapshot(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function getServerSystemThemeSnapshot(): boolean {
  return false
}

/** Renders the non-optional OpenMirai wordmark embedded in the calculator chrome. */
export function OpenMiraiLogo() {
  return (
    <svg
      aria-label="OpenMirai"
      role="img"
      viewBox="0 0 312 79"
      className="h-5 w-auto shrink-0 text-foreground"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19.4836 14.9046L33.9009 0L48.3179 14.9046L33.9009 29.8092L19.4836 14.9046Z"
        fill="currentColor"
      />
      <path
        d="M111.075 55.805C108.136 55.805 105.489 55.1458 103.133 53.8273C100.776 52.4804 98.9187 50.6318 97.5603 48.2817C96.2295 45.9315 95.5641 43.3091 95.5641 40.4144C95.5641 37.5196 96.2295 34.8973 97.5603 32.5472C98.9187 30.1972 100.776 28.3629 103.133 27.0445C105.489 25.6975 108.136 25.0239 111.075 25.0239C113.986 25.0239 116.62 25.6975 118.976 27.0445C121.333 28.3629 123.176 30.1972 124.507 32.5472C125.838 34.8688 126.503 37.4912 126.503 40.4144C126.503 43.3378 125.838 45.9745 124.507 48.3246C123.176 50.6461 121.333 52.4804 118.976 53.8273C116.62 55.1458 113.986 55.805 111.075 55.805ZM111.075 51.9787C113.21 51.9787 115.123 51.4773 116.814 50.4742C118.533 49.4711 119.877 48.0953 120.847 46.3471C121.846 44.5702 122.345 42.5925 122.345 40.4144C122.345 38.2363 121.846 36.2731 120.847 34.5247C119.877 32.7478 118.533 31.3579 116.814 30.3548C115.123 29.3517 113.21 28.85 111.075 28.85C108.94 28.85 107 29.3517 105.253 30.3548C103.534 31.3579 102.176 32.7478 101.178 34.5247C100.208 36.2731 99.7225 38.2363 99.7225 40.4144C99.7225 42.5925 100.208 44.5702 101.178 46.3471C102.176 48.0953 103.534 49.4711 105.253 50.4742C107 51.4773 108.94 51.9787 111.075 51.9787Z"
        fill="currentColor"
      />
      <path
        d="M143.959 32.458C146.094 32.458 148.006 32.9453 149.697 33.9197C151.389 34.8941 152.705 36.2556 153.648 38.0038C154.618 39.752 155.103 41.7727 155.103 44.0654C155.103 46.3583 154.618 48.3931 153.648 50.17C152.705 51.9184 151.389 53.2797 149.697 54.2541C148.006 55.2285 146.094 55.7158 143.959 55.7158C142.378 55.7158 140.923 55.4004 139.592 54.7701C138.289 54.1396 137.181 53.2223 136.266 52.0186V63.7979H132.274V32.673H136.099V36.2843C136.986 35.0232 138.109 34.0773 139.468 33.447C140.826 32.7877 142.323 32.458 143.959 32.458ZM143.626 52.1047C145.04 52.1047 146.301 51.775 147.41 51.1159C148.547 50.428 149.434 49.4823 150.072 48.2786C150.737 47.0462 151.07 45.6419 151.07 44.0654C151.07 42.4891 150.737 41.0992 150.072 39.8954C149.434 38.663 148.547 37.7171 147.41 37.0581C146.301 36.3989 145.04 36.0693 143.626 36.0693C142.24 36.0693 140.979 36.4132 139.842 37.1011C138.733 37.7602 137.846 38.6917 137.181 39.8954C136.543 41.0992 136.224 42.4891 136.224 44.0654C136.224 45.6419 136.543 47.0462 137.181 48.2786C137.818 49.4823 138.705 50.428 139.842 51.1159C140.979 51.775 142.24 52.1047 143.626 52.1047Z"
        fill="currentColor"
      />
      <path
        d="M180.544 44.1945C180.544 44.5097 180.516 44.9252 180.461 45.441H162.58C162.829 47.4474 163.675 49.0667 165.116 50.2991C166.586 51.5028 168.402 52.1047 170.564 52.1047C173.198 52.1047 175.319 51.1875 176.926 49.3532L179.13 52.0186C178.132 53.2223 176.885 54.1396 175.388 54.7701C173.919 55.4004 172.269 55.7158 170.439 55.7158C168.111 55.7158 166.045 55.2285 164.243 54.2541C162.441 53.251 161.041 51.861 160.043 50.0842C159.073 48.3071 158.588 46.3009 158.588 44.0654C158.588 41.8586 159.059 39.8668 160.002 38.0899C160.972 36.3128 162.289 34.9372 163.952 33.9627C165.643 32.9597 167.542 32.458 169.649 32.458C171.756 32.458 173.627 32.9597 175.263 33.9627C176.926 34.9372 178.216 36.3128 179.13 38.0899C180.073 39.8668 180.544 41.9016 180.544 44.1945ZM169.649 35.9402C167.736 35.9402 166.128 36.5421 164.825 37.7458C163.55 38.9495 162.802 40.526 162.58 42.4748H176.719C176.497 40.5547 175.734 38.9926 174.431 37.7888C173.156 36.5564 171.562 35.9402 169.649 35.9402Z"
        fill="currentColor"
      />
      <path
        d="M197.855 32.458C200.655 32.458 202.873 33.3035 204.508 34.9945C206.172 36.6569 207.003 39.1073 207.003 42.3459V55.4578H203.011V42.8187C203.011 40.6118 202.498 38.9495 201.473 37.8319C200.447 36.714 198.978 36.1552 197.065 36.1552C194.902 36.1552 193.198 36.8144 191.95 38.1327C190.702 39.4225 190.079 41.2854 190.079 43.7215V55.4578H186.087V32.673H189.912V36.1122C190.716 34.9372 191.797 34.0345 193.156 33.4039C194.542 32.7734 196.108 32.458 197.855 32.458Z"
        fill="currentColor"
      />
      <path
        d="M241.963 55.4584L241.922 33.5334L231.401 51.8042H229.49L218.968 33.6623V55.4584H214.975V25.3652H218.385L230.528 46.5164L242.505 25.3652H245.915L245.956 55.4584H241.963Z"
        fill="currentColor"
      />
      <path
        d="M254.11 32.6719H258.103V55.4567H254.11V32.6719ZM256.108 28.287C255.332 28.287 254.679 28.029 254.153 27.5132C253.655 26.9972 253.404 26.3666 253.404 25.6215C253.404 24.8764 253.655 24.2459 254.153 23.7299C254.679 23.1854 255.332 22.9131 256.108 22.9131C256.883 22.9131 257.522 23.1711 258.021 23.6871C258.546 24.1742 258.811 24.7904 258.811 25.5355C258.811 26.3095 258.546 26.9685 258.021 27.5132C257.522 28.029 256.883 28.287 256.108 28.287Z"
        fill="currentColor"
      />
      <path
        d="M269.546 36.4991C270.237 35.1808 271.264 34.1777 272.622 33.4898C273.979 32.8021 275.63 32.458 277.571 32.458V36.4562C277.348 36.4276 277.044 36.4132 276.656 36.4132C274.492 36.4132 272.789 37.0868 271.541 38.4337C270.321 39.752 269.712 41.6436 269.712 44.1084V55.4578H265.719V32.673H269.546V36.4991Z"
        fill="currentColor"
      />
      <path
        d="M290.474 32.458C293.522 32.458 295.852 33.232 297.459 34.7796C299.095 36.3271 299.914 38.6344 299.914 41.701V55.4578H296.129V52.4485C295.464 53.509 294.508 54.3258 293.26 54.899C292.04 55.4435 290.585 55.7158 288.894 55.7158C286.426 55.7158 284.444 55.0996 282.947 53.8672C281.478 52.6348 280.743 51.0155 280.743 49.0093C280.743 47.0032 281.451 45.3982 282.863 44.1945C284.277 42.9621 286.523 42.3459 289.6 42.3459H295.922V41.5291C295.922 39.752 295.423 38.3907 294.423 37.445C293.426 36.4991 291.956 36.0263 290.016 36.0263C288.713 36.0263 287.438 36.2556 286.19 36.714C284.942 37.144 283.889 37.7315 283.029 38.4768L281.367 35.3814C282.504 34.4357 283.863 33.7191 285.441 33.232C287.022 32.716 288.699 32.458 290.474 32.458ZM289.559 52.5346C291.084 52.5346 292.4 52.1905 293.51 51.5028C294.619 50.7862 295.423 49.7831 295.922 48.4933V45.3121H289.766C286.385 45.3121 284.694 46.4872 284.694 48.8374C284.694 49.9837 285.123 50.8866 285.983 51.5457C286.843 52.2049 288.034 52.5346 289.559 52.5346Z"
        fill="currentColor"
      />
      <path
        d="M307.304 32.6719H311.296V55.4567H307.304V32.6719ZM309.299 28.287C308.523 28.287 307.872 28.029 307.345 27.5132C306.846 26.9972 306.596 26.3666 306.596 25.6215C306.596 24.8764 306.846 24.2459 307.345 23.7299C307.872 23.1854 308.523 22.9131 309.299 22.9131C310.075 22.9131 310.713 23.1711 311.212 23.6871C311.74 24.1742 312.002 24.7904 312.002 25.5355C312.002 26.3095 311.74 26.9685 311.212 27.5132C310.713 28.029 310.075 28.287 309.299 28.287Z"
        fill="currentColor"
      />
      <path
        d="M56.9578 21.8583L56.9442 21.8384L34.2918 38.2361L45.128 46.2267L60.7032 34.9524L56.9578 21.8583Z"
        fill="currentColor"
      />
      <path
        d="M44.7571 46.4885L33.9399 54.3188L33.9161 54.3344L33.898 54.3076L7.05243 34.8746L10.6813 22.1889L10.9187 21.8384L33.2939 38.0355L44.7571 46.4885Z"
        fill="currentColor"
      />
      <path
        d="M64.0283 41.437L64.0055 41.4033L34.2955 62.9098L45.1319 70.9005L67.7476 54.5294L63.9979 41.4214L64.0283 41.437Z"
        fill="currentColor"
      />
      <path
        d="M44.7676 71.1622L33.9418 78.9988L33.9328 78.9855L33.9238 78.9988L-0.00335693 54.4396L3.62551 41.7538L3.86292 41.4033L33.8548 63.114L44.7676 71.1622Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CalculatorViewportPortal({
  fullscreen,
  children,
}: {
  fullscreen: boolean
  children: ReactNode
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
    if (!portalHost) return
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
                  className="fixed inset-0 z-[2147482999] bg-black/35 backdrop-blur-[1px]"
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

function HeaderIconButton({
  label,
  children,
  onClick,
  portalTheme,
}: {
  label: string
  children: ReactNode
  onClick: () => void
  portalTheme: "light" | "dark"
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        aria-label={label}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-[30px] rounded-md"
        )}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        className={cn(
          "mirai-calculator-package mirai-calculator-portal z-[2147483002]",
          portalTheme
        )}
        data-theme={portalTheme}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** Composes enabled calculator extensions into a configurable, container-responsive panel. */
export function MiraiCalculator({
  className,
  extensions,
  mode,
  defaultMode = CalculatorExtension.SCIENTIFIC,
  onModeChange,
  angleMode,
  defaultAngleMode = "degrees",
  onAngleModeChange,
  theme,
  defaultTheme = "light",
  onThemeChange,
  hidden,
  defaultHidden = false,
  onHiddenChange,
  startFullscreen = false,
  title = "Calculator",
  onClose,
  defaultDefinitions = EMPTY_CALCULATOR_DEFINITIONS,
  defaultGraphingData,
  defaultStatisticsData,
  defaultToolsData,
}: MiraiCalculatorProps) {
  const [internalMode, setInternalMode] = useState(defaultMode)
  const [internalAngleMode, setInternalAngleMode] = useState(defaultAngleMode)
  const [internalTheme, setInternalTheme] = useState(defaultTheme)
  const [internalHidden, setInternalHidden] = useState(defaultHidden)
  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    getServerSystemThemeSnapshot
  )
  const [fullscreen, setFullscreen] = useState(startFullscreen)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [displaySettings, setDisplaySettings] = useState<CalculatorDisplaySettings>(() => ({
    ...DEFAULT_DISPLAY_SETTINGS,
  }))
  const [graphView, setGraphView] = useState<GraphView>(() => ({ ...DEFAULT_GRAPH_VIEW }))
  const [graphGridVisible, setGraphGridVisible] = useState(true)
  const [definitions, setDefinitions] = useState(() => [...defaultDefinitions])
  const [variables, setVariables] = useState<Record<string, number>>(() =>
    collectSliderVariables(
      (defaultGraphingData?.expressions ?? []).map((expression) => ({
        expression: expression.value,
        value: expression.slider?.value,
      }))
    )
  )
  const [ans, setAns] = useState(0)
  const [resetSignal, setResetSignal] = useState(0)
  const calculatorRef = useRef<HTMLDivElement>(null)

  const enabledExtensions = useMemo(() => normalizeCalculatorExtensions(extensions), [extensions])
  const requestedMode = mode ?? internalMode
  const activeMode = enabledExtensions.includes(requestedMode)
    ? requestedMode
    : enabledExtensions[0]
  const activeAngleMode = angleMode ?? internalAngleMode
  const activeTheme = theme ?? internalTheme
  const activeHidden = hidden ?? internalHidden
  const resolvedTheme = activeTheme === "system" ? (systemDark ? "dark" : "light") : activeTheme
  const showsAngleMode = enabledExtensions.some(
    (extension) => EXTENSION_DEFINITIONS[extension].usesAngleMode
  )
  const showsGraphSettings = enabledExtensions.some(
    (extension) => EXTENSION_DEFINITIONS[extension].hasGraphSettings
  )

  useEffect(() => {
    if (!fullscreen) return
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = previousOverflow
    }
  }, [fullscreen])

  const setMode = (nextMode: CalculatorMode) => {
    if (mode === undefined) setInternalMode(nextMode)
    onModeChange?.(nextMode)
  }

  const setAngleMode = (nextMode: AngleMode) => {
    if (angleMode === undefined) setInternalAngleMode(nextMode)
    onAngleModeChange?.(nextMode)
  }

  const setTheme = (nextTheme: CalculatorTheme) => {
    if (theme === undefined) setInternalTheme(nextTheme)
    onThemeChange?.(nextTheme)
  }

  const setHidden = (nextHidden: boolean) => {
    if (hidden === undefined) setInternalHidden(nextHidden)
    onHiddenChange?.(nextHidden)
    if (nextHidden) {
      setFullscreen(false)
      setSettingsOpen(false)
    }
  }

  const formatOptions = useMemo<NumberFormatOptions>(
    () => calculatorNumberFormatOptions(displaySettings),
    [displaySettings]
  )

  const engine = useMemo(
    () =>
      new CalculatorEngine({
        angleMode: activeAngleMode,
        ans,
        definitions,
        variables,
      }),
    [activeAngleMode, ans, definitions, variables]
  )

  const formatNumber = useCallback(
    (value: number) => engine.format(value, formatOptions),
    [engine, formatOptions]
  )

  const reset = () => {
    setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS })
    setGraphView({ ...DEFAULT_GRAPH_VIEW })
    setGraphGridVisible(true)
    setDefinitions([...defaultDefinitions])
    setVariables({})
    setAns(0)
    setResetSignal((signal) => signal + 1)
  }

  const updateGraphBoundary = (key: keyof GraphView, source: string) => {
    const value = Number(source)
    if (!Number.isFinite(value)) return
    setGraphView((current) => {
      const next = { ...current, [key]: value }
      if (next.xmin >= next.xmax || next.ymin >= next.ymax) return current
      return next
    })
  }

  return (
    <TooltipProvider>
      <div className="mirai-calculator-package" style={{ display: "contents" }}>
        <div className="relative isolate h-full min-h-0 w-full">
          {activeHidden && (
            <Tooltip>
              <TooltipTrigger
                type="button"
                aria-label="Show calculator"
                onClick={() => setHidden(false)}
                className={cn(
                  buttonVariants({ variant: "default", size: "icon" }),
                  "mirai-calculator size-12 rounded-xl shadow-xl",
                  resolvedTheme
                )}
                data-calculator-hidden-launcher=""
                data-theme={resolvedTheme}
              >
                <CalculatorIcon className="size-5" />
              </TooltipTrigger>
              <TooltipContent
                className={cn(
                  "mirai-calculator-package mirai-calculator-portal z-[2147483002]",
                  resolvedTheme
                )}
                data-theme={resolvedTheme}
              >
                Show calculator
              </TooltipContent>
            </Tooltip>
          )}
          <CalculatorViewportPortal fullscreen={fullscreen}>
            <div
              ref={calculatorRef}
              hidden={activeHidden}
              className={cn(
                "mirai-calculator @container relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border bg-background text-[15px] text-foreground tabular-nums shadow-xl [&_canvas]:block",
                resolvedTheme,
                fullscreen &&
                  "fixed inset-3 z-[2147483000] h-[calc(100dvh-1.5rem)] min-h-0 w-auto max-w-none rounded-xl",
                className
              )}
              data-theme={resolvedTheme}
            >
              <header
                data-calculator-drag-handle=""
                className="mirai-calculator-header flex min-h-[52px] shrink-0 touch-none flex-nowrap items-center gap-3 overflow-hidden border-b bg-card px-3 py-2 select-none @max-[699px]:gap-1"
              >
                <span className="sr-only">{title}</span>
                <span
                  aria-hidden="true"
                  className="grid shrink-0 grid-cols-2 gap-[3px] p-0.5 @max-[359px]:hidden"
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <span key={index} className="size-[3px] rounded-full bg-muted-foreground/35" />
                  ))}
                </span>
                <div className="mirai-header-brand flex shrink-0 items-center gap-2 @max-[359px]:max-w-5 @max-[359px]:overflow-hidden @max-[359px]:[&>svg]:h-5 @max-[359px]:[&>svg]:w-[79px] @max-[359px]:[&>svg]:max-w-none">
                  <OpenMiraiLogo />
                </div>

                {enabledExtensions.length === 1 && (
                  <span
                    data-calculator-mode-label
                    className="flex h-8 min-w-0 shrink-0 items-center text-sm font-medium"
                  >
                    {EXTENSION_DEFINITIONS[enabledExtensions[0]].label}
                  </span>
                )}

                {enabledExtensions.length > 1 && (
                  <>
                    <div className="mirai-mode-select hidden min-w-0 flex-1 @max-[699px]:block">
                      <Select
                        value={activeMode}
                        onValueChange={(value: string | null) => {
                          if (
                            value !== null &&
                            enabledExtensions.includes(value as CalculatorExtension)
                          ) {
                            setMode(value as CalculatorExtension)
                          }
                        }}
                      >
                        <SelectTrigger
                          aria-label="Calculator mode"
                          size="sm"
                          className="h-8 w-full min-w-0 rounded-lg border-transparent bg-muted shadow-none"
                        >
                          <SelectValue>{EXTENSION_DEFINITIONS[activeMode].label}</SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          className={cn(
                            "mirai-calculator-package mirai-calculator-portal z-[2147483002]",
                            resolvedTheme
                          )}
                          data-theme={resolvedTheme}
                        >
                          {enabledExtensions.map((extension) => (
                            <SelectItem key={extension} value={extension}>
                              {EXTENSION_DEFINITIONS[extension].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <nav
                      aria-label="Calculator modes"
                      className="mirai-mode-switcher relative grid min-w-0 max-w-full flex-[1_1_364px] gap-0.5 overflow-hidden rounded-lg bg-muted p-[3px] @max-[699px]:hidden"
                      style={{
                        gridTemplateColumns: `repeat(${enabledExtensions.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {enabledExtensions.map((extension) => (
                        <Button
                          key={extension}
                          aria-label={EXTENSION_DEFINITIONS[extension].label}
                          variant="ghost"
                          size="sm"
                          onClick={() => setMode(extension)}
                          aria-current={activeMode === extension ? "page" : undefined}
                          data-active={activeMode === extension ? "" : undefined}
                          className="h-7 min-w-0 w-full rounded-md bg-transparent px-1 text-[13px] font-medium shadow-none transition-[background-color,box-shadow,color] hover:!bg-foreground/[0.08] hover:!text-foreground focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none data-active:bg-background data-active:text-foreground data-active:shadow-sm data-active:hover:!bg-background"
                        >
                          <span
                            aria-hidden="true"
                            className="mirai-mode-label @max-[699px]:text-[11px]"
                            data-compact-label={EXTENSION_DEFINITIONS[extension].compactLabel}
                          >
                            {EXTENSION_DEFINITIONS[extension].label}
                          </span>
                        </Button>
                      ))}
                    </nav>
                  </>
                )}

                <div className="mirai-header-actions ml-auto flex shrink-0 items-center gap-2 @max-[699px]:gap-1">
                  <HeaderIconButton
                    label={`Use ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    portalTheme={resolvedTheme}
                  >
                    {resolvedTheme === "dark" ? <Sun /> : <Moon />}
                  </HeaderIconButton>
                  <Button
                    type="button"
                    aria-label="Calculator settings"
                    variant="outline"
                    size="icon"
                    onClick={() => setSettingsOpen(true)}
                    className={cn(
                      "size-[30px] rounded-md",
                      settingsOpen && "bg-muted text-foreground"
                    )}
                  >
                    <Settings2 />
                  </Button>
                  {settingsOpen && calculatorRef.current
                    ? createPortal(
                        <div
                          className="absolute inset-0 z-[60] flex items-center justify-center overflow-hidden rounded-[inherit] bg-black/25 p-3 backdrop-blur-[7px]"
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setSettingsOpen(false)
                          }}
                          onPointerDown={(event) => {
                            if (event.target === event.currentTarget) setSettingsOpen(false)
                          }}
                        >
                          <section
                            role="dialog"
                            aria-modal="true"
                            aria-label="Calculator settings"
                            tabIndex={-1}
                            className={cn(
                              "mirai-calculator-package mirai-calculator-portal mirai-calculator-settings-dialog relative grid min-h-0 max-h-[calc(100%_-_1.5rem)] w-[calc(100%_-_1.5rem)] max-w-[640px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-xl border bg-popover p-0 shadow-2xl ring-1 ring-foreground/10",
                              resolvedTheme
                            )}
                            data-theme={resolvedTheme}
                          >
                            <Button
                              type="button"
                              aria-label="Close calculator settings"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setSettingsOpen(false)}
                              className="absolute top-2 right-2 z-10"
                            >
                              <X />
                            </Button>
                            <div className="border-b bg-muted/20 px-5 py-4 pr-12">
                              <div className="flex items-center gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs">
                                  <Settings2 className="size-4" />
                                </span>
                                <div className="min-w-0">
                                  <h2 className="text-sm font-semibold">Calculator settings</h2>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Format results and tune the active workspace.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div
                              data-calculator-settings-body=""
                              className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-5 sm:grid-cols-2"
                            >
                              <section
                                aria-labelledby="mirai-number-format-heading"
                                className="rounded-lg border bg-background/60 p-4"
                              >
                                <h3
                                  id="mirai-number-format-heading"
                                  className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                                >
                                  Number format
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                  {showsAngleMode && (
                                    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                                      Angle mode
                                      <Select
                                        value={activeAngleMode}
                                        onValueChange={(value: string | null) => {
                                          if (value === "degrees" || value === "radians")
                                            setAngleMode(value)
                                        }}
                                      >
                                        <SelectTrigger
                                          size="sm"
                                          className="w-full bg-background"
                                          aria-label="Angle mode"
                                        >
                                          <SelectValue>
                                            {ANGLE_MODE_LABELS[activeAngleMode]}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent
                                          className={cn(
                                            "mirai-calculator-package mirai-calculator-portal z-[2147483002]",
                                            resolvedTheme
                                          )}
                                          data-theme={resolvedTheme}
                                        >
                                          <SelectItem value="degrees">Degrees</SelectItem>
                                          <SelectItem value="radians">Radians</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </label>
                                  )}

                                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                                    Notation
                                    <Select
                                      value={displaySettings.notation}
                                      onValueChange={(value: string | null) => {
                                        if (value !== "auto" && value !== "scientific") return
                                        setDisplaySettings((current) => ({
                                          ...current,
                                          notation: value,
                                        }))
                                      }}
                                    >
                                      <SelectTrigger size="sm" className="w-full bg-background">
                                        <SelectValue>
                                          {NOTATION_LABELS[displaySettings.notation]}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent
                                        className={cn(
                                          "mirai-calculator-package mirai-calculator-portal z-[2147483002]",
                                          resolvedTheme
                                        )}
                                        data-theme={resolvedTheme}
                                      >
                                        <SelectItem value="auto">Automatic</SelectItem>
                                        <SelectItem value="scientific">Scientific</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </label>

                                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                                    Decimals
                                    <Select
                                      value={String(displaySettings.decimals)}
                                      onValueChange={(value) => {
                                        if (value === null) return
                                        setDisplaySettings((current) => ({
                                          ...current,
                                          decimals: value === "auto" ? "auto" : Number(value),
                                        }))
                                      }}
                                    >
                                      <SelectTrigger size="sm" className="w-full bg-background">
                                        <SelectValue>
                                          {displaySettings.decimals === "auto"
                                            ? "Auto"
                                            : String(displaySettings.decimals)}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent
                                        className={cn(
                                          "mirai-calculator-package mirai-calculator-portal z-[2147483002]",
                                          resolvedTheme
                                        )}
                                        data-theme={resolvedTheme}
                                      >
                                        <SelectItem value="auto">Auto</SelectItem>
                                        {DECIMAL_OPTIONS.map((value) => (
                                          <SelectItem key={value} value={String(value)}>
                                            {value}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </label>

                                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                                    Significant figures
                                    <Input
                                      type="number"
                                      min={1}
                                      max={15}
                                      value={displaySettings.significantFigures}
                                      onChange={(event) =>
                                        setDisplaySettings((current) => ({
                                          ...current,
                                          significantFigures: Math.max(
                                            1,
                                            Math.min(15, Number(event.target.value) || 1)
                                          ),
                                        }))
                                      }
                                      className="h-7 w-full bg-background"
                                    />
                                  </label>
                                </div>

                                <label className="mt-3 flex items-center justify-between gap-4 rounded-md border bg-muted/25 px-3 py-2.5 text-sm">
                                  <span>
                                    <strong className="block text-xs font-medium">
                                      Thousands separators
                                    </strong>
                                    <small className="text-[11px] text-muted-foreground">
                                      Group large values for readability.
                                    </small>
                                  </span>
                                  <Switch
                                    checked={displaySettings.thousandsSeparator}
                                    onCheckedChange={(checked) =>
                                      setDisplaySettings((current) => ({
                                        ...current,
                                        thousandsSeparator: checked,
                                      }))
                                    }
                                  />
                                </label>
                              </section>

                              {showsGraphSettings && (
                                <section
                                  aria-labelledby="mirai-graph-viewport-heading"
                                  className="rounded-lg border bg-background/60 p-4"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <h3
                                      id="mirai-graph-viewport-heading"
                                      className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                                    >
                                      Graph viewport
                                    </h3>
                                    <label className="flex items-center gap-2 text-xs">
                                      Grid lines
                                      <Switch
                                        checked={graphGridVisible}
                                        onCheckedChange={setGraphGridVisible}
                                      />
                                    </label>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    {GRAPH_BOUNDARY_KEYS.map((key) => (
                                      <label
                                        key={key}
                                        className="grid gap-1.5 text-xs font-medium text-muted-foreground"
                                      >
                                        {key.replace("min", " min").replace("max", " max")}
                                        <Input
                                          type="number"
                                          value={graphView[key]}
                                          onChange={(event) =>
                                            updateGraphBoundary(key, event.target.value)
                                          }
                                          className="h-7 w-full bg-background font-mono"
                                        />
                                      </label>
                                    ))}
                                  </div>
                                </section>
                              )}

                              <section
                                aria-labelledby="mirai-appearance-heading"
                                className="rounded-lg border bg-background/60 p-4"
                              >
                                <h3
                                  id="mirai-appearance-heading"
                                  className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                                >
                                  Appearance
                                </h3>
                                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                                  Theme
                                  <Select
                                    value={activeTheme}
                                    onValueChange={(value: string | null) => {
                                      if (
                                        value === "light" ||
                                        value === "dark" ||
                                        value === "system"
                                      ) {
                                        setTheme(value)
                                      }
                                    }}
                                  >
                                    <SelectTrigger size="sm" className="w-full bg-background">
                                      <SelectValue>{THEME_LABELS[activeTheme]}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent
                                      className={cn(
                                        "mirai-calculator-package mirai-calculator-portal z-[2147483002]",
                                        resolvedTheme
                                      )}
                                      data-theme={resolvedTheme}
                                    >
                                      <SelectItem value="light">Light</SelectItem>
                                      <SelectItem value="dark">Dark</SelectItem>
                                      <SelectItem value="system">System</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </label>
                              </section>
                            </div>
                            <div className="flex justify-end border-t bg-muted/20 px-5 py-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSettingsOpen(false)}
                              >
                                Done
                              </Button>
                            </div>
                          </section>
                        </div>,
                        calculatorRef.current
                      )
                    : null}
                  <HeaderIconButton
                    label="Hide calculator"
                    onClick={() => setHidden(true)}
                    portalTheme={resolvedTheme}
                  >
                    <EyeOff />
                  </HeaderIconButton>
                  <Button
                    aria-label="Reset"
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    className="mirai-header-reset h-[30px] min-w-[30px] rounded-md px-2.5 text-xs text-muted-foreground @max-[699px]:w-[30px] @max-[699px]:px-0"
                  >
                    <RotateCcw
                      aria-hidden="true"
                      className="mirai-header-reset-icon hidden size-4 @max-[699px]:block"
                    />
                    <span className="mirai-header-reset-label @max-[699px]:hidden">Reset</span>
                  </Button>
                  <HeaderIconButton
                    label={fullscreen ? "Exit full screen" : "Enter full screen"}
                    onClick={() => setFullscreen((value) => !value)}
                    portalTheme={resolvedTheme}
                  >
                    {fullscreen ? <Minimize2 /> : <Expand />}
                  </HeaderIconButton>
                  {onClose && (
                    <HeaderIconButton
                      label="Close calculator"
                      onClick={onClose}
                      portalTheme={resolvedTheme}
                    >
                      <X />
                    </HeaderIconButton>
                  )}
                </div>
              </header>

              <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {activeMode ? (
                  EXTENSION_DEFINITIONS[activeMode].render({
                    resetSignal,
                    engine,
                    activeAngleMode,
                    ans,
                    definitions,
                    setDefinitions,
                    setAns,
                    formatOptions,
                    formatNumber,
                    setVariables,
                    graphView,
                    setGraphView,
                    graphGridVisible,
                    setGraphGridVisible,
                    resolvedTheme,
                    defaultGraphingData,
                    defaultStatisticsData,
                    defaultToolsData,
                  })
                ) : (
                  <div
                    role="status"
                    className="flex min-h-48 flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground"
                  >
                    No calculator extensions enabled
                  </div>
                )}
              </main>
            </div>
          </CalculatorViewportPortal>
        </div>
      </div>
    </TooltipProvider>
  )
}
