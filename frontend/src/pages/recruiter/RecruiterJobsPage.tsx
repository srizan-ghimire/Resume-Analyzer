import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { jobs as jobsApi } from "@/api/endpoints";
import { JOB_TYPE_LABELS, type Job } from "@/api/types";
import { usePageTitle } from "@/app/usePageTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { EmptyState, ErrorState, Loader } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatSalary, jobLocation } from "@/lib/utils";

export function RecruiterJobsPage() {
  usePageTitle("My postings");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["jobs", "mine"],
    queryFn: () => jobsApi.list({ mine: true, page_size: 100 }),
  });

  const openJobs = data?.results.filter((job) => job.is_open) ?? [];
  const closedJobs = data?.results.filter((job) => !job.is_open) ?? [];

  return (
    <>
      <PageHeader
        title="My postings"
        description="Publish roles and review the people who applied."
        actions={
          <Button asChild>
            <Link to="/recruiter/jobs/new">Post a job</Link>
          </Button>
        }
      />

      {isPending ? (
        <Loader label="Loading your postings…" />
      ) : isError ? (
        <ErrorState title="Couldn't load your postings" onRetry={() => refetch()} />
      ) : data.results.length === 0 ? (
        <EmptyState
          title="No postings yet"
          description="Publish your first role and start receiving scored applicants."
          action={
            <Button asChild>
              <Link to="/recruiter/jobs/new">Post a job</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
              Open ({openJobs.length})
            </h2>
            {openJobs.length === 0 ? (
              <p className="text-sm text-[var(--text-subtle)]">
                Nothing open right now.
              </p>
            ) : (
              <ul className="space-y-3">
                {openJobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </ul>
            )}
          </section>

          {closedJobs.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
                Closed ({closedJobs.length})
              </h2>
              <ul className="space-y-3">
                {closedJobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function JobRow({ job }: { job: Job }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const close = useMutation({
    mutationFn: () => jobsApi.close(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setConfirmOpen(false);
      toast.success("Posting closed", "Applicants keep their history.");
    },
    onError: () => toast.error("Couldn't close that posting"),
  });

  const applicants = job.application_count ?? 0;

  return (
    <li className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">
            <Link to={`/jobs/${job.id}`} className="hover:text-[var(--accent)]">
              {job.job_title}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {jobLocation(job)} · {JOB_TYPE_LABELS[job.job_type ?? "FULL_TIME"]}
          </p>
        </div>
        <Badge tone={job.is_open ? "ok" : "neutral"}>
          {job.is_open ? "Open" : "Closed"}
        </Badge>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-[var(--text-subtle)]">Applicants</dt>
          <dd className="mt-0.5 font-semibold">{applicants}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-subtle)]">Salary</dt>
          <dd className="mt-0.5">{formatSalary(job) ?? "Not disclosed"}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-subtle)]">Posted</dt>
          <dd className="mt-0.5">{formatDate(job.posted_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-subtle)]">Closes</dt>
          <dd className="mt-0.5">
            {job.expiry_time ? formatDate(job.expiry_time) : "No deadline"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        <Button asChild size="sm">
          <Link to={`/recruiter/jobs/${job.id}/applicants`}>
            Review applicants{applicants > 0 ? ` (${applicants})` : ""}
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to={`/recruiter/jobs/${job.id}/edit`}>Edit</Link>
        </Button>
        {job.is_open && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--danger)]"
            onClick={() => setConfirmOpen(true)}
          >
            Close
          </Button>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          title={`Close "${job.job_title}"?`}
          description="It stops accepting applications and disappears from search. Existing applicants and their statuses are kept."
        >
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="danger" loading={close.isPending} onClick={() => close.mutate()}>
              Close posting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
