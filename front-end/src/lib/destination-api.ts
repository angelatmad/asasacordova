import rosesImage from "@/assets/images/roses.jpg";
import soleaImage from "@/assets/images/solea.jpg";
import bantayanImage from "@/assets/images/bantayan-beach.jpg";
import reefImage from "@/assets/images/cordova-reef.jpg";
import agilaImage from "@/assets/images/agila.jpg";
import villaAselaImage from "@/assets/images/villaasela.jpg";
import altaHotelImage from "@/assets/images/altahotel.jpg";
import lantawImage from "@/assets/images/lantawrestaurant.jpg";
import parolaImage from "@/assets/images/parolarestaurant.jpg";
import sungkaImage from "@/assets/images/sungkanative.jpg";
import bakasihanImage from "@/assets/images/bakasihan.jpg";
import bricImage from "@/assets/images/bricfoodpark.jpg";
import roroImage from "@/assets/images/rorofoodpark.jpg";
import gilutonganImage from "@/assets/images/gilutongan.jpg";
import cclexImage from "@/assets/images/cclex.jpeg";

// Vite replaces this value at build time. The fallback targets local Laravel.
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

// Laravel stores paths like "images/roses.jpg". Importing the files here lets
// Vite bundle them, and this map turns a stored path into a usable browser URL.
const imageAssets: Record<string, string> = {
  "images/roses.jpg": rosesImage,
  "images/solea.jpg": soleaImage,
  "images/bantayan-beach.jpg": bantayanImage,
  "images/cordova-reef.jpg": reefImage,
  "images/agila.jpg": agilaImage,
  "images/villaasela.jpg": villaAselaImage,
  "images/altahotel.jpg": altaHotelImage,
  "images/lantawrestaurant.jpg": lantawImage,
  "images/parolarestaurant.jpg": parolaImage,
  "images/sungkanative.jpg": sungkaImage,
  "images/bakasihan.jpg": bakasihanImage,
  "images/bricfoodpark.jpg": bricImage,
  "images/rorofoodpark.jpg": roroImage,
  "images/gilutongan.jpg": gilutonganImage,
  "images/cclex.jpeg": cclexImage,
};

// One step in the "how to get there" guide shown on a destination page.
export type RouteStep = {
  stepNumber: number;
  instruction: string;
  landmark: string;
  image?: string;
};

// The frontend-friendly destination shape used by cards, maps, and detail pages.
export type Destination = {
  id?: number;
  slug: string;
  name: string;
  category: string;
  image?: string;
  description: string;
  overview: string;
  highlights: string[];
  address: string;
  municipality?: string;
  barangays: string[];
  locationAliases: string[];
  openingHours: string;
  closingHours: string;
  operatingDays: string;
  entranceFee: string;
  contactNumber: string;
  websiteUrl: string;
  socialUrl: string;
  facilities: string[];
  latitude?: number;
  longitude?: number;
  locationNote?: string;
  routeSteps?: RouteStep[];
  reviewsCount: number;
  averageRating: number;
};

// Cards, detail pages, and favorites all read ratings through this one helper.
export function getRatingSummary(destination: Pick<Destination, "reviewsCount" | "averageRating">) {
  const count = Number.isFinite(destination.reviewsCount) ? destination.reviewsCount : 0;
  const hasReviews = count > 0;
  // A destination with no reviews gets 0, never a made-up five-star value.
  const average = hasReviews && Number.isFinite(destination.averageRating)
    ? Number(destination.averageRating.toFixed(1))
    : 0;

  return { count, average, hasReviews };
}

// Accept a stored path, a bare filename, or a full URL and return something the browser can load.
export function resolveDestinationImage(value?: string | null): string | undefined {
  const reference = typeof value === "string" ? value.trim() : "";
  if (!reference) return undefined;

  const direct = imageAssets[reference];
  if (direct) return direct;

  // Older records may store only the filename, so try that against the same map.
  const fileName = reference.match(/(?:^|\/)([^/]+\.(?:jpe?g|png|webp|gif))$/i)?.[1];
  const byFileName = fileName ? imageAssets[`images/${fileName}`] : undefined;
  if (byFileName) return byFileName;

  // External URLs and unknown paths are passed through unchanged.
  return reference;
}

// Database values can be numbers or null; UI code expects strings.
function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

// Laravel may return coordinates as strings, so parse them before using the map.
function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

