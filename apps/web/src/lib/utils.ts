import { clsx } from "clsx"
import type { ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Merges conditional Tailwind class values without conflicting utilities. */
export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}
