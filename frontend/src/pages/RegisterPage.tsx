import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { ApiError } from "@/api/client";
import { useAuth } from "@/app/AuthProvider";
import { usePageTitle } from "@/app/usePageTitle";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    role: z.enum(["SEEKER", "RECRUITER"]),
    first_name: z.string().trim().min(1, "Enter your first name"),
    last_name: z.string().trim().min(1, "Enter your last name"),
    username: z
      .string()
      .trim()
      .min(3, "At least 3 characters")
      .max(50, "At most 50 characters")
      .regex(/^[\w.@+-]+$/, "Letters, digits and . @ + - _ only"),
    email: z.string().trim().email("Enter a valid email address"),
    company_name: z.string().trim().optional(),
    // Mirrors the backend's validators; the server remains the authority.
    password: z.string().min(8, "At least 8 characters"),
    password_confirm: z.string(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  })
  .refine((data) => data.role !== "RECRUITER" || Boolean(data.company_name), {
    message: "Company name is required for recruiter accounts",
    path: ["company_name"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  usePageTitle("Create an account");
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "SEEKER" },
  });

  const role = watch("role");

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await createAccount({
        username: values.username,
        email: values.email,
        password: values.password,
        password_confirm: values.password_confirm,
        first_name: values.first_name,
        last_name: values.last_name,
        role: values.role,
        company_name: values.company_name,
      });
      navigate(user.role === "RECRUITER" ? "/recruiter/jobs" : "/resume", {
        replace: true,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        // Surface server field errors on the matching inputs.
        let matched = false;
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in values) {
            setError(field as keyof FormValues, { message });
            matched = true;
          }
        }
        if (!matched) setFormError(error.message);
      } else {
        setFormError("Could not reach the server. Check your connection.");
      }
    }
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to use. No credit card, no spam."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
          >
            {formError}
          </div>
        )}

        <fieldset>
          <legend className="mb-2 block text-sm font-medium">I am a…</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["SEEKER", "Job seeker", "Find and apply to roles"],
                ["RECRUITER", "Recruiter", "Post jobs, review applicants"],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={cn(
                  "cursor-pointer rounded-lg border p-3 text-left transition-colors",
                  role === value
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] hover:bg-[var(--surface-sunken)]",
                )}
              >
                <input
                  type="radio"
                  value={value}
                  checked={role === value}
                  onChange={() => setValue("role", value, { shouldValidate: true })}
                  className="sr-only-focusable"
                  name="role"
                />
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="first_name" error={errors.first_name?.message} required>
            {({ id, describedBy, invalid }) => (
              <Input id={id} autoComplete="given-name" aria-invalid={invalid} aria-describedby={describedBy} {...register("first_name")} />
            )}
          </Field>
          <Field label="Last name" htmlFor="last_name" error={errors.last_name?.message} required>
            {({ id, describedBy, invalid }) => (
              <Input id={id} autoComplete="family-name" aria-invalid={invalid} aria-describedby={describedBy} {...register("last_name")} />
            )}
          </Field>
        </div>

        {role === "RECRUITER" && (
          <Field label="Company" htmlFor="company_name" error={errors.company_name?.message} required>
            {({ id, describedBy, invalid }) => (
              <Input id={id} autoComplete="organization" aria-invalid={invalid} aria-describedby={describedBy} {...register("company_name")} />
            )}
          </Field>
        )}

        <Field label="Username" htmlFor="username" error={errors.username?.message} required>
          {({ id, describedBy, invalid }) => (
            <Input id={id} autoComplete="username" aria-invalid={invalid} aria-describedby={describedBy} {...register("username")} />
          )}
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message} required>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="email" autoComplete="email" aria-invalid={invalid} aria-describedby={describedBy} {...register("email")} />
          )}
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 8 characters, not entirely numeric."
          required
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} autoComplete="new-password" aria-invalid={invalid} aria-describedby={describedBy} {...register("password")} />
          )}
        </Field>

        <Field label="Confirm password" htmlFor="password_confirm" error={errors.password_confirm?.message} required>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} autoComplete="new-password" aria-invalid={invalid} aria-describedby={describedBy} {...register("password_confirm")} />
          )}
        </Field>

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
