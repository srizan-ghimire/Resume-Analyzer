import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { ApplicationStatus, JobSummary } from "@/api/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Single salary formatter. Previously this logic was duplicated across three
 * components with three different behaviours, one of which hardcoded "NPR"
 * onto a raw unformatted number.
 */
export function formatSalary(job: {
  salary_min?: string | number | null;
  salary_max?: string | number | null;
  salary_currency?: string;
}): string | null {
  const min = job.salary_min == null ? null : Number(job.salary_min);
  const max = job.salary_max == null ? null : Number(job.salary_max);
  if (min == null && max == null) return null;

  const currency = job.salary_currency || "USD";
  const format = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      // Unknown currency code: fall back to plain grouping.
      return `${currency} ${value.toLocaleString()}`;
    }
  };

  if (min != null && max != null) return `${format(min)} – ${format(max)}`;
  return min != null ? `From ${format(min)}` : `Up to ${format(max!)}`;
}

/**
 * Split free-text requirements into lines.
 *
 * The old code called `.split("\\r\\n")` unguarded in two places -- it crashed
 * on null and rendered LF-delimited text as one giant bullet.
 */
export function toLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n|•/)
    .map((line) => line.replace(/^[-*\s]+/, "").trim())
    .filter(Boolean);
}

export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diffSeconds = Math.round((then - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
  ];

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return "just now";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function jobLocation(job: Pick<JobSummary, "location" | "is_remote">): string {
  if (job.is_remote) return job.location ? `Remote · ${job.location}` : "Remote";
  return job.location || "Location not specified";
}

export type BadgeTone = "neutral" | "accent" | "ok" | "warn" | "danger";

/** Shared by the seeker's application list and the recruiter's applicant list. */
export function statusTone(status: ApplicationStatus): BadgeTone {
  switch (status) {
    case "ACCEPTED":
      return "ok";
    case "REJECTED":
      return "danger";
    case "SHORTLISTED":
      return "accent";
    case "IN_REVIEW":
      return "warn";
    default:
      return "neutral";
  }
}
