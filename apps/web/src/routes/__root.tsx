import { createRootRoute } from "@tanstack/react-router"

import { NotFoundPage } from "@/site/not-found-page"
import { SiteShell } from "@/site/site-shell"

export const Route = createRootRoute({
  component: SiteShell,
  notFoundComponent: NotFoundPage,
})
