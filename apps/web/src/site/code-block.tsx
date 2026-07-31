import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CODE_LANGUAGE_LABELS, type CodeLanguage } from "@/site/constants/code"
import { CopyButton } from "@/site/copy-button"
import { HighlightedCode } from "@/site/highlighted-code"

/** Renders highlighted source with a copy affordance. */
export function CodeBlock({
  code,
  label,
  language = "tsx",
}: {
  code: string
  label: string
  language?: CodeLanguage
}) {
  return (
    <Card
      role="region"
      aria-label={`${label} ${language} source code`}
      className="gap-0 overflow-hidden py-0"
    >
      <CardHeader className="flex min-h-11 flex-row items-center justify-between border-b bg-muted/40 px-4 py-2">
        <span className="font-mono text-[11px] text-muted-foreground">
          {label} · {CODE_LANGUAGE_LABELS[language]}
        </span>
        <CopyButton value={code} label="Copy" />
      </CardHeader>
      <CardContent className="p-0">
        <HighlightedCode
          ariaLabel={`${label} highlighted source`}
          code={code}
          language={language}
        />
      </CardContent>
    </Card>
  )
}
