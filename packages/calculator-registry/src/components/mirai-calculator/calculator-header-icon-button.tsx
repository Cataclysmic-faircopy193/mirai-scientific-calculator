import { buttonVariants } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/** Renders a compact calculator header control with a themed tooltip. */
export function CalculatorHeaderIconButton({
  label,
  children,
  onClick,
  portalTheme,
}: {
  label: string
  children: React.ReactNode
  onClick: () => void
  portalTheme: "light" | "dark"
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        aria-label={label}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-7.5 rounded-md")}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        className={cn("mirai-calculator-package mirai-calculator-portal z-2147483002", portalTheme)}
        data-theme={portalTheme}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
