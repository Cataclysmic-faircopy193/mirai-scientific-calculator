import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CopyButton } from "@/site/copy-button"

export function CodeBlock({
  code,
  label,
  language = "tsx",
}: {
  code: string
  label: string
  language?: string
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex min-h-11 flex-row items-center justify-between border-b bg-muted/30 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {label} · {language}
        </span>
        <CopyButton value={code} label="Copy" />
      </CardHeader>
      <CardContent className="p-0">
        <pre className="overflow-x-auto bg-slate-950 p-5 text-sm leading-7 text-slate-100">
          <code>{code}</code>
        </pre>
      </CardContent>
    </Card>
  )
}
