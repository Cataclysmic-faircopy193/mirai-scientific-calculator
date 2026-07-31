import { createFileRoute } from "@tanstack/react-router"

import { HomePage } from "@/site/home-page"

export const Route = createFileRoute("/")({
  component: HomePage,
})
