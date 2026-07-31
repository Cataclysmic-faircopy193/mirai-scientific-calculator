import type { SimpleIcon } from "simple-icons"

export function SimpleIconMark({
  icon,
  className,
  decorative = false,
}: {
  icon: SimpleIcon
  className?: string
  decorative?: boolean
}) {
  return (
    <svg
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : icon.title}
      role={decorative ? undefined : "img"}
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {!decorative && <title>{icon.title}</title>}
      <path d={icon.path} />
    </svg>
  )
}
