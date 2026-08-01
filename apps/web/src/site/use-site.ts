import { useContext } from "react"

import { SiteContext } from "@/site/site-context"

/** Reads the required showcase context from the nearest site provider. */
export function useSite() {
  const value = useContext(SiteContext)
  if (!value) {
    throw new Error("useSite must be used inside SiteProvider")
  }
  return value
}
