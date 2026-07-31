import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"

import "@fontsource-variable/ibm-plex-sans"
import "@fontsource/ibm-plex-mono/400.css"
import "@/styles.css"
import { router } from "@/router"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Missing #root element")
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
