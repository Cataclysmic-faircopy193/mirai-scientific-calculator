import { Code2, Eye } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CopyButton } from "@/site/copy-button"
import { HighlightedCode } from "@/site/highlighted-code"

const PREVIEW_TAB = "preview"
const CODE_TAB = "code"

/** Displays an interactive preview beside its syntax-highlighted implementation. */
export function CodePreview({
  preview,
  code,
  previewLabel,
}: {
  preview: React.ReactNode
  code: string
  previewLabel: string
}) {
  return (
    <Tabs defaultValue={PREVIEW_TAB} className="min-w-0 gap-0">
      <Card className="min-w-0 gap-0 overflow-hidden py-0">
        <CardHeader className="flex min-h-12 flex-row items-center justify-between border-b bg-muted/30 px-3 py-2">
          <TabsList>
            <TabsTrigger value={PREVIEW_TAB}>
              <Eye /> Preview
            </TabsTrigger>
            <TabsTrigger value={CODE_TAB}>
              <Code2 /> Code
            </TabsTrigger>
          </TabsList>
          <CopyButton value={code} label="Copy code" />
        </CardHeader>
        <CardContent className="min-w-0 p-0">
          <TabsContent value={PREVIEW_TAB} aria-label={`${previewLabel} preview`}>
            <div className="min-w-0 overflow-hidden bg-muted/20 p-3 sm:p-6">{preview}</div>
          </TabsContent>
          <TabsContent value={CODE_TAB} aria-label={`${previewLabel} code`}>
            <HighlightedCode
              ariaLabel={`${previewLabel} source code`}
              className="max-h-160"
              code={code}
              language="tsx"
            />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  )
}
