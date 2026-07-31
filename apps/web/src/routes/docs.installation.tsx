import { createFileRoute } from "@tanstack/react-router"

import { InstallationPage } from "@/site/docs-pages"

export const Route = createFileRoute("/docs/installation")({
  component: InstallationPage,
})
