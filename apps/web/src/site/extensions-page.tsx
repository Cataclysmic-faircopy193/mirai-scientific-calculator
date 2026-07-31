import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EXTENSIONS } from "@/site/site-data"

export function ExtensionsPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 lg:px-10 lg:py-20">
      <div className="max-w-3xl">
        <Badge variant="secondary">Built-in extensions</Badge>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Choose the calculator workspaces your product needs.
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          The registry installs every workspace once. The uppercase `CalculatorExtension` constants
          decide which instruments appear, their order, and the active mode.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {EXTENSIONS.map((extension) => (
          <Card key={extension.id}>
            <CardHeader>
              <div className="mb-4 grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                <extension.icon className="size-4" />
              </div>
              <CardDescription className="text-xs font-medium text-primary">
                {extension.eyebrow}
              </CardDescription>
              <CardTitle className="text-2xl tracking-[-0.03em]">{extension.label}</CardTitle>
              <CardDescription className="max-w-xl leading-6">
                {extension.description}
              </CardDescription>
              <Button
                variant="link"
                nativeButton={false}
                className="mt-3 w-fit px-0"
                render={<Link to="/extensions/$id" params={{ id: extension.id }} />}
              >
                Open extension <ArrowRight />
              </Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
