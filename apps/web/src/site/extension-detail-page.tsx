import { Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

import { MiraiCalculator } from "@/components/mirai-calculator/mirai-calculator"
import { Button } from "@/components/ui/button"
import { CodePreview } from "@/site/code-preview"
import { NotFoundPage } from "@/site/not-found-page"
import { getExtension } from "@/site/site-data"

/** Renders one focused calculator extension example or the not-found state. */
export function ExtensionDetailPage({ extensionId }: { extensionId: string }) {
  const extension = getExtension(extensionId)

  if (!extension) return <NotFoundPage />

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 lg:px-10 lg:py-16">
      <Button
        variant="ghost"
        nativeButton={false}
        className="-ml-2"
        render={<Link to="/extensions" />}
      >
        <ArrowLeft /> All extensions
      </Button>

      <div className="mt-9 grid gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <extension.icon className="size-5" />
          </div>
          <p className="mt-6 text-sm font-medium text-primary">{extension.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">{extension.label}</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{extension.description}</p>

          <h2 className="mt-8 font-medium">Included workflow</h2>
          <ul className="mt-4 grid gap-3">
            {extension.features.map((feature) => (
              <li key={feature} className="flex gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <CodePreview
          preview={
            <div className="h-[670px]">
              <MiraiCalculator
                extensions={[extension.id]}
                defaultMode={extension.id}
                defaultTheme="system"
                title={`${extension.label} calculator`}
              />
            </div>
          }
          code={extension.example}
          previewLabel={extension.label}
        />
      </div>
    </div>
  )
}
