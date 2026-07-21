import * as RadixToast from "@radix-ui/react-toast";
import * as React from "react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within <ToastProvider>");
  return context;
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((tone: ToastTone, title: string, description?: string) => {
    setItems((current) => [...current, { id: nextId++, title, description, tone }]);
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      info: (title, description) => push("info", title, description),
    }),
    [push],
  );

  const dismiss = (id: number) =>
    setItems((current) => current.filter((item) => item.id !== id));

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((item) => (
          <RadixToast.Root
            key={item.id}
            onOpenChange={(open) => !open && dismiss(item.id)}
            className={cn(
              "surface-card flex items-start gap-3 p-4 shadow-lg",
              "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
              item.tone === "success" && "border-l-4 border-l-[var(--ok)]",
              item.tone === "error" && "border-l-4 border-l-[var(--danger)]",
              item.tone === "info" && "border-l-4 border-l-[var(--accent)]",
            )}
          >
            <div className="min-w-0 flex-1">
              <RadixToast.Title className="text-sm font-semibold text-[var(--text)]">
                {item.title}
              </RadixToast.Title>
              {item.description && (
                <RadixToast.Description className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {item.description}
                </RadixToast.Description>
              )}
            </div>
            <RadixToast.Close
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-1 text-[var(--text-subtle)] hover:text-[var(--text)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-0 right-0 z-[60] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
