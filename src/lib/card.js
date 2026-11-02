import { cn } from "./utils.js";

/**
 * Shared card hover-lift. Translate lives in `globals.css` (`.card-lift`);
 * hover/focus shadow is a utilities-layer class so it wins over `shadow-card`.
 * `overflow-visible` wins over per-card `overflow-hidden` so the shadow is
 * never clipped on the lifting root.
 */
export const CARD_LIFT_CLASS = "card-lift";

/** `@layer utilities` — beats rest-state `shadow-card` on hover/focus. */
export const CARD_LIFT_SHADOW_CLASS =
  "hover:shadow-card-hover focus-visible:shadow-card-hover focus-within:shadow-card-hover";

export function cardClassName({ interactive = false, className } = {}) {
  return cn(
    className,
    CARD_LIFT_CLASS,
    CARD_LIFT_SHADOW_CLASS,
    "overflow-visible",
    interactive && "cursor-pointer",
  );
}
