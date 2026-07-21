import { Link } from "react-router-dom";

import { JOB_TYPE_LABELS, type Job, type JobSummary } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { cn, formatRelativeDate, formatSalary, jobLocation } from "@/lib/utils";

interface JobCardProps {
  job: Job | JobSummary;
  /** Match percentage from a recommendation, when shown in that context. */
  matchPercentage?: number;
  matchedSkills?: string[];
  hasApplied?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * The one job card.
 *
 * Previously this markup existed four times: JobCard, an unused
 * RecommendationJobCard, and twice inline in RecommendJob. The whole card is a
 * link, so it is keyboard reachable and openable in a new tab -- the old one
 * was a div with onClick.
 */
export function JobCard({
  job,
  matchPercentage,
  matchedSkills,
  hasApplied,
  footer,
  className,
}: JobCardProps) {
  const salary = formatSalary(job);
  const skills = "skills" in job ? job.skills : undefined;

  return (
    <article
      className={cn(
        "surface-card group flex flex-col p-5 transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">
            <Link
              to={`/jobs/${job.id}`}
              className="after:absolute after:inset-0 hover:text-[var(--accent)]"
            >
              {job.job_title}
            </Link>
          </h3>
          <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
            {job.company_name}
          </p>
        </div>

        {matchPercentage !== undefined && (
          <div className="shrink-0 text-right">
            <span className="block text-xl font-semibold text-[var(--accent)]">
              {matchPercentage}%
            </span>
            <span className="text-xs text-[var(--text-subtle)]">match</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge>{JOB_TYPE_LABELS[job.job_type ?? "FULL_TIME"]}</Badge>
        <Badge>{jobLocation(job)}</Badge>
        {hasApplied && <Badge tone="ok">Applied</Badge>}
      </div>

      {salary && (
        <p className="mt-3 text-sm font-medium text-[var(--text)]">{salary}</p>
      )}

      {matchedSkills && matchedSkills.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-[var(--text-subtle)]">
            Your matching skills
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {matchedSkills.slice(0, 5).map((skill) => (
              <Badge key={skill} tone="accent">
                {skill}
              </Badge>
            ))}
            {matchedSkills.length > 5 && (
              <Badge>+{matchedSkills.length - 5} more</Badge>
            )}
          </div>
        </div>
      )}

      {!matchedSkills && skills && skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((skill) => (
            <Badge key={skill}>{skill}</Badge>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <p className="text-xs text-[var(--text-subtle)]">
          {formatRelativeDate(job.posted_at)}
        </p>
        {/* relative z-10 keeps controls clickable above the card-wide link. */}
        {footer && <div className="relative z-10">{footer}</div>}
      </div>
    </article>
  );
}
