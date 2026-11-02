import { cn } from "./utils.js";

/**
 * Shared card hover-lift. Visuals live in `globals.css` (`.card-lift`) so
 * hover, :focus-visible, :focus-within, and reduced-motion stay in one place.
 * `overflow-visible` wins over per-card `overflow-hidden` so the shadow is
 * never clipped on the lifting root.
 */
export const CARD_LIFT_CLASS = "card-lift";

export function cardClassName({ interactive = false, className } = {}) {
  return cn(className, CARD_LIFT_CLASS, "overflow-visible", interactive && "cursor-pointer");
}
