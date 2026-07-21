import { Link } from "react-router-dom";

import { useAuth } from "@/app/AuthProvider";
import { usePageTitle } from "@/app/usePageTitle";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";

/** The previous router had no catch-all, so unknown URLs rendered a blank page. */
export function NotFoundPage() {
  usePageTitle("Page not found");
  const { isAuthenticated, user } = useAuth();
  const home = !isAuthenticated
    ? "/"
    : user?.role === "RECRUITER"
      ? "/recruiter/jobs"
      : "/jobs";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Link to="/" className="rounded-lg">
        <Logo />
      </Link>
      <p className="text-6xl font-semibold text-[var(--accent)]">404</p>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
          That link doesn't lead anywhere. It may have been moved or the job may
          have closed.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to={home}>Go home</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/jobs">Browse jobs</Link>
        </Button>
      </div>
    </main>
  );
}
