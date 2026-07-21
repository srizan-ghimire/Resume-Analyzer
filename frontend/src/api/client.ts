/**
 * The single HTTP entry point for the app.
 *
 * Replaces the previous arrangement, where the base URL was hardcoded at nine
 * call sites and an `Authorization: Basic btoa(user:password)` header was
 * copy-pasted into five components -- which is why the plaintext password had
 * to live in localStorage.
 *
 * Access tokens are held in memory only. The refresh token is the sole item in
 * localStorage, so a stolen storage entry cannot be replayed after logout.
 */
import type { ApiErrorBody } from "./types";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");

const API_ROOT = `${API_BASE_URL}/api/v1`;
const REFRESH_STORAGE_KEY = "resumatch.refresh";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[] | string>;

  constructor(status: number, body: ApiErrorBody | null, fallback: string) {
    super(body?.error?.message || fallback);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.error?.code ?? "error";
    this.details = body?.error?.details;
  }

  /** First validation message for a field, if the server sent one. */
  fieldError(field: string): string | undefined {
    const value = this.details?.[field];
    if (!value) return undefined;
    return Array.isArray(value) ? value[0] : value;
  }

  /** Every field message flattened, for a form-level summary. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.details ?? {})) {
      out[key] = Array.isArray(value) ? value[0] : String(value);
    }
    return out;
  }
}

let accessToken: string | null = null;
let onAuthLost: (() => void) | null = null;

export const tokenStore = {
  get access() {
    return accessToken;
  },
  get refresh() {
    return localStorage.getItem(REFRESH_STORAGE_KEY);
  },
  set(tokens: { access: string; refresh?: string }) {
    accessToken = tokens.access;
    if (tokens.refresh) {
      localStorage.setItem(REFRESH_STORAGE_KEY, tokens.refresh);
    }
  },
  clear() {
    accessToken = null;
    localStorage.removeItem(REFRESH_STORAGE_KEY);
  },
  /** Called when refresh fails, so the auth provider can reset its state. */
  onAuthLost(handler: () => void) {
    onAuthLost = handler;
  },
};

/**
 * Concurrent 401s must trigger exactly one refresh, not one per request.
 * Everything else awaits the same promise.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;

  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${API_ROOT}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { access: string; refresh?: string };
      tokenStore.set(data);
      return data.access;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Send as multipart instead of JSON. */
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** Skip the Authorization header (login, register, public job browsing). */
  anonymous?: boolean;
  /** Return the raw Response, for file downloads. */
  raw?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_ROOT}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // Non-JSON error (proxy timeout, HTML error page).
  }
  return new ApiError(
    response.status,
    body,
    response.status >= 500
      ? "Something went wrong on our end. Please try again."
      : "Request failed.",
  );
}

async function send(path: string, options: RequestOptions, token: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData; // Let the browser set the multipart boundary.
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
  });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.anonymous ? null : accessToken;
  let response = await send(path, options, token);

  // One transparent retry after refreshing an expired access token.
  if (response.status === 401 && !options.anonymous && tokenStore.refresh) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      response = await send(path, options, fresh);
    } else {
      tokenStore.clear();
      onAuthLost?.();
    }
  }

  if (!response.ok) throw await parseError(response);

  if (options.raw) return response as unknown as T;
  if (response.status === 204 || response.status === 205) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...options, method: "DELETE" }),
  upload: <T>(path: string, formData: FormData, options?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...options, method: "POST", formData }),
};
