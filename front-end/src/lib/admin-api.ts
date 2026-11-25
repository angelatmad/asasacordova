import { API_BASE_URL } from "@/lib/api-config";

export const ADMIN_API_BASE_URL = API_BASE_URL;

// Laravel may return IDs as numbers or strings, so both are allowed.
export type AdminId = number | string;
// Only these two roles are used by the admin pages.
export type AdminRole = "user" | "admin";
// Query values become URL parameters, such as ?page=2&search=roses.
export type QueryValue = string | number | boolean | null | undefined;

// Shapes returned by Laravel for the admin pages. Fields are optional because
// list and detail endpoints do not always return the same amount of data.
export interface AdminUser {
  id: AdminId;
  name: string;
  email: string;
  role?: AdminRole;
  created_at?: string | null;
  updated_at?: string | null;
  email_verified_at?: string | null;
}

// Different admin screens may use Laravel's snake_case names or the older
// camelCase names, so both spellings are listed for one destination.
export interface AdminDestination {
  id: AdminId;
  slug: string;
  name: string;
  category?: string | null;
  description?: string | null;
  overview?: string | null;
  image?: string | null;
  address?: string | null;
  municipality?: string | null;
  barangays?: string[] | string | null;
  location_aliases?: string[] | string | null;
  opening_hours?: string | null;
  closing_hours?: string | null;
  operating_days?: string | null;
  entrance_fee?: string | null;
  contact_number?: string | null;
  website_url?: string | null;
  social_url?: string | null;
  location_note?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  highlights?: string[] | string | null;
  facilities?: string[] | string | null;
  openingHours?: string | null;
  closingHours?: string | null;
  operatingDays?: string | null;
  entranceFee?: string | null;
  contactNumber?: string | null;
  websiteUrl?: string | null;
  socialUrl?: string | null;
  locationNote?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Admins can see published events and unpublished drafts.
export interface AdminEvent {
  id: AdminId;
  title: string;
  description?: string | null;
  date?: string | null;
  date_label?: string | null;
  details?: string[] | null;
  time?: string | null;
  location?: string | null;
  image?: string | null;
  category?: string | null;
  is_published?: boolean;
  published?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

// Reviews and feedback can include the writer and their replies from Laravel.
export interface AdminReviewReply {
  id: AdminId;
  reply?: string | null;
  comment?: string | null;
  user_id?: AdminId | null;
  user?: AdminUser | null;
  created_at?: string | null;
}

export interface AdminReview {
  id: AdminId;
  destination_slug?: string | null;
  destinationSlug?: string | null;
  destination?: string | null;
  rating?: number | null;
  comment?: string | null;
  user_id?: AdminId | null;
  user?: AdminUser | null;
  replies?: AdminReviewReply[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminFeedbackReply {
  id: AdminId;
  reply?: string | null;
  user_id?: AdminId | null;
  user?: AdminUser | null;
  created_at?: string | null;
}

export interface AdminFeedback {
  id: AdminId;
  subject?: string | null;
  message?: string | null;
  status?: "pending" | "resolved" | string | null;
  user_id?: AdminId | null;
  user?: AdminUser | null;
  replies?: AdminFeedbackReply[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// These summary responses can gain new keys as the admin API grows.
export interface AdminDashboard {
  stats?: Record<string, unknown>;
  counts?: Record<string, unknown>;
  totals?: Record<string, unknown>;
  recent_events?: AdminEvent[] | null;
  recent_reviews?: AdminReview[] | null;
  recent_feedback?: AdminFeedback[] | null;
  recent_activity?: Array<Record<string, unknown>> | null;
  [key: string]: unknown;
}

export interface AdminAnalytics {
  totals?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  destinations_by_category?: unknown;
  events_by_category?: unknown;
  reviews_by_destination?: unknown;
  ratings_distribution?: unknown;
  monthly_events?: unknown;
  user_growth?: unknown;
  feedback_by_status?: unknown;
  charts?: unknown;
  [key: string]: unknown;
}

// Profile data may describe the user with either "user" or "admin".
export interface AdminProfile {
  user?: AdminUser | null;
  admin?: AdminUser | null;
  stats?: Record<string, unknown>;
  [key: string]: unknown;
}

// Create, update, and delete calls usually only return a message from Laravel.
export interface AdminMutationResponse {
  message?: string;
  [key: string]: unknown;
}

// Laravel pagination puts rows in data and page details in meta or at the top
// level. This type describes that raw response before it is normalized.
export interface PaginatedResponse<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
  links?: Record<string, unknown>;
}

// This is the single, predictable shape admin tables receive after normalization.
export interface AdminListResult<T> {
  items: T[];
  page: number;
  lastPage: number;
  perPage: number;
  total: number;
  isPaginated: boolean;
}

// Form values sent to Laravel when an admin creates or edits a destination.
export interface AdminDestinationInput {
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  overview?: string;
  image?: string;
  address?: string;
  municipality?: string;
  barangays?: string[];
  location_aliases?: string[];
  opening_hours?: string;
  closing_hours?: string;
  operating_days?: string;
  entrance_fee?: string;
  contact_number?: string;
  website_url?: string;
  social_url?: string;
  location_note?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  highlights?: string[];
  facilities?: string[];
}

// Form values sent to Laravel when an admin creates or edits an event.
export interface AdminEventInput {
  title: string;
  description: string;
  date: string | null;
  date_label?: string | null;
  details?: string[];
  time?: string;
  location: string;
  image?: string;
  category?: string;
  is_published?: boolean;
}

// Reusable options for any admin call: method, URL filters, JSON body, or cancel signal.
export interface AdminRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
  signal?: AbortSignal;
}

// A custom error keeps Laravel's status code and response so the UI can explain failures.
export class AdminApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.details = details;
  }
}

// Most helpers first check that API data is a plain object, not null or an array.
function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

// Text fields can arrive as numbers, so convert them safely for display.
function stringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

// Laravel may send numbers as strings, so parse them before doing calculations.
function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

// Laravel validation errors live under "errors"; this finds the first readable message.
function readMessage(payload: unknown): string | undefined {
  const record = toRecord(payload);
  if (!record) return undefined;

  const direct = stringValue(record.message);
  if (direct) return direct;

  const errors = toRecord(record.errors);
  if (errors) {
    for (const value of Object.values(errors)) {
      if (Array.isArray(value)) {
        const first = stringValue(value[0]);
        if (first) return first;
      } else {
        const first = stringValue(value);
        if (first) return first;
      }
    }
  }

  // Some endpoints wrap the message in another "error" object.
  const nested = toRecord(record.error);
  if (nested) return readMessage(nested);

  return undefined;
}

// Give the UI a friendly message even for errors that are not from our API.
export function getAdminErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Unable to complete the request. Please try again.";
}

// Shared helper for every /api/admin call. It adds the saved login token so
// Laravel can check that the current user is an admin.
export async function adminRequest<T>(
  path: string,
  options: AdminRequestOptions = {}
): Promise<T> {
  // The login page saves Laravel's Sanctum token under this key.
  const token = localStorage.getItem("asc_token");

  if (!token) {
    throw new AdminApiError(
      "Your session has expired. Please sign in again.",
      401
    );
  }

  // Remove a trailing slash so we never build a URL like :8000//api/admin.
  const base = ADMIN_API_BASE_URL.replace(/\/$/, "");
  const url = new URL(`${base}/api/admin${path.startsWith("/") ? path : `/${path}`}`);

  // Empty filters are skipped so they do not appear in the final URL.
  Object.entries(options.params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  // "Bearer <token>" is how Laravel recognizes the signed-in user.
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  // Only requests that send data need to say the body is JSON.
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers,
      credentials: "include",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    // A cancelled request is normal, so pass it through instead of hiding it.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AdminApiError(
      "Cannot reach the server. Check your connection and try again.",
      0
    );
  }

