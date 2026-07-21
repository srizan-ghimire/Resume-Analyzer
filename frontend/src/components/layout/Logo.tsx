import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" fill="var(--accent)" />
        <path
          d="M10 22V10h6a4 4 0 0 1 1.2 7.8L21 22h-3.2l-3.3-4H13v4h-3Zm3-6.6h2.6a1.7 1.7 0 0 0 0-3.4H13v3.4Z"
          fill="var(--accent-contrast)"
        />
      </svg>
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight text-[var(--text)]">
          Resumatch
        </span>
      )}
    </span>
  );
}
