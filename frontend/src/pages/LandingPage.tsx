import { Link } from "react-router-dom";

import { useAuth } from "@/app/AuthProvider";
import { usePageTitle } from "@/app/usePageTitle";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";


const CAPABILITIES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    ),
    title: "ATS Score",
    body: "Upload your resume and get an instant 0–100 compatibility score against any job description.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="M11 8v6M8 11h6" />
      </svg>
    ),
    title: "Gap Analysis",
    body: "Discover the exact skills and keywords your resume is missing for each role you target.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
      </svg>
    ),
    title: "Smart Matching",
    body: "Get ranked recommendations from live job postings that align with your actual skill set.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    title: "Application Tracker",
    body: "Track every application in one place — status, dates, and which skills sealed the match.",
  },
];

export function LandingPage() {
  usePageTitle();
  const { isAuthenticated, user } = useAuth();

  const homeHref = user?.role === "RECRUITER" ? "/recruiter/jobs" : "/jobs";

  return (
    <div className="min-h-dvh bg-[var(--surface)] bg-pattern-dots">
      <a href="#main" className="sr-only-focusable">
        Skip to main content
      </a>

      <main id="main">
        {/* ── Hero ── */}
        <section className="relative mx-auto max-w-5xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28">
          <div className="mb-12 flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Button asChild size="sm">
                  <Link to={homeHref}>Open app →</Link>
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
            </div>
          </div>

          <div className="max-w-2xl">
            <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.1] tracking-tight">
              Know where you stand
              <br />
              <span className="text-[var(--text-muted)]">before you apply.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
              Resumatch scores your resume against any job description, surfaces
              the skills you're missing, and connects you with roles that
              actually fit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={isAuthenticated ? homeHref : "/register"}>
                  {isAuthenticated ? "Open app" : "Analyze my resume"}
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/jobs">Browse open roles</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-[var(--text-subtle)]">
              Free to use · No credit card required
            </p>
          </div>

          {/* Floating score card – visual anchor */}
          <div className="pointer-events-none absolute right-6 bottom-8 hidden lg:block">
            <ScoreCard />
          </div>
        </section>

        {/* ── Capabilities grid ── */}
        <section className="border-t border-[var(--border)]">
          <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-subtle)]">
              What you get
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything to close the gap between your resume and the job.
            </h2>

            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
              {CAPABILITIES.map((cap) => (
                <div
                  key={cap.title}
                  className="flex flex-col gap-3 bg-[var(--surface-raised)] p-7 transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <span className="text-[var(--text-muted)]">{cap.icon}</span>
                  <h3 className="text-base font-semibold">{cap.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                    {cap.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="border-t border-[var(--border)] bg-[var(--surface-sunken)]">
          <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-subtle)]">
              How it works
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Three steps. One minute.
            </h2>

            <div className="mt-12 flex flex-col gap-8 sm:flex-row sm:gap-6">
              {[
                { n: "01", title: "Upload your resume", body: "PDF or DOCX. We parse it once and extract your skills, experience, and formatting quality." },
                { n: "02", title: "Score it against a role", body: "Paste any job description — get a detailed report with match score, missing skills, and improvement tips." },
                { n: "03", title: "Apply where you fit", body: "Browse live postings ranked by your score. Track every application and see which skills sealed the match." },
              ].map((step) => (
                <div key={step.n} className="flex-1">
                  <span className="text-3xl font-semibold text-[var(--border-strong)]">
                    {step.n}
                  </span>
                  <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="border-t border-[var(--border)]">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-5 py-20 text-center sm:px-8 sm:py-28">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Stop applying blind.
            </h2>
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              Get your first resume score in under a minute — and start
              targeting roles where you actually have an edge.
            </p>
            <Button asChild size="lg">
              <Link to={isAuthenticated ? homeHref : "/register"}>
                {isAuthenticated ? "Open app" : "Get started free"}
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-[var(--text-muted)] sm:flex-row sm:px-8">
          <Logo />
          <p>© 2023-{new Date().getFullYear()} ResumeAnalyzer</p>
          <div className="flex gap-4">
            <Link to="/jobs" className="transition-colors hover:text-[var(--text)]">
              Jobs
            </Link>
            <Link to="/register" className="transition-colors hover:text-[var(--text)]">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Decorative floating score card shown on large screens */
function ScoreCard() {
  return (
    <div className="w-56 rotate-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-lg">
      <p className="text-xs text-[var(--text-subtle)]">Match score</p>
      <p className="mt-1 text-4xl font-semibold">74</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
        <div className="h-full w-[74%] rounded-full bg-[var(--accent)]" />
      </div>
      <div className="mt-4 space-y-2">
        {[
          { label: "Kubernetes", pct: 92 },
          { label: "Spark", pct: 64 },
          { label: "Terraform", pct: 38 },
        ].map((g) => (
          <div key={g.label} className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{g.label}</span>
            <span className="tabular-nums">{g.pct}%</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-[var(--text-subtle)]">Example report</p>
    </div>
  );
}