  // Laravel usually returns JSON, but plain text is kept for simpler errors.
  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    let message =
      readMessage(payload) ||
      (typeof payload === "string" && payload.trim()) ||
      `Request failed (${response.status})`;

    const payloadRecord = toRecord(payload);
    const setup = toRecord(payloadRecord?.setup);

    // A missing database table is a setup problem, not a user mistake.
    if (setup && setup.complete === false) {
      const missing = Array.isArray(setup.missing_tables)
        ? setup.missing_tables.map((table) => String(table)).join(", ")
        : "";
      if (missing) {
        message = `${message}\nMissing tables: ${missing}\nRun the database migrations and try again.`;
      }
    }

    throw new AdminApiError(message, response.status, payload);
  }

  return payload as T;
}

// Different endpoints put lists under different keys, so check the common ones.
function findItems(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;

  const record = toRecord(payload);
  if (!record) return null;

  // Laravel controllers do not all name their list the same way.
  const candidates = [
    record.data,
    record.items,
    record.results,
    record.destinations,
    record.events,
    record.users,
    record.reviews,
    record.feedback,
    record.feedbacks,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  // Paginated responses hide the rows one level deeper, so look inside data too.
  const nested = toRecord(record.data);
  if (nested) return findItems(nested);

  return null;
}

// Turn Laravel's different pagination shapes into one shape for admin tables.
export function normalizeAdminList<T>(
  payload: unknown,
  page = 1,
  perPage = 10
): AdminListResult<T> {
  const items = (findItems(payload) ?? []) as T[];
  const record = toRecord(payload) ?? {};
  const meta = toRecord(record.meta) ?? {};
  const nested = toRecord(record.data) ?? {};

  const resolvedPage =
    numberValue(meta.current_page) ??
    numberValue(record.current_page) ??
    numberValue(nested.current_page) ??
    page;

  const resolvedPerPage =
    numberValue(meta.per_page) ??
    numberValue(record.per_page) ??
    numberValue(nested.per_page) ??
    perPage;

  const reportedTotal =
    numberValue(meta.total) ??
    numberValue(record.total) ??
    numberValue(nested.total);

  // If Laravel does not report the last page, calculate it from total and page size.
  const lastPage =
    numberValue(meta.last_page) ??
    numberValue(record.last_page) ??
    numberValue(nested.last_page) ??
    Math.max(1, Math.ceil((reportedTotal ?? items.length) / resolvedPerPage));

  return {
    items,
    page: Math.max(1, resolvedPage),
    lastPage: Math.max(1, lastPage),
    perPage: Math.max(1, resolvedPerPage),
    total: reportedTotal ?? items.length,
    // A reported total means Laravel, not the browser, is paging the list.
    isPaginated: reportedTotal !== undefined || record.last_page !== undefined,
  };
}

// Client-side paging for endpoints that return the whole list at once.
export function pageItems<T>(
  items: T[],
  page: number,
  perPage: number
): T[] {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

// Chart data may be nested under data, series, or labels, so look inside those keys.
export function getRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null);
  }

  const record = toRecord(value);
  if (!record) return [];

  for (const key of ["data", "items", "results", "series", "labels"]) {
    const nested = record[key];
    if (Array.isArray(nested)) return getRecordArray(nested);
  }

  return [];
}

