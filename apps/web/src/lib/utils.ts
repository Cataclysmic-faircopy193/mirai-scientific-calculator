import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Merges conditional Tailwind class values without conflicting utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
