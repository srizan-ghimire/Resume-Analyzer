import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, tokenStore } from "@/api/client";
import { applications as applicationsApi, jobs as jobsApi } from "@/api/endpoints";
import {
  APPLICATION_STATUS_LABELS,
  type Applicant,
  type ApplicationStatus,
} from "@/api/types";
import { usePageTitle } from "@/app/usePageTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { EmptyState, ErrorState, Loader } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { formatDate, statusTone } from "@/lib/utils";

export function ApplicantsPage() {
  const { jobId } = useParams();
  const id = Number(jobId);

  const job = useQuery({
    queryKey: ["job", id],
    queryFn: () => jobsApi.get(id),
    enabled: Number.isFinite(id),
  });

  const applicants = useQuery({
    queryKey: ["applicants", id],
    queryFn: () => jobsApi.applicants(id),
    enabled: Number.isFinite(id),
  });

  usePageTitle(job.data ? `Applicants · ${job.data.job_title}` : "Applicants");

  if (!Number.isFinite(id)) {
    return <ErrorState title="Invalid link" description="That job ID isn't valid." />;
  }

  const forbidden =
    applicants.error instanceof ApiError && applicants.error.status === 403;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
        <Link to="/recruiter/jobs">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          All postings
        </Link>
      </Button>

      <PageHeader
        title={job.data ? job.data.job_title : "Applicants"}
        description={
          job.data
            ? `${job.data.company_name} · sorted by match score`
            : "Loading…"
        }
        actions={
          job.data && (
            <Button asChild variant="secondary">
              <Link to={`/recruiter/jobs/${id}/edit`}>Edit posting</Link>
            </Button>
          )
        }
      />

      {applicants.isPending ? (
        <Loader label="Loading applicants…" />
      ) : forbidden ? (
        <ErrorState
          title="Not your posting"
          description="You can only review applicants for jobs you posted."
        />
      ) : applicants.isError ? (
        <ErrorState
          title="Couldn't load applicants"
          onRetry={() => applicants.refetch()}
        />
      ) : applicants.data.results.length === 0 ? (
        <EmptyState
          title="No applicants yet"
          description="When someone applies, they'll appear here with their match score and resume."
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            {applicants.data.count}{" "}
            {applicants.data.count === 1 ? "applicant" : "applicants"}
          </p>
          <ul className="space-y-3">
            {applicants.data.results.map((applicant) => (
              <ApplicantRow key={applicant.id} applicant={applicant} jobId={id} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function ApplicantRow({ applicant, jobId }: { applicant: Applicant; jobId: number }) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: (status: ApplicationStatus) =>
      applicationsApi.updateStatus(applicant.id, status),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["applicants", jobId] });
      toast.success(
        "Status updated",
        `${applicant.applicant_name} → ${APPLICATION_STATUS_LABELS[status]}`,
      );
    },
    onError: () => toast.error("Couldn't update that application"),
  });

  const score =
    applicant.match_score != null ? Math.round(applicant.match_score * 100) : null;

  return (
    <li className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
            {applicant.applicant_name.charAt(0).toUpperCase() || "?"}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold">
              {applicant.applicant_name || applicant.applicant_username}
            </h3>
            <a
              href={`mailto:${applicant.applicant_email}`}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              {applicant.applicant_email}
            </a>
            <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
              Applied {formatDate(applicant.applied_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {score != null && (
            <div className="text-right">
              <span className="block text-xl font-semibold text-[var(--accent)]">
                {score}%
              </span>
              <span className="text-xs text-[var(--text-subtle)]">match</span>
            </div>
          )}
          <Badge tone={statusTone(applicant.status ?? "SUBMITTED")}>
            {applicant.status_display}
          </Badge>
        </div>
      </div>

      {applicant.resume_skills.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-[var(--text-subtle)]">
            Skills from their resume
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {applicant.resume_skills.slice(0, 12).map((skill) => (
              <Badge key={skill}>{skill}</Badge>
            ))}
            {applicant.resume_skills.length > 12 && (
              <Badge>+{applicant.resume_skills.length - 12}</Badge>
            )}
          </div>
        </div>
      )}

      {applicant.cover_note && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            Cover note
          </summary>
          <p className="mt-2 whitespace-pre-line rounded-lg bg-[var(--surface-sunken)] p-3 text-sm text-[var(--text-muted)]">
            {applicant.cover_note}
          </p>
        </details>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
        <label htmlFor={`status-${applicant.id}`} className="text-sm font-medium">
          Status
        </label>
        <Select
          id={`status-${applicant.id}`}
          className="h-9 w-44"
          value={applicant.status ?? "SUBMITTED"}
          disabled={updateStatus.isPending}
          onChange={(event) =>
            updateStatus.mutate(event.target.value as ApplicationStatus)
          }
        >
          {(Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).map(
            (status) => (
              <option key={status} value={status}>
                {APPLICATION_STATUS_LABELS[status]}
              </option>
            ),
          )}
        </Select>

        {applicant.resume_url && (
          <ResumeDownloadButton
            url={applicant.resume_url}
            name={applicant.applicant_name || applicant.applicant_username}
          />
        )}
      </div>
    </li>
  );
}

/**
 * Resume downloads are permission-checked server side, so a plain <a href>
 * would 401 -- the token has to travel in the header. Fetch as a blob and hand
 * the object URL to the browser.
 */
function ResumeDownloadButton({ url, name }: { url: string; name: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${tokenStore.access ?? ""}` },
      });
      if (!response.ok) throw new Error(String(response.status));

      const blobUrl = URL.createObjectURL(await response.blob());
      const opened = window.open(blobUrl, "_blank", "noopener");
      if (!opened) {
        // Popup blocked: fall back to a direct download.
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${name.replace(/\s+/g, "_")}_resume.pdf`;
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      toast.error("Couldn't open that resume", "It may have been deleted.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" loading={busy} onClick={open}>
      View resume
    </Button>
  );
}
