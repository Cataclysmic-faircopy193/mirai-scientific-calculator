import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/** Renders the site-level not-found recovery page. */
export function NotFoundPage() {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-7xl place-items-center px-5 py-20 text-center">
      <div>
        <Badge variant="outline" className="font-mono">
          404 / OUT OF RANGE
        </Badge>
        <h1 className="mt-6 text-5xl font-semibold tracking-tighter">No value at this point.</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          The route is outside the current calculator domain.
        </p>
        <Button className="mt-8" nativeButton={false} render={<Link to="/" />}>
          <ArrowLeft /> Return to overview
        </Button>
      </div>
    </div>
  )
}
