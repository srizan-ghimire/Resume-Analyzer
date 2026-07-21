import * as React from "react";

import { Button } from "@/components/ui/Button";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render errors so a single broken component cannot white-screen the app. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="surface-card max-w-md space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Something broke</h1>
          <p className="text-sm text-[var(--text-muted)]">
            An unexpected error stopped this page from rendering. Reloading usually
            clears it.
          </p>
          {import.meta.env.DEV && (
            <pre className="overflow-x-auto rounded-lg bg-[var(--surface-sunken)] p-3 text-left text-xs text-[var(--danger)]">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button variant="secondary" onClick={() => this.setState({ error: null })}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
