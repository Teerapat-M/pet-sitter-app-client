import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Logo({ href = "/", className, compact = false }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 text-primary", className)}
      aria-label="Pet Sitter Plus home"
    >
      <span
        className={cn(
          "inline-block rounded-full bg-primary",
          compact ? "size-6" : "size-7 md:size-8",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "font-extrabold tracking-tight",
          compact ? "text-base" : "text-lg md:text-xl",
        )}
      >
        Pet Sitter Plus
      </span>
    </Link>
  );
}
