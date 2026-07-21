import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { applications as applicationsApi } from "@/api/endpoints";
import {
  APPLICATION_STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from "@/api/types";
import { usePageTitle } from "@/app/usePageTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Loader } from "@/components/ui/Feedback";
import { formatDate, formatSalary, jobLocation, statusTone } from "@/lib/utils";

export function ApplicationsPage() {
  usePageTitle("Applications");
  const [filter, setFilter] = useState<ApplicationStatus | "">("");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["applications", filter],
    queryFn: () => applicationsApi.list({ status: filter || undefined }),
  });

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every role you've applied to, and where it stands."
      />

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        <FilterChip active={filter === ""} onClick={() => setFilter("")}>
          All
        </FilterChip>
        {(Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).map((status) => (
          <FilterChip
            key={status}
            active={filter === status}
            onClick={() => setFilter(status)}
          >
            {APPLICATION_STATUS_LABELS[status]}
          </FilterChip>
        ))}
      </div>

      {isPending ? (
        <Loader label="Loading applications…" />
      ) : isError ? (
        <ErrorState title="Couldn't load your applications" onRetry={() => refetch()} />
      ) : data.results.length === 0 ? (
        <EmptyState
          title={filter ? "Nothing with that status" : "No applications yet"}
          description={
            filter
              ? "Try a different status filter."
              : "When you apply to a role it'll show up here."
          }
          action={
            <Button asChild variant={filter ? "secondary" : "primary"}>
              <Link to={filter ? "/applications" : "/matches"}>
                {filter ? "Show all" : "See my matches"}
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.results.map((application) => (
            <ApplicationRow key={application.id} application={application} />
          ))}
        </ul>
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--accent-contrast)]"
          : "rounded-full border px-3 py-1.5 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-sunken)]"
      }
    >
      {children}
    </button>
  );
}

function ApplicationRow({ application }: { application: Application }) {
  const { job } = application;
  const salary = formatSalary(job);

  return (
    <li className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">
            <Link to={`/jobs/${job.id}`} className="hover:text-[var(--accent)]">
              {job.job_title}
            </Link>
          </h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {job.company_name} · {jobLocation(job)}
          </p>
        </div>
        <Badge tone={statusTone(application.status)}>
          {application.status_display}
        </Badge>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-[var(--text-subtle)]">Applied</dt>
          <dd className="mt-0.5">{formatDate(application.applied_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-subtle)]">Salary</dt>
          <dd className="mt-0.5">{salary ?? "Not disclosed"}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-subtle)]">Your match</dt>
          <dd className="mt-0.5">
            {application.match_score != null
              ? `${Math.round(application.match_score * 100)}%`
              : "Not scored"}
          </dd>
        </div>
      </dl>

      {application.cover_note && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            Your cover note
          </summary>
          <p className="mt-2 whitespace-pre-line rounded-lg bg-[var(--surface-sunken)] p-3 text-sm text-[var(--text-muted)]">
            {application.cover_note}
          </p>
        </details>
      )}
    </li>
  );
}
