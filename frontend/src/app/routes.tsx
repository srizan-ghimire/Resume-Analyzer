import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import * as React from "react";

import { useAuth } from "./AuthProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader } from "@/components/ui/Feedback";
import { LandingPage } from "@/pages/LandingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/*
 * The landing page and 404 load eagerly -- they are the first paint for a
 * visitor. Everything behind auth is split out, so a signed-out visitor never
 * downloads the recruiter dashboard.
 */
const lazyPage = <T extends Record<string, React.ComponentType>>(
  loader: () => Promise<T>,
  name: keyof T,
) => React.lazy(async () => ({ default: (await loader())[name] }));

const LoginPage = lazyPage(() => import("@/pages/LoginPage"), "LoginPage");
const RegisterPage = lazyPage(() => import("@/pages/RegisterPage"), "RegisterPage");
const JobsPage = lazyPage(() => import("@/pages/JobsPage"), "JobsPage");
const JobDetailPage = lazyPage(() => import("@/pages/JobDetailPage"), "JobDetailPage");
const ResumePage = lazyPage(() => import("@/pages/ResumePage"), "ResumePage");
const AtsPage = lazyPage(() => import("@/pages/AtsPage"), "AtsPage");
const RecommendationsPage = lazyPage(
  () => import("@/pages/RecommendationsPage"),
  "RecommendationsPage",
);
const ApplicationsPage = lazyPage(
  () => import("@/pages/ApplicationsPage"),
  "ApplicationsPage",
);
const SettingsPage = lazyPage(() => import("@/pages/SettingsPage"), "SettingsPage");
const RecruiterJobsPage = lazyPage(
  () => import("@/pages/recruiter/RecruiterJobsPage"),
  "RecruiterJobsPage",
);
const JobFormPage = lazyPage(
  () => import("@/pages/recruiter/JobFormPage"),
  "JobFormPage",
);
const ApplicantsPage = lazyPage(
  () => import("@/pages/recruiter/ApplicantsPage"),
  "ApplicantsPage",
);

/**
 * Gate for authenticated routes.
 *
 * Waits for the session restore to finish before deciding -- the old guard
 * checked a token synchronously and flashed the login page on every refresh.
 * The attempted location is preserved so login can return the user to it.
 */
function RequireAuth({
  role,
  children,
}: {
  role?: "SEEKER" | "RECRUITER";
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <Loader label="Restoring your session…" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (role && user?.role !== role) {
    return <Navigate to={user?.role === "RECRUITER" ? "/recruiter/jobs" : "/jobs"} replace />;
  }
  return <>{children}</>;
}

/** Signed-in users should never see the login or register screens. */
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <Loader label="Loading…" />;
  if (isAuthenticated) {
    return <Navigate to={user?.role === "RECRUITER" ? "/recruiter/jobs" : "/jobs"} replace />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <React.Suspense fallback={<Loader />}>
      <RouteTable />
    </React.Suspense>
  );
}

function RouteTable() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthed>
            <RegisterPage />
          </RedirectIfAuthed>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route
          path="/resume"
          element={
            <RequireAuth role="SEEKER">
              <ResumePage />
            </RequireAuth>
          }
        />
        <Route
          path="/ats"
          element={
            <RequireAuth role="SEEKER">
              <AtsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/matches"
          element={
            <RequireAuth role="SEEKER">
              <RecommendationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/applications"
          element={
            <RequireAuth role="SEEKER">
              <ApplicationsPage />
            </RequireAuth>
          }
        />

        <Route
          path="/recruiter/jobs"
          element={
            <RequireAuth role="RECRUITER">
              <RecruiterJobsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/recruiter/jobs/new"
          element={
            <RequireAuth role="RECRUITER">
              <JobFormPage />
            </RequireAuth>
          }
        />
        <Route
          path="/recruiter/jobs/:jobId/edit"
          element={
            <RequireAuth role="RECRUITER">
              <JobFormPage />
            </RequireAuth>
          }
        />
        <Route
          path="/recruiter/jobs/:jobId/applicants"
          element={
            <RequireAuth role="RECRUITER">
              <ApplicantsPage />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
