import { useEffect, useEffectEvent, useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { COMMAND_MENU_GROUPS } from "@/site/constants/site"
import { SITE_ROUTES } from "@/site/site-data"

/** Provides searchable keyboard navigation across showcase pages and extensions. */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [query, setQuery] = useState("")
  const toggleOpen = useEffectEvent(() => onOpenChange(!open))

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        toggleOpen()
      }
    }
    window.addEventListener("keydown", handleKeyboard)
    return () => window.removeEventListener("keydown", handleKeyboard)
  }, [])

  const filteredRoutes = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return SITE_ROUTES
    }
    return SITE_ROUTES.filter((route) =>
      `${route.label} ${route.section} ${route.keywords}`.toLowerCase().includes(normalized)
    )
  }, [query])

  const setOpen = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setQuery("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[12vh] max-h-[76vh] max-w-2xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search OpenMirai Calculator</DialogTitle>
          <DialogDescription>Navigate calculator extensions and documentation.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search extensions and documentation..."
            aria-label="Search extensions and documentation"
            className="h-14 border-0 px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            ESC
          </kbd>
        </div>
        <Separator />
        <ScrollArea className="max-h-[58vh]">
          <div className="p-3">
            {filteredRoutes.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                No matching pages.
              </p>
            ) : (
              COMMAND_MENU_GROUPS.map((group, groupIndex) => {
                const routes = filteredRoutes.filter((route) => route.section === group)
                if (routes.length === 0) {
                  return null
                }
                return (
                  <section key={group} aria-labelledby={`command-${group}`} className="py-2">
                    {groupIndex > 0 && <Separator className="mb-4" />}
                    <h2
                      id={`command-${group}`}
                      className="px-3 pb-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {group}
                    </h2>
                    <div className="grid gap-1">
                      {routes.map((route) => (
                        <Button
                          key={route.path}
                          variant="ghost"
                          nativeButton={false}
                          className="h-10 justify-between px-3"
                          render={<Link to={route.path} onClick={() => setOpen(false)} />}
                        >
                          <span>{route.label}</span>
                          <ArrowRight className="text-muted-foreground" />
                        </Button>
                      ))}
                    </div>
                  </section>
                )
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
