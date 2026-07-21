import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/app/AuthProvider";
import { ThemeToggle } from "@/app/ThemeProvider";
import { usePageTitle } from "@/app/usePageTitle";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    title: "Know your score before you apply",
    body: "Paste any job description and get a 0–100 match score, split into keyword relevance and resume quality.",
  },
  {
    title: "See exactly what's missing",
    body: "Required skills you don't mention, ranked by how central each one is to the posting — not an undifferentiated list.",
  },
  {
    title: "Pass the format checks",
    body: "Contact details, parseable sections, dates, bullet density, action verbs. The things that get resumes filtered out before a human reads them.",
  },
  {
    title: "Get matched to real openings",
    body: "Recommendations are scored against live postings from recruiters on Resumatch, with the matching skills shown.",
  },
];

const STEPS = [
  { step: "1", title: "Upload your resume", body: "PDF or DOCX. We parse it once and pull out your skills." },
  { step: "2", title: "Check it against a role", body: "Paste a job description and read the full report." },
  { step: "3", title: "Apply where you fit", body: "Browse matches ranked by score and track every application." },
];

export function LandingPage() {
  usePageTitle();
  const { isAuthenticated, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const homeHref = user?.role === "RECRUITER" ? "/recruiter/jobs" : "/jobs";

  return (
    <div className="min-h-dvh bg-[var(--surface)]">
      <a href="#main" className="sr-only-focusable">
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b bg-[var(--surface)]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="rounded-lg">
            <Logo />
          </Link>

          <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 sm:flex">
            <a
              href="#features"
              className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Features
            </a>
            <a
              href="#how"
              className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              How it works
            </a>
            <ThemeToggle />
            {isAuthenticated ? (
              <Button asChild size="sm" className="ml-2">
                <Link to={homeHref}>Open app</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </nav>

          {/* The old header hid its links at <md with no replacement. */}
          <div className="ml-auto flex items-center gap-1 sm:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="landing-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
              </svg>
            </Button>
          </div>
        </div>

        <div
          id="landing-menu"
          hidden={!menuOpen}
          className="border-t px-4 py-3 sm:hidden"
        >
          <nav aria-label="Primary" className="flex flex-col gap-1">
            <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)]">
              Features
            </a>
            <a href="#how" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)]">
              How it works
            </a>
            <div className="mt-2 flex flex-col gap-2">
              {isAuthenticated ? (
                <Button asChild>
                  <Link to={homeHref}>Open app</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="secondary">
                    <Link to="/login">Sign in</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/register">Get started</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
              Resume scoring, without the guesswork
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Find out why your resume isn't getting through
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--text-muted)]">
              Upload it once. Score it against any job description, see the skills
              you're missing, and get matched to roles that actually fit.
            </p>
            {/* flex-wrap: the old hero buttons overflowed at 375px. */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to={isAuthenticated ? homeHref : "/register"}>
                  {isAuthenticated ? "Open app" : "Analyze my resume"}
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/jobs">Browse open roles</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-[var(--text-subtle)]">
              Browsing jobs doesn't require an account.
            </p>
          </div>

          <ScorePreview className="mx-auto mt-16 max-w-2xl" />
        </section>

        <section id="features" className="border-t bg-[var(--surface-sunken)]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              What you actually get
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="surface-card p-6">
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Three steps
          </h2>
          <ol className="mt-12 grid gap-6 sm:grid-cols-3">
            {STEPS.map((item) => (
              <li key={item.step} className="surface-card p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-contrast)]">
                  {item.step}
                </span>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="surface-card mt-16 flex flex-col items-center gap-5 p-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Stop applying blind
            </h2>
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              Get your first resume score in under a minute.
            </p>
            <Button asChild size="lg">
              <Link to={isAuthenticated ? homeHref : "/register"}>
                {isAuthenticated ? "Open app" : "Get started free"}
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--text-muted)] sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} Resumatch</p>
          <div className="flex gap-4">
            <Link to="/jobs" className="hover:text-[var(--text)]">
              Jobs
            </Link>
            <Link to="/register" className="hover:text-[var(--text)]">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Static illustration of the report. Labelled as an example, not live data. */
function ScorePreview({ className }: { className?: string }) {
  const gaps = [
    { skill: "Kubernetes", importance: 0.92 },
    { skill: "Apache Spark", importance: 0.64 },
    { skill: "Terraform", importance: 0.38 },
  ];

  return (
    <figure className={cn("surface-card overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
        <div>
          <p className="text-sm text-[var(--text-muted)]">Example report</p>
          <p className="text-lg font-semibold">Senior Data Scientist</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-semibold text-[var(--accent)]">74</p>
          <p className="text-sm text-[var(--text-muted)]">Good match</p>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <p className="text-sm font-medium">Missing skills, by importance</p>
        {gaps.map((gap) => (
          <div key={gap.skill} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>{gap.skill}</span>
              <span className="text-[var(--text-subtle)]">
                {Math.round(gap.importance * 100)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${gap.importance * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <figcaption className="sr-only-focusable">
        Example of a Resumatch ATS report showing a score of 74 out of 100.
      </figcaption>
    </figure>
  );
}
