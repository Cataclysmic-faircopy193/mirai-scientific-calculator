import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight, PackageOpen } from "lucide-react"

import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CodeBlock } from "@/site/code-block"
import { INSTALL_COMMAND } from "@/site/constants/docs"
import { DISTRIBUTION_LAYERS } from "@/site/constants/home"
import { DEFAULT_PLAYGROUND_SEARCH } from "@/site/constants/playground"
import { SITE_DESCRIPTION } from "@/site/constants/site"
import { EXTENSIONS } from "@/site/site-data"
import { CalculatorExtension } from "@openmirai/calculator-core/configuration"
import type { CalculatorExtension as CalculatorExtensionValue } from "@openmirai/calculator-core/configuration"

const DEFAULT_ACTIVE_EXTENSION = CalculatorExtension.SCIENTIFIC

/** Renders the calculator package overview and interactive extension showcase. */
export function HomePage() {
  const [activeExtension, setActiveExtension] =
    useState<CalculatorExtensionValue>(DEFAULT_ACTIVE_EXTENSION)

  const activeDetail = useMemo(
    () => EXTENSIONS.find((extension) => extension.id === activeExtension) ?? EXTENSIONS[0],
    [activeExtension]
  )

  return (
    <>
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)] lg:items-center lg:px-10 lg:py-28">
          <div>
            <p className="text-sm font-medium text-primary">Open source · React · shadcn</p>
            <h1 className="mt-5 max-w-3xl text-5xl leading-[1.02] font-semibold tracking-tighter text-balance sm:text-6xl">
              A scientific calculator you install as source.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              {SITE_DESCRIPTION}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link to="/playground" search={DEFAULT_PLAYGROUND_SEARCH} />}
              >
                Open playground <ArrowRight />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link to="/docs/installation" />}
              >
                Installation
              </Button>
            </div>
          </div>

          <CodeBlock code={INSTALL_COMMAND} label="Install with shadcn" language="shell" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 lg:px-10 lg:py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Interactive preview</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
              Use only the workspace you need.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{activeDetail.summary}</p>
        </div>

        <div
          className="mt-7 grid gap-2 rounded-xl border bg-muted/35 p-2 sm:grid-cols-2 lg:grid-cols-4"
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
              className="h-10 justify-start px-3"
            >
              <extension.icon />
              {extension.label}
            </Button>
          ))}
        </div>

        <div className="mt-5 h-162.5">
          <MiraiCalculator
            extensions={[activeExtension]}
            mode={activeExtension}
            onModeChange={setActiveExtension}
            defaultTheme="system"
            title={`${activeDetail.label} calculator preview`}
          />
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <div>
            <PackageOpen className="size-5 text-primary" />
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em]">
              One command, two clear layers.
            </h2>
            <p className="mt-4 max-w-md leading-7 text-muted-foreground">
              The registry owns the editable interface. The core package owns calculation behavior.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {DISTRIBUTION_LAYERS.map((layer) => (
              <div key={layer.title} className="border-l pl-5">
                <h3 className="font-medium">{layer.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{layer.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 lg:px-10 lg:py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-primary">Built in</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
              Four focused extensions.
            </h2>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link to="/extensions" />}>
            View all <ArrowRight />
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXTENSIONS.map((extension) => (
            <Card key={extension.id} size="sm" className="h-full">
              <CardHeader className="flex-1">
                <extension.icon className="mb-4 size-5 text-primary" />
                <CardTitle>{extension.label}</CardTitle>
                <CardDescription className="leading-6">{extension.summary}</CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto border-t-0 bg-transparent pt-0">
                <Button
                  variant="link"
                  nativeButton={false}
                  className="w-fit px-0"
                  render={<Link to="/extensions/$id" params={{ id: extension.id }} />}
                >
                  Details <ArrowRight />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </>
  )
}
