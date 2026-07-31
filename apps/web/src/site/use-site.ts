import { useContext } from "react"

import { SiteContext } from "@/site/site-context"

export function useSite() {
  const value = useContext(SiteContext)
  if (!value) throw new Error("useSite must be used inside SiteProvider")
  return value
}
