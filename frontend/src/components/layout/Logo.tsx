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
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="4" y="2" width="12" height="15" rx="2.5" stroke="var(--text-muted)" strokeWidth="2" />
        <rect x="8" y="7" width="12" height="15" rx="2.5" fill="var(--accent)" />
      </svg>
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight text-[var(--text)]">
          ResumeAnalyzer
        </span>
      )}
    </span>
  );
}
