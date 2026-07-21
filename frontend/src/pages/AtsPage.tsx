import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { ApiError } from "@/api/client";
import { matching } from "@/api/endpoints";
import type { AtsCheck, AtsReport } from "@/api/types";
import { usePageTitle } from "@/app/usePageTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

const MIN_LENGTH = 50;

export function AtsPage() {
  usePageTitle("ATS check");
  const location = useLocation();

  // Prefilled when arriving from a job's "check my resume against this".
  const prefill = (location.state as { jobDescription?: string } | null)?.jobDescription;
  const [description, setDescription] = useState(prefill ?? "");

  const report = useMutation({
    mutationFn: () => matching.atsReport(description),
  });

  const tooShort = description.trim().length < MIN_LENGTH;

  return (
    <>
      <PageHeader
        title="ATS check"
        description="Paste a job description to see how your resume scores against it, and what's missing."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <form
          className="surface-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!tooShort) report.mutate();
          }}
        >
          <label htmlFor="jd" className="block text-sm font-medium">
            Job description
          </label>
          <p id="jd-hint" className="mt-1 text-xs text-[var(--text-subtle)]">
            Include the requirements section — that's what the score is built from.
          </p>
          <Textarea
            id="jd"
            aria-describedby="jd-hint"
            className="mt-3 min-h-72 font-mono text-xs leading-relaxed"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Paste the full posting here…"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-subtle)]">
            <span>{description.trim().length} characters</span>
            {tooShort && description.length > 0 && (
              <span>At least {MIN_LENGTH} needed</span>
            )}
          </div>

          <Button
            type="submit"
            className="mt-4 w-full"
            size="lg"
            disabled={tooShort}
            loading={report.isPending}
          >
            Analyze my resume
          </Button>

          {report.isError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
            >
              <p>
                {report.error instanceof ApiError
                  ? report.error.message
                  : "Something went wrong. Please try again."}
              </p>
              {report.error instanceof ApiError &&
                report.error.fieldError("resume") && (
                  <Link
                    to="/resume"
                    className="mt-2 inline-block font-medium underline"
                  >
                    Upload a resume
                  </Link>
                )}
            </div>
          )}
        </form>

        <div aria-live="polite">
          {report.isPending ? (
            <ReportSkeleton />
          ) : report.data ? (
            <Report report={report.data} />
          ) : (
            <div className="surface-card p-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Your report will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function scoreTone(score: number) {
  if (score >= 75) return "text-[var(--ok)]";
  if (score >= 50) return "text-[var(--warn)]";
  return "text-[var(--danger)]";
}

function Report({ report }: { report: AtsReport }) {
  const failed = report.checks.filter((check) => !check.passed);

  return (
    <div className="space-y-5">
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Overall match</p>
            <p className={cn("text-5xl font-semibold", scoreTone(report.score))}>
              {report.score}
              <span className="text-2xl text-[var(--text-subtle)]">/100</span>
            </p>
            <p className="mt-1 font-medium">{report.verdict}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-[var(--text-muted)]">Keyword match</dt>
            <dd className="text-right font-semibold">{report.keyword_score}</dd>
            <dt className="text-[var(--text-muted)]">Resume quality</dt>
            <dd className="text-right font-semibold">{report.quality_score}</dd>
            <dt className="text-[var(--text-muted)]">Keyword density</dt>
            <dd className="text-right font-semibold">{report.keyword_density}%</dd>
            {report.required_years != null && (
              <>
                <dt className="text-[var(--text-muted)]">Experience asked</dt>
                <dd className="text-right font-semibold">{report.required_years} yrs</dd>
              </>
            )}
          </dl>
        </div>

        <div
          className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]"
          role="img"
          aria-label={`Overall score ${report.score} out of 100`}
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width]"
            style={{ width: `${report.score}%` }}
          />
        </div>
      </section>

      {report.suggestions.length > 0 && (
        <section className="surface-card p-6">
          <h2 className="text-base font-semibold">What to fix first</h2>
          <ol className="mt-3 space-y-3">
            {report.suggestions.map((suggestion, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                  {index + 1}
                </span>
                <span className="text-[var(--text-muted)]">{suggestion}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {report.missing_skills.length > 0 && (
        <section className="surface-card p-6">
          <h2 className="text-base font-semibold">Missing skills</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ranked by how central each one is to this posting.
          </p>
          <ul className="mt-4 space-y-3">
            {report.missing_skills.slice(0, 12).map((gap) => (
              <li key={gap.skill}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{gap.skill}</span>
                  <span className="text-xs text-[var(--text-subtle)]">
                    {Math.round(gap.importance * 100)}% weight
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      gap.importance >= 0.6
                        ? "bg-[var(--danger)]"
                        : gap.importance >= 0.3
                          ? "bg-[var(--warn)]"
                          : "bg-[var(--text-subtle)]",
                    )}
                    style={{ width: `${Math.max(4, gap.importance * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.matched_skills.length > 0 && (
        <section className="surface-card p-6">
          <h2 className="text-base font-semibold">
            Matched skills ({report.matched_skills.length})
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {report.matched_skills.map((skill) => (
              <Badge key={skill} tone="ok">
                {skill}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <section className="surface-card p-6">
        <h2 className="text-base font-semibold">
          Resume checks{" "}
          <span className="font-normal text-[var(--text-muted)]">
            ({report.checks.length - failed.length}/{report.checks.length} passed)
          </span>
        </h2>
        <ul className="mt-4 space-y-3">
          {report.checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function CheckRow({ check }: { check: AtsCheck }) {
  const tone = check.passed
    ? "text-[var(--ok)]"
    : check.severity === "critical"
      ? "text-[var(--danger)]"
      : check.severity === "warning"
        ? "text-[var(--warn)]"
        : "text-[var(--text-subtle)]";

  return (
    <li className="flex gap-3">
      <span className={cn("mt-0.5 shrink-0", tone)} aria-hidden="true">
        {check.passed ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="m20 6-11 11-5-5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {check.label}
          <span className="sr-only-focusable">
            {check.passed ? " passed" : ` failed, ${check.severity}`}
          </span>
          {!check.passed && check.severity === "critical" && (
            <Badge tone="danger" className="ml-2">
              Critical
            </Badge>
          )}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-muted)]">
          {check.detail}
        </p>
      </div>
    </li>
  );
}

function ReportSkeleton() {
  return (
    <div className="surface-card space-y-4 p-6" role="status">
      <div className="h-12 w-32 animate-pulse rounded bg-[var(--surface-sunken)]" />
      <div className="h-2 animate-pulse rounded-full bg-[var(--surface-sunken)]" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-[var(--surface-sunken)]" />
      ))}
      <span className="sr-only-focusable">Analyzing your resume…</span>
    </div>
  );
}
