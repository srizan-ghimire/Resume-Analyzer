import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--surface-sunken)] text-[var(--text-muted)]",
        accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
        ok: "bg-[var(--ok-soft)] text-[var(--ok)]",
        warn: "bg-[var(--warn-soft)] text-[var(--warn)]",
        danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badge> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
