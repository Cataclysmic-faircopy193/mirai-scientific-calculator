import { useEffect, useState } from "react"
import { Link, Outlet, useRouterState } from "@tanstack/react-router"
import { Menu, Moon, Search, Sun } from "lucide-react"
import { siGithub } from "simple-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  FOOTER_NAVIGATION,
  GITHUB_URL,
  MOBILE_NAVIGATION,
  PAGE_TITLES,
  PRIMARY_NAVIGATION,
  SITE_NAME,
} from "@/site/constants/site"
import { CommandPalette } from "@/site/command-palette"
import { SimpleIconMark } from "@/site/simple-icon"
import { SiteProvider } from "@/site/site-provider"
import { useSite } from "@/site/use-site"

function titleForPath(pathname: string) {
  const title = PAGE_TITLES[pathname]
  return title ? `${title} · ${SITE_NAME}` : SITE_NAME
}

function ShellContent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { theme, toggleTheme } = useSite()
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    document.title = titleForPath(pathname)
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 md:px-8 lg:px-10">
          <Link to="/" className="flex items-center gap-2.5" aria-label="OpenMirai Calculator home">
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-md border bg-foreground text-background shadow-sm"
            >
              <span className="size-2.5 rotate-45 border-2 border-current" />
            </span>
            <span className="font-medium tracking-[-0.02em]">
              OpenMirai <span className="text-muted-foreground">Calculator</span>
            </span>
            <Badge variant="secondary" className="font-mono text-[9px]">
              v0.2
            </Badge>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {PRIMARY_NAVIGATION.map((item) => (
              <Button
                key={item.to}
                variant="ghost"
                nativeButton={false}
                render={
                  <Link to={item.to} activeProps={{ className: "bg-muted text-foreground" }} />
                }
              >
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              className="hidden w-56 justify-start text-muted-foreground lg:flex"
              onClick={() => setCommandOpen(true)}
              aria-label="Search extensions and documentation"
            >
              <Search />
              <span>Search...</span>
              <kbd className="ml-auto rounded border bg-muted px-1.5 font-mono text-[9px]">⌘K</kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              nativeButton={false}
              render={
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open GitHub repository"
                />
              }
            >
              <SimpleIconMark icon={siGithub} decorative className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                className="md:hidden"
                render={
                  <Button type="button" size="icon" variant="ghost" aria-label="Open navigation" />
                }
              >
                <Menu />
              </SheetTrigger>
              <SheetContent className="w-[88vw]">
                <SheetHeader className="border-b">
                  <SheetTitle>{SITE_NAME}</SheetTitle>
                  <SheetDescription>Explore the component and its headless core.</SheetDescription>
                </SheetHeader>
                <nav className="grid gap-1 px-3" aria-label="Mobile navigation">
                  {MOBILE_NAVIGATION.map((item) => (
                    <Button
                      key={item.to}
                      variant="ghost"
                      nativeButton={false}
                      className="h-11 justify-start"
                      render={<Link to={item.to} onClick={() => setMobileOpen(false)} />}
                    >
                      {item.label}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 md:flex-row md:items-end md:justify-between md:px-8 lg:px-10">
          <div>
            <Link to="/" className="font-medium">
              {SITE_NAME}
            </Link>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Editable calculator UI. Dependency-free mathematical core.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {FOOTER_NAVIGATION.map((item) => (
              <Link key={item.to} to={item.to} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <a href="/llms.txt" className="transition-colors hover:text-foreground">
              llms.txt
            </a>
          </div>
        </div>
      </footer>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}

export function SiteShell() {
  return (
    <SiteProvider>
      <TooltipProvider>
        <ShellContent />
      </TooltipProvider>
    </SiteProvider>
  )
}
