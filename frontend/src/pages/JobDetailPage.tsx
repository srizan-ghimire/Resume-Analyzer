import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "@/api/client";
import { applications, jobs as jobsApi } from "@/api/endpoints";
import { JOB_TYPE_LABELS } from "@/api/types";
import { useAuth } from "@/app/AuthProvider";
import { usePageTitle } from "@/app/usePageTitle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Field";
import { ErrorState, Loader } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatSalary, jobLocation, toLines } from "@/lib/utils";

export function JobDetailPage() {
  const { jobId } = useParams();
  const id = Number(jobId);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isSeeker, isAuthenticated } = useAuth();

  const [applyOpen, setApplyOpen] = useState(false);
  const [coverNote, setCoverNote] = useState("");

  const { data: job, isPending, isError, error, refetch } = useQuery({
    queryKey: ["job", id],
    queryFn: () => jobsApi.get(id),
    enabled: Number.isFinite(id),
  });

  usePageTitle(job ? `${job.job_title} at ${job.company_name}` : "Job");

  const apply = useMutation({
    mutationFn: () => applications.apply(id, coverNote),
    onSuccess: () => {
      toast.success("Application sent", `You applied to ${job?.job_title}.`);
      setApplyOpen(false);
      setCoverNote("");
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (mutationError) => {
      toast.error(
        "Couldn't apply",
        mutationError instanceof ApiError
          ? mutationError.message
          : "Please try again in a moment.",
      );
    },
  });

  if (!Number.isFinite(id)) {
    return <ErrorState title="Invalid job link" description="That job ID isn't valid." />;
  }
  if (isPending) return <Loader label="Loading role…" />;
  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <ErrorState
        title={notFound ? "Job not found" : "Couldn't load this job"}
        description={
          notFound
            ? "It may have been closed or removed."
            : "The server didn't respond."
        }
        onRetry={notFound ? undefined : () => refetch()}
      />
    );
  }

  const salary = formatSalary(job);
  const requirements = toLines(job.job_requirements);
  const closed = !job.is_open;

  return (
    <article className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" className="-ml-3 mb-4" onClick={() => navigate(-1)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </Button>

      <header className="surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{job.job_title}</h1>
            <p className="mt-1 text-[var(--text-muted)]">{job.company_name}</p>
          </div>
          {closed && <Badge tone="danger">Closed</Badge>}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge>{JOB_TYPE_LABELS[job.job_type ?? "FULL_TIME"]}</Badge>
          <Badge>{jobLocation(job)}</Badge>
          {job.has_applied && <Badge tone="ok">Applied</Badge>}
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-[var(--text-subtle)]">Salary</dt>
            <dd className="mt-0.5 text-sm font-medium">{salary ?? "Not disclosed"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-subtle)]">Posted</dt>
            <dd className="mt-0.5 text-sm font-medium">{formatDate(job.posted_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-subtle)]">Closes</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {job.expiry_time ? formatDate(job.expiry_time) : "No deadline"}
            </dd>
          </div>
        </dl>

        {/* flex-wrap: these controls used to collide on narrow screens. */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-5">
          {!isAuthenticated ? (
            <>
              <Button asChild>
                <Link to="/login" state={{ from: { pathname: `/jobs/${id}` } }}>
                  Sign in to apply
                </Link>
              </Button>
              <p className="text-sm text-[var(--text-muted)]">
                Free account, takes a minute.
              </p>
            </>
          ) : !isSeeker ? (
            <p className="text-sm text-[var(--text-muted)]">
              You're signed in as a recruiter, so you can't apply to roles.
            </p>
          ) : job.has_applied ? (
            <>
              <Button disabled>Applied</Button>
              <Button asChild variant="ghost">
                <Link to="/applications">Track this application</Link>
              </Button>
            </>
          ) : closed ? (
            <Button disabled>Applications closed</Button>
          ) : (
            <>
              <Button onClick={() => setApplyOpen(true)}>Apply now</Button>
              <Button asChild variant="secondary">
                <Link to="/ats" state={{ jobDescription: job.job_description }}>
                  Check my resume against this
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <section className="surface-card mt-6 p-6">
        <h2 className="text-lg font-semibold">About the role</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--text-muted)]">
          {job.job_description}
        </p>
      </section>

      {requirements.length > 0 && (
        <section className="surface-card mt-6 p-6">
          <h2 className="text-lg font-semibold">Requirements</h2>
          <ul className="mt-3 space-y-2">
            {requirements.map((line, index) => (
              <li
                key={`${index}-${line.slice(0, 24)}`}
                className="flex gap-3 text-sm leading-relaxed text-[var(--text-muted)]"
              >
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      {job.skills && job.skills.length > 0 && (
        <section className="surface-card mt-6 p-6">
          <h2 className="text-lg font-semibold">Skills mentioned</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.skills.map((skill) => (
              <Badge key={skill} tone="accent">
                {skill}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent
          title={`Apply to ${job.job_title}`}
          description="Your primary resume is attached automatically."
        >
          <label htmlFor="cover-note" className="block text-sm font-medium">
            Cover note <span className="text-[var(--text-subtle)]">(optional)</span>
          </label>
          <Textarea
            id="cover-note"
            className="mt-2"
            rows={5}
            maxLength={2000}
            placeholder="Why you're a good fit for this role…"
            value={coverNote}
            onChange={(event) => setCoverNote(event.target.value)}
          />
          <p className="mt-1 text-xs text-[var(--text-subtle)]">
            {coverNote.length}/2000
          </p>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button loading={apply.isPending} onClick={() => apply.mutate()}>
              Send application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
