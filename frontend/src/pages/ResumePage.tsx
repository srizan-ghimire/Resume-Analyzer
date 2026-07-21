import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useDropzone, type DropzoneOptions } from "react-dropzone";
import { Link } from "react-router-dom";

import { ApiError } from "@/api/client";
import { resumes as resumesApi } from "@/api/endpoints";
import type { Resume } from "@/api/types";
import { usePageTitle } from "@/app/usePageTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Loader } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { cn, formatRelativeDate } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export function ResumePage() {
  usePageTitle("My resume");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumesApi.list(),
  });

  const upload = useMutation({
    mutationFn: (file: File) => resumesApi.upload(file),
    onSuccess: (resume) => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success(
        "Resume uploaded",
        `Found ${resume.extracted_skills?.length ?? 0} skills.`,
      );
    },
    onError: (error) => {
      // A resume the server can't read comes back as 422 with the reason.
      const message =
        error instanceof ApiError ? error.message : "Upload failed. Please try again.";
      setLocalError(message);
      toast.error("Couldn't process that file", message);
    },
  });

  const onDrop = useCallback<NonNullable<DropzoneOptions["onDrop"]>>(
    (accepted, rejected) => {
      setLocalError(null);

      if (rejected.length > 0) {
        const codes = rejected[0].errors.map((e) => e.code);
        setLocalError(
          codes.includes("file-too-large")
            ? `That file is larger than ${MAX_BYTES / 1024 / 1024} MB.`
            : "Only PDF and DOCX resumes are supported.",
        );
        return;
      }
      if (accepted[0]) upload.mutate(accepted[0]);
    },
    [upload],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_BYTES,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: upload.isPending,
  });

  const resumeList = data?.results ?? [];
  const primary = resumeList.find((r) => r.is_primary) ?? resumeList[0];

  return (
    <>
      <PageHeader
        title="My resume"
        description="Upload once. We parse it here, so scoring is instant afterwards."
      />

      <div
        {...getRootProps()}
        className={cn(
          "surface-card border-2 border-dashed p-8 text-center transition-colors sm:p-12",
          isDragActive && "border-[var(--accent)] bg-[var(--accent-soft)]",
          upload.isPending && "opacity-60",
        )}
      >
        {/* The input carries the accessible name; the button opens the picker. */}
        <input {...getInputProps()} aria-label="Choose a resume file to upload" />

        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5-5 5 5M12 5v12" />
          </svg>
        </div>

        <p className="mt-4 font-medium">
          {isDragActive ? "Drop it here" : "Drag your resume here"}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          PDF or DOCX, up to 5 MB
        </p>

        <Button
          type="button"
          className="mt-5"
          onClick={open}
          loading={upload.isPending}
        >
          {upload.isPending ? "Processing…" : "Choose file"}
        </Button>

        {localError && (
          <p role="alert" className="mt-4 text-sm font-medium text-[var(--danger)]">
            {localError}
          </p>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Your uploads</h2>

        {isPending ? (
          <Loader label="Loading resumes…" />
        ) : isError ? (
          <ErrorState title="Couldn't load your resumes" onRetry={() => refetch()} />
        ) : resumeList.length === 0 ? (
          <EmptyState
            title="No resume yet"
            description="Upload one above to unlock ATS scoring and job matches."
          />
        ) : (
          <ul className="space-y-3">
            {resumeList.map((resume) => (
              <ResumeRow key={resume.id} resume={resume} />
            ))}
          </ul>
        )}
      </section>

      {primary?.is_parsed && (
        <section className="surface-card mt-8 p-6">
          <h2 className="text-lg font-semibold">Skills we found</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            These drive your match scores. If something's missing, name it
            explicitly in a skills section.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(primary.extracted_skills ?? []).map((skill) => (
              <Badge key={skill} tone="accent">
                {skill}
              </Badge>
            ))}
          </div>
          {(primary.extracted_education ?? []).length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-medium">Education</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {primary.extracted_education!.map((item) => (
                  <Badge key={item}>{item}</Badge>
                ))}
              </div>
            </>
          )}
          <div className="mt-6 flex flex-wrap gap-3 border-t pt-5">
            <Button asChild>
              <Link to="/matches">See my matches</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/ats">Run an ATS check</Link>
            </Button>
          </div>
        </section>
      )}
    </>
  );
}

function ResumeRow({ resume }: { resume: Resume }) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["resumes"] });
    queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  };

  const setPrimary = useMutation({
    mutationFn: () => resumesApi.setPrimary(resume.id),
    onSuccess: () => {
      invalidate();
      toast.success("Primary resume updated");
    },
    onError: () => toast.error("Couldn't update your primary resume"),
  });

  const remove = useMutation({
    mutationFn: () => resumesApi.remove(resume.id),
    onSuccess: () => {
      invalidate();
      toast.success("Resume deleted");
    },
    onError: () => toast.error("Couldn't delete that resume"),
  });

  return (
    <li className="surface-card flex flex-wrap items-center gap-4 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--surface-sunken)] text-[var(--text-muted)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {resume.original_filename || `Resume #${resume.id}`}
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
          {formatRelativeDate(resume.uploaded_at)}
          {resume.is_parsed && ` · ${resume.skill_count} skills`}
        </p>
        {!resume.is_parsed && resume.parse_error && (
          <p role="alert" className="mt-1 text-xs text-[var(--danger)]">
            {resume.parse_error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {resume.is_primary ? (
          <Badge tone="ok">Primary</Badge>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            loading={setPrimary.isPending}
            onClick={() => setPrimary.mutate()}
          >
            Make primary
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-[var(--danger)]"
          loading={remove.isPending}
          onClick={() => remove.mutate()}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}
