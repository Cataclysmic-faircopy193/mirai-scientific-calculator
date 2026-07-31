import { Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CodePreview } from "@/site/code-preview"
import { NotFoundPage } from "@/site/not-found-page"
import { getExtension } from "@/site/site-data"

export function ExtensionDetailPage({ extensionId }: { extensionId: string }) {
  const extension = getExtension(extensionId)

  if (!extension) return <NotFoundPage />

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:px-10">
      <Button
        variant="ghost"
        nativeButton={false}
        className="-ml-2"
        render={<Link to="/extensions" />}
      >
        <ArrowLeft /> All extensions
      </Button>

      <div className="mt-10 grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <extension.icon className="size-5" />
          </div>
          <Badge variant="secondary" className="mt-7 font-mono uppercase tracking-[0.15em]">
            {extension.eyebrow}
          </Badge>
          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em]">{extension.label}</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{extension.description}</p>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Included workflow</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {extension.features.map((feature) => (
                <div key={feature} className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan-600 dark:text-cyan-300" />
                  {feature}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <CodePreview
          preview={
            <MiraiCalculator
              extensions={[extension.id]}
              defaultMode={extension.id}
              height={670}
              defaultTheme="system"
              title={`${extension.label} calculator`}
            />
          }
          code={extension.example}
          previewLabel={extension.label}
        />
      </div>
    </div>
  )
}
