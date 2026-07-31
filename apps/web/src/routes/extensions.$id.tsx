import { createFileRoute } from "@tanstack/react-router"

import { ExtensionDetailPage } from "@/site/extension-detail-page"

export const Route = createFileRoute("/extensions/$id")({
  component: ExtensionDetailRoute,
})

function ExtensionDetailRoute() {
  const { id } = Route.useParams()
  return <ExtensionDetailPage extensionId={id} />
}
