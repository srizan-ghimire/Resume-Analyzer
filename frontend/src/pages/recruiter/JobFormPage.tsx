import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { ApiError } from "@/api/client";
import { jobs as jobsApi } from "@/api/endpoints";
import { JOB_TYPE_LABELS, type JobType } from "@/api/types";
import { useAuth } from "@/app/AuthProvider";
import { usePageTitle } from "@/app/usePageTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ErrorState, Loader } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";

const schema = z
  .object({
    job_title: z.string().trim().min(2, "Enter a job title"),
    company_name: z.string().trim().min(1, "Enter the company name"),
    location: z.string().trim().min(1, "Enter a location"),
    is_remote: z.boolean(),
    job_type: z.enum(["INTERN", "FULL_TIME", "PART_TIME", "TEMPORARY", "CONTRACT"]),
    salary_min: z.string().optional(),
    salary_max: z.string().optional(),
    salary_currency: z.string().trim().length(3, "Use a 3-letter code").or(z.literal("")),
    job_description: z.string().trim().min(30, "Describe the role in at least 30 characters"),
    job_requirements: z.string().optional(),
    expiry_date: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.salary_min ||
      !data.salary_max ||
      Number(data.salary_min) <= Number(data.salary_max),
    { message: "Minimum cannot exceed the maximum", path: ["salary_min"] },
  )
  .refine((data) => !data.expiry_date || new Date(data.expiry_date) > new Date(), {
    message: "Pick a future date",
    path: ["expiry_date"],
  });

type FormValues = z.infer<typeof schema>;

export function JobFormPage() {
  const { jobId } = useParams();
  const isEdit = Boolean(jobId);
  const id = Number(jobId);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  usePageTitle(isEdit ? "Edit posting" : "Post a job");

  const existing = useQuery({
    queryKey: ["job", id],
    queryFn: () => jobsApi.get(id),
    enabled: isEdit && Number.isFinite(id),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      is_remote: false,
      job_type: "FULL_TIME",
      salary_currency: "USD",
      company_name: user?.recruiter_profile?.company_name ?? "",
    },
  });

  // Populate once the existing posting arrives.
  useEffect(() => {
    if (!existing.data) return;
    const job = existing.data;
    reset({
      job_title: job.job_title,
      company_name: job.company_name,
      location: job.location,
      is_remote: job.is_remote ?? false,
      job_type: (job.job_type ?? "FULL_TIME") as JobType,
      salary_min: job.salary_min != null ? String(job.salary_min) : "",
      salary_max: job.salary_max != null ? String(job.salary_max) : "",
      salary_currency: job.salary_currency ?? "USD",
      job_description: job.job_description,
      job_requirements: job.job_requirements ?? "",
      expiry_date: job.expiry_time ? job.expiry_time.slice(0, 10) : "",
    });
  }, [existing.data, reset]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        job_title: values.job_title,
        company_name: values.company_name,
        location: values.location,
        is_remote: values.is_remote,
        job_type: values.job_type,
        salary_min: values.salary_min ? values.salary_min : null,
        salary_max: values.salary_max ? values.salary_max : null,
        salary_currency: values.salary_currency || "USD",
        job_description: values.job_description,
        job_requirements: values.job_requirements ?? "",
        // Date input gives a day; send end-of-day so the role stays open on it.
        expiry_time: values.expiry_date
          ? new Date(`${values.expiry_date}T23:59:59`).toISOString()
          : null,
      };
      return isEdit ? jobsApi.update(id, payload) : jobsApi.create(payload);
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job", job.id] });
      toast.success(isEdit ? "Posting updated" : "Job published");
      navigate("/recruiter/jobs");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        let matched = false;
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field === "expiry_time") {
            setError("expiry_date", { message });
            matched = true;
          } else if (field in schema.shape) {
            setError(field as keyof FormValues, { message });
            matched = true;
          }
        }
        if (!matched) setFormError(error.message);
      } else {
        setFormError("Couldn't save. Check your connection.");
      }
    },
  });

  if (isEdit && existing.isPending) return <Loader label="Loading posting…" />;
  if (isEdit && existing.isError) {
    return (
      <ErrorState
        title="Couldn't load that posting"
        description="It may have been removed, or it isn't yours."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={isEdit ? "Edit posting" : "Post a job"}
        description="Requirements drive matching — list the concrete skills you need."
      />

      <form
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          save.mutate(values);
        })}
        noValidate
        className="surface-card space-y-5 p-6"
      >
        {formError && (
          <p role="alert" className="text-sm font-medium text-[var(--danger)]">
            {formError}
          </p>
        )}

        <Field label="Job title" htmlFor="job_title" error={errors.job_title?.message} required>
          {({ id: fieldId, describedBy, invalid }) => (
            <Input id={fieldId} placeholder="Senior Data Scientist" aria-invalid={invalid} aria-describedby={describedBy} {...register("job_title")} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="company_name" error={errors.company_name?.message} required>
            {({ id: fieldId, describedBy, invalid }) => (
              <Input id={fieldId} aria-invalid={invalid} aria-describedby={describedBy} {...register("company_name")} />
            )}
          </Field>
          <Field label="Location" htmlFor="location" error={errors.location?.message} required>
            {({ id: fieldId, describedBy, invalid }) => (
              <Input id={fieldId} placeholder="Berlin, Germany" aria-invalid={invalid} aria-describedby={describedBy} {...register("location")} />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <Field label="Employment type" htmlFor="job_type" error={errors.job_type?.message}>
            {({ id: fieldId }) => (
              <Select id={fieldId} {...register("job_type")}>
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
              className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
              {...register("is_remote")}
            />
            This role is remote
          </label>
        </div>

        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-medium">Salary range (optional)</legend>
          <Field label="Minimum" htmlFor="salary_min" error={errors.salary_min?.message}>
            {({ id: fieldId, describedBy, invalid }) => (
              <Input id={fieldId} type="number" min={0} step={1000} aria-invalid={invalid} aria-describedby={describedBy} {...register("salary_min")} />
            )}
          </Field>
          <Field label="Maximum" htmlFor="salary_max" error={errors.salary_max?.message}>
            {({ id: fieldId, describedBy, invalid }) => (
              <Input id={fieldId} type="number" min={0} step={1000} aria-invalid={invalid} aria-describedby={describedBy} {...register("salary_max")} />
            )}
          </Field>
          <Field label="Currency" htmlFor="salary_currency" error={errors.salary_currency?.message}>
            {({ id: fieldId, describedBy, invalid }) => (
              <Input id={fieldId} maxLength={3} placeholder="USD" className="uppercase" aria-invalid={invalid} aria-describedby={describedBy} {...register("salary_currency")} />
            )}
          </Field>
        </fieldset>

        <Field
          label="Description"
          htmlFor="job_description"
          error={errors.job_description?.message}
          hint="What the person will do, and what the team looks like."
          required
        >
          {({ id: fieldId, describedBy, invalid }) => (
            <Textarea id={fieldId} rows={7} aria-invalid={invalid} aria-describedby={describedBy} {...register("job_description")} />
          )}
        </Field>

        <Field
          label="Requirements"
          htmlFor="job_requirements"
          error={errors.job_requirements?.message}
          hint="One per line. These carry the most weight when matching candidates."
        >
          {({ id: fieldId, describedBy, invalid }) => (
            <Textarea
              id={fieldId}
              rows={6}
              placeholder={"5 years of Python\nStrong SQL and statistics\nExperience with Docker"}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              {...register("job_requirements")}
            />
          )}
        </Field>

        <Field
          label="Closing date"
          htmlFor="expiry_date"
          error={errors.expiry_date?.message}
          hint="Leave blank to keep it open indefinitely."
        >
          {({ id: fieldId, describedBy, invalid }) => (
            <Input id={fieldId} type="date" aria-invalid={invalid} aria-describedby={describedBy} {...register("expiry_date")} />
          )}
        </Field>

        <div className="flex flex-wrap gap-3 border-t pt-5">
          <Button type="submit" loading={isSubmitting || save.isPending}>
            {isEdit ? "Save changes" : "Publish job"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/recruiter/jobs")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
