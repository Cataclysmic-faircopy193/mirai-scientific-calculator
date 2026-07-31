import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Braces, CheckCircle2, Sparkles } from "lucide-react"

import {
  CalculatorExtension,
  MiraiCalculator,
  type CalculatorExtension as CalculatorExtensionValue,
} from "@/components/mirai-calculator/mirai-calculator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AGENT_PROMPT, INSTALL_COMMAND } from "@/site/constants/docs"
import { HERO_EQUATIONS, OWNERSHIP_POINTS } from "@/site/constants/home"
import { DEFAULT_PLAYGROUND_SEARCH } from "@/site/constants/playground"
import { SITE_DOMAIN } from "@/site/constants/site"
import { CopyButton } from "@/site/copy-button"
import { ExtensionVisual } from "@/site/extension-visual"
import { EXTENSIONS } from "@/site/site-data"

const DEFAULT_ACTIVE_EXTENSION = CalculatorExtension.SCIENTIFIC

export function HomePage() {
  const [activeExtension, setActiveExtension] =
    useState<CalculatorExtensionValue>(DEFAULT_ACTIVE_EXTENSION)

  const activeDetail = useMemo(
    () => EXTENSIONS.find((extension) => extension.id === activeExtension) ?? EXTENSIONS[0],
    [activeExtension]
  )

  return (
    <>
      <section className="relative isolate overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_45%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_45%,transparent)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-16 px-5 py-24 md:px-8 lg:grid-cols-[1.06fr_0.94fr] lg:px-10">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Badge
              variant="outline"
              className="mb-7 gap-2 border-cyan-500/25 bg-cyan-500/5 px-3 py-1 font-mono uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300"
            >
              <Sparkles className="size-3.5" />
              Own the interface. Keep the math.
            </Badge>
            <h1 className="max-w-3xl text-5xl leading-[0.96] font-semibold tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
              A scientific calculator{" "}
              <span className="text-cyan-700 dark:text-cyan-300">built to be extended.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
              One editable shadcn component with Scientific, Graphing, Statistics, and Math Tools
              built in. Enable exactly what your product needs and keep the source.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button
                size="lg"
                nativeButton={false}
                className="h-11 bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
                render={<Link to="/playground" search={DEFAULT_PLAYGROUND_SEARCH} />}
              >
                Open playground <ArrowRight />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                className="h-11 px-5"
                render={<Link to="/docs/installation" />}
              >
                Read the docs
              </Button>
            </div>
            <div className="mt-9 flex max-w-2xl items-center gap-3 rounded-xl border bg-card/80 p-2 pl-4 shadow-sm backdrop-blur">
              <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs sm:text-sm">
                {INSTALL_COMMAND}
              </code>
              <CopyButton value={INSTALL_COMMAND} label="Copy" />
            </div>
            <Button
              variant="ghost"
              className="mt-3 text-muted-foreground"
              onClick={() => navigator.clipboard.writeText(AGENT_PROMPT)}
            >
              <Braces />
              Building with an agent? Copy the prompt
            </Button>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[520px] animate-in fade-in zoom-in-95 duration-1000">
            <div className="absolute inset-[8%] rounded-full border border-dashed border-cyan-500/30" />
            <div className="absolute inset-[22%] rounded-full border border-slate-400/25" />
            <div className="absolute inset-[35%] rounded-full border border-cyan-500/35 bg-background/75 shadow-[0_0_90px_rgba(6,182,212,0.18)] backdrop-blur" />
            <div className="absolute inset-[35%] grid place-items-center text-center">
              <div>
                <strong className="block text-7xl font-medium tracking-[-0.08em]">4</strong>
                <span className="font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  extensions
                </span>
              </div>
            </div>
            {HERO_EQUATIONS.map((equation) => (
              <code
                key={equation.value}
                className={`absolute rounded-lg border bg-background/90 px-3 py-2 font-mono text-xs shadow-lg backdrop-blur ${equation.className}`}
              >
                {equation.value}
              </code>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8 lg:px-10">
        <div className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <Badge variant="secondary" className="font-mono uppercase tracking-[0.16em]">
              Live component
            </Badge>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em]">
              Choose the instrument.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground lg:justify-self-end">
            {activeDetail.summary}
          </p>
        </div>

        <div
          className="mt-10 grid gap-2 rounded-xl border bg-muted/35 p-2 sm:grid-cols-2 lg:grid-cols-4"
          role="tablist"
          aria-label="Calculator extension"
        >
          {EXTENSIONS.map((extension) => (
            <Button
              key={extension.id}
              type="button"
              role="tab"
              variant={activeExtension === extension.id ? "default" : "ghost"}
              aria-selected={activeExtension === extension.id}
              onClick={() => setActiveExtension(extension.id)}
              className="h-11 justify-start px-4"
            >
              <extension.icon />
              {extension.label}
            </Button>
          ))}
        </div>

        <Card className="mt-6 gap-0 overflow-hidden border-slate-800 bg-slate-950 py-0 shadow-2xl shadow-cyan-950/10">
          <div className="flex h-11 items-center gap-2 border-b border-white/10 px-4 text-slate-400">
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-amber-300/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
            <code className="mx-auto font-mono text-[11px]">{SITE_DOMAIN}/playground</code>
            <Badge className="bg-cyan-300 text-[9px] text-slate-950">LIVE</Badge>
          </div>
          <CardContent className="bg-slate-900/70 p-3 sm:p-6">
            <MiraiCalculator
              extensions={[activeExtension]}
              mode={activeExtension}
              onModeChange={setActiveExtension}
              height={650}
              defaultTheme="system"
              title={`${activeDetail.label} calculator preview`}
            />
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary" className="font-mono uppercase tracking-[0.16em]">
              Built-in extensions
            </Badge>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.04em]">
              Four focused workspaces. One component.
            </h2>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link to="/extensions" />}>
            Explore all <ArrowRight />
          </Button>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {EXTENSIONS.map((extension, index) => (
            <Card
              key={extension.id}
              className="group border-border/80 bg-card transition-transform duration-300 hover:-translate-y-1"
            >
              <CardHeader>
                <div className="mb-7 grid size-11 place-items-center rounded-lg bg-slate-950 text-cyan-300 dark:bg-cyan-300 dark:text-slate-950">
                  <extension.icon className="size-5" />
                </div>
                <CardAction className="font-mono text-xs text-muted-foreground">
                  0{index + 1}
                </CardAction>
                <CardDescription className="font-mono text-xs uppercase tracking-[0.16em]">
                  {extension.eyebrow}
                </CardDescription>
                <CardTitle className="text-2xl tracking-[-0.03em]">{extension.label}</CardTitle>
                <CardDescription className="max-w-xl leading-6">
                  {extension.summary}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExtensionVisual extension={extension.id} />
                <Button
                  variant="link"
                  nativeButton={false}
                  className="mt-3 px-0"
                  render={<Link to="/extensions/$id" params={{ id: extension.id }} />}
                >
                  View extension <ArrowRight />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-slate-950 text-slate-100">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 md:px-8 lg:grid-cols-2 lg:px-10">
          <div>
            <Badge className="bg-cyan-300 text-slate-950">The shadcn model</Badge>
            <h2 className="mt-6 max-w-xl text-4xl leading-tight font-semibold tracking-[-0.04em]">
              Source you can change. A core you do not have to maintain.
            </h2>
          </div>
          <div className="grid content-start gap-4">
            {OWNERSHIP_POINTS.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm text-slate-300"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