// JSON columns such as barangays should become string arrays; bad values become [].
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

// Laravel uses snake_case keys; route steps also need images resolved.
function asRouteSteps(value: unknown): RouteStep[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const steps = value
    .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
    .map((entry) => ({
      stepNumber: asNumber(entry.step_number ?? entry.stepNumber) ?? 0,
      instruction: asString(entry.instruction),
      landmark: asString(entry.landmark),
      image: resolveDestinationImage(asString(entry.image)) || undefined,
    }));

  return steps.length > 0 ? steps : undefined;
}

// Convert Laravel's snake_case API record into the camelCase shape React uses.
// The old camelCase keys are still accepted for older cached data.
export function normalizeDestination(value: Record<string, unknown>): Destination {
  const rawImage = asString(value.image ?? value.Image);

  return {
    id: asNumber(value.id),
    slug: asString(value.slug),
    name: asString(value.name),
    category: asString(value.category, "Attraction"),
    image: resolveDestinationImage(rawImage),
    description: asString(value.description),
    overview: asString(value.overview),
    highlights: asStringArray(value.highlights),
    address: asString(value.address),
    municipality: asString(value.municipality) || undefined,
    barangays: asStringArray(value.barangays),
    locationAliases: asStringArray(value.location_aliases ?? value.locationAliases),
    openingHours: asString(value.opening_hours ?? value.openingHours),
    closingHours: asString(value.closing_hours ?? value.closingHours),
    operatingDays: asString(value.operating_days ?? value.operatingDays),
    entranceFee: asString(value.entrance_fee ?? value.entranceFee),
    contactNumber: asString(value.contact_number ?? value.contactNumber),
    websiteUrl: asString(value.website_url ?? value.websiteUrl),
    socialUrl: asString(value.social_url ?? value.socialUrl),
    facilities: asStringArray(value.facilities),
    latitude: asNumber(value.latitude),
    longitude: asNumber(value.longitude),
    locationNote: asString(value.location_note ?? value.locationNote) || undefined,
    routeSteps: asRouteSteps(value.route_steps ?? value.routeSteps),
    // Laravel supplies these aggregates; old cached records safely become zero.
    reviewsCount: asNumber(value.reviews_count ?? value.reviewsCount) ?? 0,
    averageRating: asNumber(value.average_rating ?? value.averageRating) ?? 0,
  };
}

// Remember the last successful list so many pages can share one API result.
let cachedDestinations: Destination[] | null = null;
// Hold an in-flight request so simultaneous callers do not fetch twice.
let pendingRequest: Promise<Destination[]> | null = null;

// Load all destinations from Laravel's public /api/destinations route.
// Normal calls reuse the cache; force true is used after admin edits or a reload.
export async function fetchDestinations(force = false): Promise<Destination[]> {
  // A finished request can be reused without another network call.
  if (!force && cachedDestinations) return cachedDestinations;
  // If a fetch is already running, share its promise instead of starting another.
  if (!force && pendingRequest) return pendingRequest;

  pendingRequest = (async () => {
    const response = await fetch(`${API_BASE_URL}/api/destinations`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Unable to load destinations (${response.status}).`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("The destinations response was invalid.");
    }

    // Ignore malformed rows and records without a slug because pages link by slug.
    cachedDestinations = payload
      .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
      .map(normalizeDestination)
      .filter((destination) => destination.slug !== "");

    return cachedDestinations;
  })();

  try {
    return await pendingRequest;
  } finally {
    // Clear the shared promise so a later reload can start a fresh request.
    pendingRequest = null;
  }
}

// Try the cached list first; otherwise ask Laravel for one destination by slug.
export async function fetchDestinationBySlug(slug: string): Promise<Destination | null> {
  if (!slug) return null;

  if (cachedDestinations) {
    const cached = cachedDestinations.find((destination) => destination.slug === slug);
    if (cached) return cached;
  }

  const response = await fetch(`${API_BASE_URL}/api/destinations/${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json" },
  });

  // 404 means the slug is not in Laravel's directory, not a network failure.
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Unable to load this destination (${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  return normalizeDestination(payload as Record<string, unknown>);
}

// Call this after an admin change so the next load fetches fresh Laravel data.
export function clearDestinationsCache(): void {
  cachedDestinations = null;
  pendingRequest = null;
}
