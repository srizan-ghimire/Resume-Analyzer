import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type * as React from "react";
import { MemoryRouter } from "react-router-dom";

import { AuthProvider } from "@/app/AuthProvider";
import { ThemeProvider } from "@/app/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";

/** Renders with the full provider stack the real app uses. */
export function renderApp(
  ui: React.ReactNode,
  { route = "/" }: { route?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>
            <ToastProvider>{ui}</ToastProvider>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}
