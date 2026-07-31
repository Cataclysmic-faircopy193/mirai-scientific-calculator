import { createFileRoute } from "@tanstack/react-router"

import { CorePage } from "@/site/docs-pages"

export const Route = createFileRoute("/docs/core")({
  component: CorePage,
})
