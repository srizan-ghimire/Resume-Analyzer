import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "@/api/client";
import { auth } from "@/api/endpoints";
import { useAuth } from "@/app/AuthProvider";
import { useTheme } from "@/app/ThemeProvider";
import { usePageTitle } from "@/app/usePageTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name"),
  last_name: z.string().trim().min(1, "Enter your last name"),
  email: z.string().trim().email("Enter a valid email address"),
  company_name: z.string().trim().optional(),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.new_password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export function SettingsPage() {
  usePageTitle("Settings");
  const { user, isRecruiter, refreshUser } = useAuth();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" description="Your account details and preferences." />
      <div className="space-y-6">
        <ProfileCard
          key={user?.id}
          user={user}
          isRecruiter={isRecruiter}
          onSaved={refreshUser}
        />
        <PasswordCard />
        <AppearanceCard />
      </div>
    </div>
  );
}

function ProfileCard({
  user,
  isRecruiter,
  onSaved,
}: {
  user: ReturnType<typeof useAuth>["user"];
  isRecruiter: boolean;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      email: user?.email ?? "",
      company_name: user?.recruiter_profile?.company_name ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await auth.updateProfile({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        ...(isRecruiter && values.company_name
          ? { recruiter_profile: { company_name: values.company_name } }
          : {}),
      });
      await onSaved();
      toast.success("Profile updated");
    } catch (error) {
      if (error instanceof ApiError) {
        let matched = false;
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in values) {
            setError(field as keyof z.infer<typeof profileSchema>, { message });
            matched = true;
          }
        }
        if (!matched) setFormError(error.message);
      } else {
        setFormError("Couldn't save. Check your connection.");
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="surface-card p-6">
      <h2 className="text-lg font-semibold">Profile</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Signed in as <span className="font-medium">{user?.username}</span> (
        {user?.role?.toLowerCase()}). Usernames can't be changed.
      </p>

      {formError && (
        <p role="alert" className="mt-4 text-sm font-medium text-[var(--danger)]">
          {formError}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name" error={errors.first_name?.message}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-invalid={invalid} aria-describedby={describedBy} {...register("first_name")} />
          )}
        </Field>
        <Field label="Last name" htmlFor="last_name" error={errors.last_name?.message}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-invalid={invalid} aria-describedby={describedBy} {...register("last_name")} />
          )}
        </Field>
      </div>

      <Field
        label="Email"
        htmlFor="settings-email"
        error={errors.email?.message}
        className="mt-4"
      >
        {({ id, describedBy, invalid }) => (
          <Input id={id} type="email" aria-invalid={invalid} aria-describedby={describedBy} {...register("email")} />
        )}
      </Field>

      {isRecruiter && (
        <Field
          label="Company"
          htmlFor="company_name"
          error={errors.company_name?.message}
          className="mt-4"
        >
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-invalid={invalid} aria-describedby={describedBy} {...register("company_name")} />
          )}
        </Field>
      )}

      <Button type="submit" className="mt-5" loading={isSubmitting} disabled={!isDirty}>
        Save changes
      </Button>
    </form>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await auth.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      reset();
      toast.success("Password changed");
    } catch (error) {
      if (error instanceof ApiError) {
        const current = error.fieldError("current_password");
        const next = error.fieldError("new_password");
        if (current) setError("current_password", { message: current });
        if (next) setError("new_password", { message: next });
        if (!current && !next) setFormError(error.message);
      } else {
        setFormError("Couldn't change your password.");
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="surface-card p-6">
      <h2 className="text-lg font-semibold">Password</h2>

      {formError && (
        <p role="alert" className="mt-4 text-sm font-medium text-[var(--danger)]">
          {formError}
        </p>
      )}

      <div className="mt-5 space-y-4">
        <Field
          label="Current password"
          htmlFor="current_password"
          error={errors.current_password?.message}
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} autoComplete="current-password" aria-invalid={invalid} aria-describedby={describedBy} {...register("current_password")} />
          )}
        </Field>
        <Field
          label="New password"
          htmlFor="new_password"
          error={errors.new_password?.message}
          hint="At least 8 characters, not entirely numeric."
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} autoComplete="new-password" aria-invalid={invalid} aria-describedby={describedBy} {...register("new_password")} />
          )}
        </Field>
        <Field label="Confirm new password" htmlFor="confirm" error={errors.confirm?.message}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} autoComplete="new-password" aria-invalid={invalid} aria-describedby={describedBy} {...register("confirm")} />
          )}
        </Field>
      </div>

      <Button type="submit" className="mt-5" loading={isSubmitting}>
        Change password
      </Button>
    </form>
  );
}

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const options = [
    ["light", "Light"],
    ["dark", "Dark"],
    ["system", "System"],
  ] as const;

  return (
    <section className="surface-card p-6">
      <h2 className="text-lg font-semibold">Appearance</h2>
      <fieldset className="mt-4">
        <legend className="sr-only-focusable">Theme</legend>
        <div className="flex flex-wrap gap-2">
          {options.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                theme === value
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "hover:bg-[var(--surface-sunken)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
