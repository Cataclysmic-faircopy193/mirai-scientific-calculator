import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExtensionVisual } from "@/site/extension-visual"
import { EXTENSIONS } from "@/site/site-data"

export function ExtensionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 lg:px-10">
      <div className="max-w-3xl">
        <Badge variant="outline" className="font-mono uppercase tracking-[0.16em]">
          Built-in functionality
        </Badge>
        <h1 className="mt-6 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
          Configure a calculator around the work.
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          The registry installs every workspace once. The uppercase `CalculatorExtension` constants
          decide which instruments appear, their order, and the active mode.
        </p>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-2">
        {EXTENSIONS.map((extension) => (
          <Card key={extension.id} className="group">
            <CardHeader>
              <div className="mb-5 grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                <extension.icon className="size-4" />
              </div>
              <CardDescription className="font-mono text-xs uppercase tracking-[0.15em]">
                {extension.eyebrow}
              </CardDescription>
              <CardTitle className="text-3xl tracking-[-0.04em]">{extension.label}</CardTitle>
              <CardDescription className="max-w-xl leading-6">
                {extension.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExtensionVisual extension={extension.id} />
              <Button
                variant="link"
                nativeButton={false}
                className="mt-4 px-0"
                render={<Link to="/extensions/$id" params={{ id: extension.id }} />}
              >
                Open extension <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
