import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { ApiError } from "@/api/client";
import { useAuth } from "@/app/AuthProvider";
import { usePageTitle } from "@/app/usePageTitle";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";

const schema = z.object({
  username: z.string().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  usePageTitle("Sign in");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Return the user wherever they were headed before the guard intercepted.
  const destination = (location.state as { from?: { pathname: string } } | null)?.from
    ?.pathname;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login(values.username, values.password);
      navigate(
        destination ?? (user.role === "RECRUITER" ? "/recruiter/jobs" : "/jobs"),
        { replace: true },
      );
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.status === 401
            ? "That username and password don't match an account."
            : error.message
          : "Could not reach the server. Check your connection and try again.",
      );
    }
  });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your matches and track your applications."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-medium text-[var(--accent)] hover:underline">
            Create an account
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

        <Field label="Username" htmlFor="username" error={errors.username?.message} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              autoComplete="username"
              autoFocus
              aria-invalid={invalid}
              aria-describedby={describedBy}
              {...register("username")}
            />
          )}
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="current-password"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              {...register("password")}
            />
          )}
        </Field>

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
