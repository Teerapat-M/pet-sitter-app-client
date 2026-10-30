import { cn } from "./utils.js";

/**
 * Shared card hover-lift. Tailwind 4 already gates `hover:` with
 * `@media (hover: hover)`, so touch devices do not get a sticky lift.
 * Translate and transition are `motion-safe:` so reduced-motion users
 * get no hover translate (Tailwind 4 `translate` is not reset by
 * `transform-none`).
 */
export const CARD_LIFT_CLASS =
  "hover:shadow-lg motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-1";

export function cardClassName({ interactive = false, className } = {}) {
  return cn(className, CARD_LIFT_CLASS, interactive && "cursor-pointer");
}