// Small converters keep UI code safe when a field is missing or has the wrong type.
export function getNumber(value: unknown, fallback = 0): number {
  return numberValue(value) ?? fallback;
}

export function getString(value: unknown, fallback = ""): string {
  return stringValue(value) ?? fallback;
}

// A detail response may wrap the record in a named key or under data.
export function unwrapEntity<T>(payload: unknown, key: string): T | null {
  const record = toRecord(payload);
  if (!record) return null;

  const direct = toRecord(record[key]);
  if (direct) return direct as T;

  const nested = toRecord(record.data);
  if (nested) return unwrapEntity<T>(nested, key);

  return (record as unknown as T) ?? null;
}

// Each method maps to one Laravel admin route. adminRequest handles the fetch,
// the auth header, and the error parsing so these stay short.
export const adminApi = {
  dashboard: () => adminRequest<AdminDashboard>("/dashboard"),

  // Destinations and events use the same list/create/edit/delete pattern.
  destinations: (params?: Record<string, QueryValue>) =>
    adminRequest<unknown>("/destinations", { params }),
  createDestination: (payload: AdminDestinationInput) =>
    adminRequest<AdminMutationResponse>("/destinations", {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    }),
  updateDestination: (id: AdminId, payload: AdminDestinationInput) =>
    adminRequest<AdminMutationResponse>(`/destinations/${id}`, {
      method: "PUT",
      body: payload as unknown as Record<string, unknown>,
    }),
  deleteDestination: (id: AdminId) =>
    adminRequest<AdminMutationResponse>(`/destinations/${id}`, {
      method: "DELETE",
    }),

  events: (params?: Record<string, QueryValue>) =>
    adminRequest<unknown>("/events", { params }),
  createEvent: (payload: AdminEventInput) =>
    adminRequest<AdminMutationResponse>("/events", {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    }),
  updateEvent: (id: AdminId, payload: AdminEventInput) =>
    adminRequest<AdminMutationResponse>(`/events/${id}`, {
      method: "PUT",
      body: payload as unknown as Record<string, unknown>,
    }),
  deleteEvent: (id: AdminId) =>
    adminRequest<AdminMutationResponse>(`/events/${id}`, {
      method: "DELETE",
    }),

  // Changing a role is an admin-only action, so it also uses adminRequest.
  users: (params?: Record<string, QueryValue>) =>
    adminRequest<unknown>("/users", { params }),
  user: (id: AdminId) => adminRequest<unknown>(`/users/${id}`),
  updateUserRole: (id: AdminId, role: AdminRole) =>
    adminRequest<AdminMutationResponse>(`/users/${id}/role`, {
      method: "PUT",
      body: { role },
    }),

  // Reviews and feedback share moderation actions like delete, reply, and status.
  reviews: (type: "review" | "feedback" | "all", params?: Record<string, QueryValue>) =>
    adminRequest<unknown>("/reviews", { params: { type, ...params } }),
  deleteReview: (id: AdminId) =>
    adminRequest<AdminMutationResponse>(`/reviews/${id}`, { method: "DELETE" }),
  deleteReviewReply: (reviewId: AdminId, replyId: AdminId) =>
    adminRequest<AdminMutationResponse>(`/reviews/${reviewId}/replies/${replyId}`, {
      method: "DELETE",
    }),

  feedback: (params?: Record<string, QueryValue>) =>
    adminRequest<unknown>("/feedback", { params }),
  updateFeedbackStatus: (id: AdminId, status: "pending" | "resolved") =>
    adminRequest<AdminMutationResponse>(`/feedback/${id}/status`, {
      method: "PUT",
      body: { status },
    }),
  replyToFeedback: (id: AdminId, reply: string) =>
    adminRequest<AdminMutationResponse>(`/feedback/${id}/reply`, {
      method: "POST",
      body: { reply },
    }),
  deleteFeedback: (id: AdminId) =>
    adminRequest<AdminMutationResponse>(`/feedback/${id}`, {
      method: "DELETE",
    }),

  // Charts and profile are read-only pages, so they only call GET routes.
  analytics: () => adminRequest<AdminAnalytics>("/analytics"),
  profile: () => adminRequest<AdminProfile>("/profile"),
};
