import { createFileRoute } from "@tanstack/react-router"

import { DocsLayout } from "@/site/docs-pages"

export const Route = createFileRoute("/docs")({
  component: DocsLayout,
})
