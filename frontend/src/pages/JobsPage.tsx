import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { jobs as jobsApi, type JobFilters } from "@/api/endpoints";
import { JOB_TYPE_LABELS, type JobType } from "@/api/types";
import { usePageTitle } from "@/app/usePageTitle";
import { JobCard } from "@/components/jobs/JobCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui/Feedback";
import { Field, Input, Select } from "@/components/ui/Field";

const PAGE_SIZE = 12;

export function JobsPage() {
  usePageTitle("Browse jobs");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [jobType, setJobType] = useState<JobType | "">("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Debounce so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters: JobFilters = {
    search: debouncedSearch || undefined,
    job_type: jobType || undefined,
    is_remote: remoteOnly || undefined,
    page,
    page_size: PAGE_SIZE,
  };

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => jobsApi.list(filters),
    placeholderData: keepPreviousData,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const hasFilters = Boolean(debouncedSearch || jobType || remoteOnly);

  const clearFilters = () => {
    setSearch("");
    setJobType("");
    setRemoteOnly(false);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Browse jobs"
        description="Every open role posted on Resumatch."
      />

      {/* A real form, so Enter submits. The old search had a dead button. */}
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setDebouncedSearch(search);
          setPage(1);
        }}
        className="surface-card mb-6 grid gap-4 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      >
        <Field label="Search" htmlFor="job-search">
          {({ id }) => (
            <Input
              id={id}
              type="search"
              placeholder="Job title, company or keyword"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          )}
        </Field>

        <Field label="Type" htmlFor="job-type" className="sm:w-44">
          {({ id }) => (
            <Select
              id={id}
              value={jobType}
              onChange={(event) => {
                setJobType(event.target.value as JobType | "");
                setPage(1);
              }}
            >
              <option value="">All types</option>
              {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(event) => {
              setRemoteOnly(event.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
          />
          Remote only
        </label>
      </form>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-[var(--text-muted)]">
          {isPending
            ? "Searching…"
            : `${data?.count.toLocaleString() ?? 0} ${
                data?.count === 1 ? "role" : "roles"
              }`}
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {isPending ? (
        <SkeletonGrid count={6} />
      ) : isError ? (
        <ErrorState
          title="Couldn't load jobs"
          description="The server didn't respond. It may be starting up."
          onRetry={() => refetch()}
        />
      ) : data.results.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No roles match those filters" : "No open roles yet"}
          description={
            hasFilters
              ? "Try a broader search or clear the filters."
              : "Check back soon — new postings appear here as recruiters publish them."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
              isFetching ? "opacity-60 transition-opacity" : ""
            }`}
          >
            {data.results.map((job) => (
              <JobCard key={job.id} job={job} hasApplied={job.has_applied} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-center gap-3"
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-[var(--text-muted)]">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
