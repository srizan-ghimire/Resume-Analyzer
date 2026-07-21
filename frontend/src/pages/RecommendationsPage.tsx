import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { ApiError } from "@/api/client";
import { matching } from "@/api/endpoints";
import { usePageTitle } from "@/app/usePageTitle";
import { JobCard } from "@/components/jobs/JobCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui/Feedback";

export function RecommendationsPage() {
  usePageTitle("My matches");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => matching.recommendations(20),
  });

  // A missing or unreadable resume is a 400 with an explanation. The old page
  // rendered nothing at all in this case.
  const needsResume =
    error instanceof ApiError && Boolean(error.fieldError("resume"));

  if (isPending) {
    return (
      <>
        <PageHeader title="My matches" />
        <SkeletonGrid count={6} />
      </>
    );
  }

  if (needsResume) {
    return (
      <>
        <PageHeader title="My matches" />
        <EmptyState
          title="Upload a resume first"
          description={
            (error as ApiError).fieldError("resume") ??
            "We need a resume to match you against open roles."
          }
          action={
            <Button asChild>
              <Link to="/resume">Upload my resume</Link>
            </Button>
          }
        />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="My matches" />
        <ErrorState
          title="Couldn't load your matches"
          description="The server didn't respond."
          onRetry={() => refetch()}
        />
      </>
    );
  }

  const results = data.results;

  return (
    <>
      <PageHeader
        title="My matches"
        description="Open roles ranked against your resume, with the reasons shown."
        actions={
          <Button variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      {results.length === 0 ? (
        <EmptyState
          title="No matches yet"
          description="There are no open roles to match against right now. Check back soon."
          action={
            <Button asChild variant="secondary">
              <Link to="/jobs">Browse all jobs</Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            {results.length} {results.length === 1 ? "role" : "roles"}, best first
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((recommendation) => (
              <JobCard
                key={recommendation.job.id}
                job={recommendation.job}
                matchPercentage={recommendation.match_percentage}
                matchedSkills={recommendation.matched_skills}
                hasApplied={recommendation.has_applied}
                footer={
                  recommendation.missing_skills.length > 0 ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-[var(--text-subtle)] hover:text-[var(--text)]">
                        {recommendation.missing_skills.length} missing
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {recommendation.missing_skills.slice(0, 8).map((skill) => (
                          <Badge key={skill} tone="warn">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </details>
                  ) : undefined
                }
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
