import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-600",
        secondary: "bg-secondary text-white hover:bg-accent-700",
        outline: "border border-line-strong bg-surface text-ink-900 hover:bg-primary-50",
        ghost: "text-ink-600 hover:text-ink-900",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4 text-caption",
        lg: "h-12 w-full px-8",
        icon: "size-12 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({ className, variant, size, type = "button", ...props }) {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
