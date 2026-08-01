import { ScientificKeyLabel } from "@/components/mirai-calculator/modes/scientific-key-label"
import {
  SCIENTIFIC_KEY_SETS,
  getScientificKeyLabelSize,
} from "@/components/mirai-calculator/modes/scientific-keypad-config"
import type {
  ScientificKeyDefinition,
  ScientificKeypadTab,
} from "@/components/mirai-calculator/modes/scientific-keypad-config"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ScientificKeypadProps {
  tab: ScientificKeypadTab
  onTabChange: (tab: ScientificKeypadTab) => void
  onPressKey: (key: ScientificKeyDefinition) => void
}

/** Renders the scientific keypad tabs and their calculator keys. */
export function ScientificKeypad({ tab, onTabChange, onPressKey }: ScientificKeypadProps) {
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        switch (value) {
          case "basic":
          case "functions":
          case "trig":
          case "stats":
          case "variables":
            onTabChange(value)
            break
        }
      }}
      className="min-h-0 flex-1 gap-0"
    >
      <TabsList
        variant="line"
        className="mirai-keypad-tabs-list h-10! w-full flex-none justify-start gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-px-4 rounded-none border-y bg-muted/45 px-4 py-0"
      >
        <TabsTrigger
          className="mirai-keypad-tab h-10 flex-none rounded-none bg-transparent! px-3 text-sm font-semibold text-muted-foreground shadow-none! hover:bg-transparent! data-active:bg-transparent! data-active:text-primary after:right-0 after:-bottom-px! after:left-0 after:h-0.5! after:bg-primary!"
          value="basic"
        >
          Basic
        </TabsTrigger>
        <TabsTrigger
          className="mirai-keypad-tab h-10 flex-none rounded-none bg-transparent! px-3 text-sm font-semibold text-muted-foreground shadow-none! hover:bg-transparent! data-active:bg-transparent! data-active:text-primary after:right-0 after:-bottom-px! after:left-0 after:h-0.5! after:bg-primary!"
          value="functions"
        >
          Functions
        </TabsTrigger>
        <TabsTrigger
          className="mirai-keypad-tab h-10 flex-none rounded-none bg-transparent! px-3 text-sm font-semibold text-muted-foreground shadow-none! hover:bg-transparent! data-active:bg-transparent! data-active:text-primary after:right-0 after:-bottom-px! after:left-0 after:h-0.5! after:bg-primary!"
          value="trig"
        >
          Trig
        </TabsTrigger>
        <TabsTrigger
          className="mirai-keypad-tab h-10 flex-none rounded-none bg-transparent! px-3 text-sm font-semibold text-muted-foreground shadow-none! hover:bg-transparent! data-active:bg-transparent! data-active:text-primary after:right-0 after:-bottom-px! after:left-0 after:h-0.5! after:bg-primary!"
          value="stats"
        >
          Stats
        </TabsTrigger>
        <TabsTrigger
          className="mirai-keypad-tab h-10 flex-none rounded-none bg-transparent! px-3 text-sm font-semibold text-muted-foreground shadow-none! hover:bg-transparent! data-active:bg-transparent! data-active:text-primary after:right-0 after:-bottom-px! after:left-0 after:h-0.5! after:bg-primary!"
          value="variables"
        >
          Variables
        </TabsTrigger>
      </TabsList>
      <div className="grid min-h-61.5 flex-1 grid-cols-6 auto-rows-fr gap-2 p-4">
        {SCIENTIFIC_KEY_SETS[tab].map((key) => {
          const Icon = key.icon
          return (
            <Button
              key={key.ariaLabel ?? key.label}
              variant={key.tone === "primary" ? "default" : "outline"}
              onClick={() => onPressKey(key)}
              aria-label={key.ariaLabel ?? key.label}
              data-key-label-size={key.icon ? "single" : getScientificKeyLabelSize(key.label)}
              className={cn(
                "mirai-scientific-key h-auto min-h-11 min-w-0 overflow-hidden rounded-[6px] px-[clamp(0.125rem,1cqi,0.75rem)] font-sans text-sm leading-tight font-medium whitespace-nowrap data-[key-label-size=single]:text-lg data-[key-label-size=short]:text-base data-[key-label-size=medium]:text-sm data-[key-label-size=long]:px-px data-[key-label-size=long]:text-xs",
                key.tone === "operator" &&
                  "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10",
                key.span === 2 && "col-span-2"
              )}
            >
              {Icon ? <Icon aria-hidden="true" /> : <ScientificKeyLabel definition={key} />}
            </Button>
          )
        })}
      </div>
    </Tabs>
  )
}
