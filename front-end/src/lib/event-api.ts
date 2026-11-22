import type { CultureItem } from "@/lib/culture";

// Use the deployed API when configured, otherwise the local Laravel server.
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

// Event shape returned by Laravel's /api/events route.
export interface ApiEvent {
  id: number;
  title: string;
  description: string;
  date: string | null;
  date_label?: string | null;
  details?: string[] | null;
  time?: string | null;
  location: string;
  image?: string | null;
  category: string;
  is_published: boolean;
  source_key?: string | null;
}

// Keep UI fields as strings even when Laravel returns a number or null.
function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

// Normalize API data and give missing fields safe defaults for the calendar.
function normalizeEvent(value: Record<string, unknown>): ApiEvent {
  const details = Array.isArray(value.details)
    ? value.details.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    id: Number(value.id) || 0,
    title: asString(value.title, "Untitled event"),
    description: asString(value.description),
    date: asString(value.date) || null,
    date_label: asString(value.date_label) || null,
    details,
    time: asString(value.time) || null,
    location: asString(value.location, "Cordova, Cebu"),
    image: asString(value.image) || null,
    category: asString(value.category, "event"),
    // Laravel can send boolean true as true or 1 depending on the endpoint.
    is_published: value.is_published === true || value.is_published === 1 || value.published === true,
    source_key: asString(value.source_key) || null,
  };
}

// Guests get published events. Passing an admin token lets Laravel include drafts.
export async function fetchEvents(token: string | null = null): Promise<ApiEvent[]> {
  const response = await fetch(`${API_BASE_URL}/api/events`, {
    headers: {
      Accept: "application/json",
      // Only add the bearer header when a signed-in user was passed in.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load events (${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("The events response was invalid.");
  }

  // Skip malformed rows and rows without a valid id before normalizing.
  return payload
    .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
    .map(normalizeEvent)
    .filter((event) => event.id > 0);
}

// Prefer a friendly label like "Every 3rd Sunday" over the raw ISO date.
export function getEventSchedule(event: ApiEvent): string {
  const schedule = event.date_label?.trim() || event.date?.trim() || "Schedule to be announced";
  return event.time?.trim() ? `${schedule} • ${event.time.trim()}` : schedule;
}

// Adapt a Laravel event to the CultureItem shape used by the calendar and AI panel.
export function eventToCultureItem(event: ApiEvent): CultureItem {
  // Only culture/festival have special styling; other categories use "event".
  const category =
    event.category === "culture" || event.category === "festival" ? event.category : "event";

  // A draft with no written details still needs something meaningful to show.
  const details =
    event.details && event.details.length > 0
      ? event.details
      : [event.is_published ? "Published event" : "Unpublished draft"];

  return {
    // source_key gives a stable id if the database id changes after a re-import.
    id: event.source_key ? `api-${event.source_key}` : `api-${event.id}`,
    title: event.title,
    category,
    dateOrSchedule: getEventSchedule(event),
    venueOrLocation: event.location,
    description: event.description,
    details,
    image: event.image ?? undefined,
  };
}
