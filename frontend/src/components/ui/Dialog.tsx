import * as RadixDialog from "@radix-ui/react-dialog";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The single dialog implementation.
 *
 * Replaces three hand-rolled modals, none of which had a focus trap, Escape
 * handling, scroll lock, backdrop dismissal, or dialog semantics. Radix gives
 * all of that; the panel scrolls internally so long job descriptions do not
 * overflow the viewport.
 */
export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof RadixDialog.Content> & {
  title: string;
  description?: string;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-lg",
          "-translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl",
          "border bg-[var(--surface-raised)] shadow-2xl",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div className="min-w-0">
            <RadixDialog.Title className="text-lg font-semibold text-[var(--text)]">
              {title}
            </RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="mt-1 text-sm text-[var(--text-muted)]">
                {description}
              </RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close
            aria-label="Close dialog"
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-[var(--text-subtle)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </RadixDialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-5 flex flex-wrap justify-end gap-3 border-t pt-4", className)}
      {...props}
    />
  );
}
