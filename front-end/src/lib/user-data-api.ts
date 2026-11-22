// user-data.ts is the local (guest) version of these actions. This file first
// tries Laravel, then falls back to localStorage when signed out or offline.
import {
  getFavorites,
  getVisitedRecords,
  recordVisit as recordVisitLocal,
  removeVisit as removeVisitLocal,
  setFavorites,
  setVisitedRecords,
  toggleFavorite as toggleFavoriteLocal,
  type VisitRecord,
} from "@/lib/user-data";

// Vite supplies the real API address; the fallback is the local Laravel server.
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

// Laravel Sanctum needs the saved token to know which user owns the data.
function authHeaders(): HeadersInit {
  const token = localStorage.getItem("asc_token");
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// No token means the visitor is a guest, so use localStorage instead of the API.
function hasToken(): boolean {
  return Boolean(localStorage.getItem("asc_token"));
}

// Shared helper for POST/DELETE actions. It reports success, not data, because
// the latest list is loaded separately after a successful change.
async function apiRequest(path: string, init?: RequestInit): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...init,
      headers: {
        ...authHeaders(),
        // Only JSON bodies need this header; callers can still override headers.
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    return response.ok;
  } catch (error) {
    // Network failure should not break the page; callers use local data instead.
    console.error("User data request failed", error);
    return false;
  }
}

// Load Laravel favorites for signed-in users; guests read their saved slugs.
export async function loadFavorites(): Promise<string[]> {
  if (!hasToken()) return getFavorites();

  try {
    const response = await fetch(`${API_BASE_URL}/api/favorites`, { headers: authHeaders() });
    if (!response.ok) return getFavorites();

    const payload: unknown = await response.json();
    // Laravel should return a plain array of slugs; ignore any other shape.
    if (!Array.isArray(payload)) return getFavorites();

    // Cache the server list locally so the UI and guest view stay in sync.
    return setFavorites(payload.filter((slug): slug is string => typeof slug === "string"));
  } catch (error) {
    // A failed request still shows the last locally saved favorites.
    console.error("Failed to load favorites", error);
    return getFavorites();
  }
}

// Save or remove one favorite. Guests change localStorage; users call Laravel.
// After a successful API call, reload so the returned list is authoritative.
export async function updateFavorite(slug: string, shouldAdd: boolean): Promise<string[]> {
  if (!hasToken()) return toggleFavoriteLocal(slug);

  // POST adds a slug; DELETE uses it in the URL. encodeURIComponent keeps slugs safe.
  const success = await apiRequest(
    shouldAdd ? "/favorites" : `/favorites/${encodeURIComponent(slug)}`,
    shouldAdd
      ? { method: "POST", body: JSON.stringify({ slug }) }
      : { method: "DELETE" }
  );

  // If Laravel cannot be reached, still update the visible local list.
  if (!success) return toggleFavoriteLocal(slug);
  return loadFavorites();
}

// Laravel sends snake_case fields and a raw date; convert both for the UI.
function toVisitRecord(entry: Record<string, unknown>): VisitRecord | null {
  const slug = typeof entry.destination_slug === "string" ? entry.destination_slug : "";
  if (!slug) return null;

  const count = Number(entry.count);
  // Add midnight so the date is not shifted into the previous day by time zones.
  const rawDate = typeof entry.last_visited_at === "string" ? entry.last_visited_at : "";
  const parsedDate = rawDate ? new Date(`${rawDate}T00:00:00`) : null;

  return {
    destinationSlug: slug,
    // Bad data should not show zero visits for a saved record.
    count: Number.isFinite(count) ? count : 1,
    lastVisitedDate: parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "",
  };
}

// Load Laravel's visit rows, normalize them, then replace localStorage with them.
export async function loadVisited(): Promise<Record<string, VisitRecord>> {
  if (!hasToken()) return getVisitedRecords();

  try {
    const response = await fetch(`${API_BASE_URL}/api/visited`, { headers: authHeaders() });
    if (!response.ok) return getVisitedRecords();

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) return getVisitedRecords();

    const records: Record<string, VisitRecord> = {};
    for (const entry of payload) {
      // Skip anything that is not a plain row before trying to normalize it.
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const record = toVisitRecord(entry as Record<string, unknown>);
      if (record) records[record.destinationSlug] = record;
    }

    return setVisitedRecords(records);
  } catch (error) {
    // Keep showing the last local records if the server is unavailable.
    console.error("Failed to load visited places", error);
    return getVisitedRecords();
  }
}

// Record another visit, then reload so the count comes back from Laravel.
export async function addVisit(slug: string): Promise<Record<string, VisitRecord>> {
  if (!hasToken()) return recordVisitLocal(slug);

  const success = await apiRequest(`/visited/${encodeURIComponent(slug)}`, { method: "POST" });
  if (!success) return recordVisitLocal(slug);
  return loadVisited();
}

// Delete one visit record, then reload the remaining records from Laravel.
export async function removeVisit(slug: string): Promise<Record<string, VisitRecord>> {
  if (!hasToken()) return removeVisitLocal(slug);

  const success = await apiRequest(`/visited/${encodeURIComponent(slug)}`, { method: "DELETE" });
  if (!success) return removeVisitLocal(slug);
  return loadVisited();
}
