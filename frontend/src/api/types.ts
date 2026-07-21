/**
 * Named aliases over the generated OpenAPI schema.
 *
 * `schema.d.ts` is generated -- never edit it by hand. Regenerate with:
 *   npm run gen:api        (requires the backend running on :8000)
 */
import type { components } from "./schema";

type S = components["schemas"];

export type User = S["User"];
export type Role = S["RoleEnum"];
export type RecruiterProfile = S["RecruiterProfile"];
export type AuthTokens = S["AuthTokenResponse"];

export type Job = S["Job"];
export type JobSummary = S["JobSummary"];
export type JobRequest = S["JobRequest"];
export type JobType = S["JobTypeEnum"];

export type Application = S["Application"];
export type Applicant = S["Applicant"];
export type ApplicationStatus = S["StatusEnum"];

export type Resume = S["Resume"];

export type Recommendation = S["Recommendation"];
export type AtsReport = S["AtsReport"];
export type AtsCheck = S["Check"];
export type CheckSeverity = S["SeverityEnum"];
export type SkillGap = S["SkillGap"];

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** The uniform error envelope produced by api/exceptions.py. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[] | string>;
  };
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  INTERN: "Internship",
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  TEMPORARY: "Temporary",
  CONTRACT: "Contract",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "Submitted",
  IN_REVIEW: "In review",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
  ACCEPTED: "Accepted",
};
