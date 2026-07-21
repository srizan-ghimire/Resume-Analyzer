import type * as React from "react";
import { Link } from "react-router-dom";

import { Logo } from "./Logo";
import { ThemeToggle } from "@/app/ThemeProvider";

/**
 * Two-column shell for login and register.
 *
 * The old auth pages used a fixed 420px card with no media query, so both were
 * unusable below ~440px. This is fluid and single-column on small screens.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="rounded-lg">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>

        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 text-center text-sm text-[var(--text-muted)]">{footer}</div>
        </main>
      </div>

      <aside className="relative hidden overflow-hidden bg-[var(--surface-sunken)] lg:block">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] via-transparent to-transparent"
        />
        <div className="relative flex h-full flex-col justify-center gap-8 p-14">
          <blockquote className="max-w-md text-2xl font-medium leading-snug text-[var(--text)]">
            “Most resumes are rejected before a person ever reads them. Know your
            score before you apply.”
          </blockquote>
          <ul className="space-y-4 text-sm text-[var(--text-muted)]">
            {[
              "Score your resume against any job description",
              "See exactly which required skills you are missing",
              "Get matched to roles that fit what you already have",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                    <path d="m20 6-11 11-5-5" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
