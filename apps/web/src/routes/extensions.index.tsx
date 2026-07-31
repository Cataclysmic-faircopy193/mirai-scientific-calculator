import { createFileRoute } from "@tanstack/react-router"

import { ExtensionsPage } from "@/site/extensions-page"

export const Route = createFileRoute("/extensions/")({
  component: ExtensionsPage,
})
