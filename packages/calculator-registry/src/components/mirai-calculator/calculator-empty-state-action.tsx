interface CalculatorEmptyStateActionProps {
  label: string
  onClick: () => void
}

/** Renders the inline Add action used by calculator empty-state guidance. */
export function CalculatorEmptyStateAction({ label, onClick }: CalculatorEmptyStateActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="font-semibold text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      Add
    </button>
  )
}
