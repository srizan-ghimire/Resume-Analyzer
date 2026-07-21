import type * as React from "react";

import { Button } from "./Button";
import { cn } from "@/lib/utils";

/** Skeleton block for loading states. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--surface-sunken)]", className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="surface-card space-y-3 p-5">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
      <span className="sr-only-focusable">Loading…</span>
    </div>
  );
}

/** Inline spinner with an accessible name. */
export function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12">
      <svg className="h-5 w-5 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

interface StateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: StateProps) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-[var(--text-subtle)]">{icon}</div>}
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-[var(--text-muted)]">{description}</p>
      )}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="surface-card flex flex-col items-center gap-3 px-6 py-14 text-center"
    >
      <div className="rounded-full bg-[var(--danger-soft)] p-3 text-[var(--danger)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-[var(--text-muted)]">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}
