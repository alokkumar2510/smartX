import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Modern class management using clsx and tailwind-merge.
 * Ensures that Tailwind v4 classes are merged correctly (e.g. padding and margins).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
