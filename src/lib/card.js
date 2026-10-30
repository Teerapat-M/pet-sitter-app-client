import { cn } from "./utils.js";

/**
 * Shared card hover-lift. Tailwind 4 already gates `hover:` with
 * `@media (hover: hover)`, so touch devices do not get a sticky lift.
 * Transform + shadow only — no margin or size changes.
 */
export const CARD_LIFT_CLASS =
  "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none";

export function cardClassName({ interactive = false, className } = {}) {
  return cn(className, CARD_LIFT_CLASS, interactive && "cursor-pointer");
}
