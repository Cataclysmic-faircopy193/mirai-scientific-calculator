import { createFileRoute } from "@tanstack/react-router"

import { normalizePlaygroundSearch } from "@/site/constants/playground"
import { PlaygroundPage } from "@/site/playground-page"

export const Route = createFileRoute("/playground")({
  validateSearch: normalizePlaygroundSearch,
  component: PlaygroundRoute,
})

function PlaygroundRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <PlaygroundPage
      search={search}
      onSearchChange={(nextSearch) => {
        void navigate({ search: nextSearch, replace: true })
      }}
    />
  )
}
