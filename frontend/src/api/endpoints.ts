/** Typed wrappers for every endpoint the UI uses. */
import { api } from "./client";
import type {
  Applicant,
  Application,
  ApplicationStatus,
  AtsReport,
  AuthTokens,
  Job,
  JobRequest,
  Paginated,
  Recommendation,
  Resume,
  User,
} from "./types";

export interface JobFilters {
  search?: string;
  job_type?: string;
  location?: string;
  is_remote?: boolean;
  salary_min?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
  mine?: boolean;
}

export const auth = {
  register: (payload: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
    role?: "SEEKER" | "RECRUITER";
    company_name?: string;
  }) => api.post<AuthTokens>("/auth/register/", payload, { anonymous: true }),

  login: (payload: { username: string; password: string }) =>
    api.post<AuthTokens>("/auth/login/", payload, { anonymous: true }),

  logout: (refresh: string) => api.post<void>("/auth/logout/", { refresh }),

  me: () => api.get<User>("/auth/me/"),

  updateProfile: (payload: Partial<User> & { recruiter_profile?: unknown }) =>
    api.patch<User>("/auth/me/", payload),

  changePassword: (payload: { current_password: string; new_password: string }) =>
    api.post<void>("/auth/change-password/", payload),
};

export const jobs = {
  list: (filters: JobFilters = {}) =>
    api.get<Paginated<Job>>("/jobs/", {
      query: filters as Record<string, string | number | boolean | undefined>,
      anonymous: filters.mine ? false : undefined,
    }),

  get: (id: number) => api.get<Job>(`/jobs/${id}/`),

  create: (payload: JobRequest) => api.post<Job>("/jobs/", payload),

  update: (id: number, payload: Partial<JobRequest>) =>
    api.patch<Job>(`/jobs/${id}/`, payload),

  close: (id: number) => api.delete<void>(`/jobs/${id}/`),

  applicants: (id: number, page = 1) =>
    api.get<Paginated<Applicant>>(`/jobs/${id}/applicants/`, { query: { page } }),
};

export const applications = {
  list: (query: { status?: string; page?: number } = {}) =>
    api.get<Paginated<Application>>("/applications/", { query }),

  apply: (job: number, cover_note = "") =>
    api.post<Application>("/applications/", { job, cover_note }),

  updateStatus: (id: number, status: ApplicationStatus) =>
    api.patch<Applicant>(`/applications/${id}/`, { status }),
};

export const resumes = {
  list: () => api.get<Paginated<Resume>>("/resumes/"),

  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.upload<Resume>("/resumes/upload/", form);
  },

  setPrimary: (id: number) => api.post<Resume>(`/resumes/${id}/set-primary/`),

  remove: (id: number) => api.delete<void>(`/resumes/${id}/`),
};

export const matching = {
  recommendations: (limit = 10) =>
    api.get<{ count: number; results: Recommendation[] }>("/recommendations/", {
      query: { limit },
    }),

  atsReport: (job_description: string, resume_id?: number) =>
    api.post<AtsReport>("/ats-report/", { job_description, resume_id }),
};
