import { cn } from "@/lib/utils";

export default function CctvBadge({
  className,
  label = "CCTV",
  live = false,
}) {
  return (
    <span
      className={cn(
        "badge-cctv badge inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full bg-live",
          live && "animate-pulse",
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
