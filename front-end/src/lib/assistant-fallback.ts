import type { CultureItem } from "@/lib/culture";
import type { Destination } from "@/lib/destination-api";

// Chat history passed from the assistant UI. Only user and assistant messages matter.
export type AssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Describes the place and category an answer is about, so results stay focused.
export type AssistantScope = {
  type: "general" | "municipality" | "barangay" | "landmark" | "near";
  label: string;
  category: string | null;
  followUp: boolean;
};

// Small destination summary used to render clickable cards below an answer.
export type AssistantDestinationLink = {
  slug: string;
  name: string;
  category: string;
  barangays: string[];
};

// The local fallback returns text plus the cards that should appear with it.
export type AssistantAnswer = {
  text: string;
  destinations: AssistantDestinationLink[];
  scope: AssistantScope;
};

// Internal search result: a known place and the barangays/coordinates it covers.
type LocationMatch = {
  type: "barangay" | "landmark";
  label: string;
  barangays: string[];
  anchor?: { latitude: number; longitude: number };
};

// Cordova barangays are listed here so users can ask by barangay even when a
// destination record does not mention that barangay.
const BARANGAYS = [
  "Alegria",
  "Bangbang",
  "Buagsong",
  "Catarman",
  "Cogon",
  "Dapitan",
  "Day-as",
  "Gabi",
  "Gilutongan",
  "Ibabao",
  "Pilipog",
  "Poblacion",
  "San Miguel",
];

// People use words like "eat" or "stay" instead of exact category names.
const CATEGORY_PATTERNS: Array<[string, string[]]> = [
  ["food", ["restaurant", "restaurants", "food", "eat", "dining", "seafood", "cafe", "lunch", "dinner", "food park", "bakasihan"]],
  ["stay", ["resort", "resorts", "hotel", "hotels", "stay", "accommodation", "overnight"]],
  ["nature", ["beach", "beaches", "island", "islands", "snorkel", "snorkeling", "dive", "diving"]],
];

// Map those word groups to the category values stored in Laravel's directory.
const CATEGORY_VALUES: Record<string, string[]> = {
  food: ["Restaurant", "Food Park"],
  stay: ["Resort", "Hotel"],
  nature: ["Beach", "Island"],
};

// Plain-language nouns keep "no match" replies easy to understand.
const CATEGORY_NOUNS: Record<string, string> = {
  food: "restaurants or food parks",
  stay: "resorts or hotels",
  nature: "beaches or islands",
};

// Make text comparisons fair by ignoring case, dashes, and repeated spaces.
function normalize(value: string): string {
  return value
    .replace(/[-‑–]/g, " ")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Find a whole term, not a match inside another word. Special regex characters
// are escaped so names like "10,000 Roses" are searched literally.
function termPosition(normalizedText: string, normalizedTerm: string): number {
  if (!normalizedTerm) return -1;
  const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u").exec(normalizedText);
  return match ? match.index : -1;
}

function containsTerm(normalizedText: string, normalizedTerm: string): boolean {
  return termPosition(normalizedText, normalizedTerm) >= 0;
}

// The newest user line is the real question; assistant lines are just context.
function latestUserMessage(history: AssistantChatMessage[]): string {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].role === "user") return history[index].content;
  }
  return "";
}

// Build one search list from fixed barangays plus each destination's name,
// barangays, and aliases from Laravel.
function knownLocations(destinations: Destination[]): LocationMatch[] {
  const locations = new Map<string, LocationMatch>();

  for (const barangay of BARANGAYS) {
    locations.set(normalize(barangay), {
      type: "barangay",
      label: barangay,
      barangays: [barangay],
    });
  }

  for (const destination of destinations) {
    const barangays = destination.barangays ?? [];
    const aliases = [...barangays, ...(destination.locationAliases ?? []), destination.name];
    const anchor =
      destination.latitude !== undefined && destination.longitude !== undefined
        ? { latitude: destination.latitude, longitude: destination.longitude }
        : undefined;

    for (const alias of aliases) {
      if (!alias.trim()) continue;
      const key = normalize(alias);
      const existing = locations.get(key);

      if (!existing) {
        locations.set(key, { type: "landmark", label: alias, barangays, anchor });
        continue;
      }

      // Merge aliases that point to the same place so they share barangays.
      if (existing.type === "barangay") continue;
      existing.barangays = Array.from(new Set([...existing.barangays, ...barangays]));
      if (!existing.anchor && anchor) existing.anchor = anchor;
    }
  }

  // Check longer names first so "San Miguel" is not missed by a shorter match.
  return Array.from(locations.values()).sort(
    (left, right) => right.label.length - left.label.length
  );
}

// Prefer the latest mentioned place. In "near Solea from Cogon", Solea is the target.
function findLocation(text: string, destinations: Destination[]): LocationMatch | undefined {
  const normalized = normalize(text);
  let best: LocationMatch | undefined;
  let bestPosition = -1;

  for (const location of knownLocations(destinations)) {
    const position = termPosition(normalized, normalize(location.label));
    if (position >= 0 && position > bestPosition) {
      bestPosition = position;
      best = location;
    }
  }

  return best;
}

// Turn everyday words into one of the category groups defined above.
function detectCategory(text: string): string | null {
  const normalized = normalize(text);

  for (const [category, terms] of CATEGORY_PATTERNS) {
    if (terms.some((term) => containsTerm(normalized, term))) return category;
  }

  return null;
}

// Words like "there" or "what about" mean the place may be in an earlier message.
function isContextFollowUp(text: string): boolean {
  return /\b(what about|how about|there|here|same place|same barangay|that area|this area)\b/i.test(text);
}

// Haversine formula estimates straight-line distance between two map points.
function distanceKm(
  from: { latitude: number; longitude: number } | undefined,
  to: { latitude: number; longitude: number } | undefined
): number {
  // Missing coordinates become a huge distance so they are filtered out later.
  if (!from || !to) return Number.MAX_VALUE;

  const earthRadius = 6371;
  const latitudeDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const fromLatitude = (from.latitude * Math.PI) / 180;
  const toLatitude = (to.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadius * 2 * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

// If a barangay has no single pin, average the pins of destinations inside it.
function anchorForBarangays(barangays: string[], destinations: Destination[]) {
  const matches = destinations.filter((destination) =>
    (destination.barangays ?? []).some((barangay) => barangays.includes(barangay))
  );
  const anchors = matches
    .map((destination) =>
      destination.latitude !== undefined && destination.longitude !== undefined
        ? { latitude: destination.latitude, longitude: destination.longitude }
        : undefined
    )
    .filter((anchor): anchor is { latitude: number; longitude: number } => Boolean(anchor));

  if (anchors.length === 0) return undefined;

  // The average point becomes the center used by the "near" filter.
  return {
    latitude: anchors.reduce((sum, anchor) => sum + anchor.latitude, 0) / anchors.length,
    longitude: anchors.reduce((sum, anchor) => sum + anchor.longitude, 0) / anchors.length,
  };
}

// Combine the current question with earlier messages to decide what the user means.
function resolveScope(history: AssistantChatMessage[], destinations: Destination[]): AssistantScope {
  const current = latestUserMessage(history);
  const previous = history
    .filter((message, index) => message.role === "user" && index < history.length - 1)
    .map((message) => message.content)
    .join(" ");

  let location = findLocation(current, destinations);
  let followUp = false;

  // "How about restaurants there?" reuses the place from the previous question.
  if (!location && isContextFollowUp(current) && previous.trim()) {
    location = findLocation(previous, destinations);
    followUp = Boolean(location);
  }

  if (!location) {
    return {
      type: containsTerm(normalize(current), "cordova") ? "municipality" : "general",
      label: "Cordova",
      category: detectCategory(current),
      followUp: false,
    };
  }

  // These words switch the filter from a place match to a distance search.
  const near = /\b(near|nearby|around|close to|close by|vicinity of)\b/i.test(current);

  return {
    type: near ? "near" : location.type,
    label: location.label,
    category: detectCategory(current),
    followUp,
  };
}

// Apply the scope like a series of filters: place first, then category.
function filterDestinations(scope: AssistantScope, destinations: Destination[]): Destination[] {
  let matches = destinations;

  if (scope.type === "barangay") {
    matches = matches.filter((destination) => (destination.barangays ?? []).includes(scope.label));
  }

  if (scope.type === "landmark") {
    const location = findLocation(scope.label, destinations);
    const barangays = location?.barangays ?? [];
    matches = matches.filter((destination) =>
      (destination.barangays ?? []).some((barangay) => barangays.includes(barangay))
    );
  }

  // "Near" keeps only destinations within 5 km; missing coordinates fail the test.
  if (scope.type === "near") {
    const location = findLocation(scope.label, destinations);
    const anchor = location?.anchor ?? anchorForBarangays(location?.barangays ?? [], destinations);
    matches = matches.filter(
      (destination) =>
        distanceKm(anchor, {
          latitude: destination.latitude ?? Number.NaN,
          longitude: destination.longitude ?? Number.NaN,
        }) <= 5
    );
  }

  // Category words like "food" narrow the list to restaurants/food parks.
  const category = scope.category;
  if (category) {
    matches = matches.filter((destination) =>
      (CATEGORY_VALUES[category] ?? []).includes(destination.category)
    );
  }

  return matches;
}

// Keep only the fields needed for clickable result cards, not full records.
function linkRecords(destinations: Destination[]): AssistantDestinationLink[] {
  return destinations.map((destination) => ({
    slug: destination.slug,
    name: destination.name,
    category: destination.category,
    barangays: destination.barangays ?? [],
  }));
}

// Say clearly that no verified match exists instead of inventing a place.
function noMatchReply(scope: AssistantScope): string {
  const noun = scope.category ? CATEGORY_NOUNS[scope.category] : "tourist destinations";
  const preposition = scope.type === "near" ? "near" : "in";
  return `I couldn't find verified ${noun} specifically listed ${preposition} ${scope.label} in the ASC directory yet. Would you like to explore other destinations in Cordova?`;
}

// Show the full directory details when the user asks about one named place.
function destinationReply(destination: Destination): AssistantAnswer {
  return {
    text: [
      `${destination.name} (${destination.category})`,
      "",
      `Overview: ${destination.overview}`,
      "",
      `Address: ${destination.address}`,
      `Schedule: ${destination.openingHours} - ${destination.closingHours} (${destination.operatingDays})`,
      `Entrance Fee: ${destination.entranceFee}`,
      `Contact: ${destination.contactNumber}`,
    ].join("\n"),
    destinations: linkRecords([destination]),
    scope: { type: "landmark", label: destination.name, category: null, followUp: false },
  };
}

// Limit lists to 8 places so the chat stays readable on small screens.
function listReply(scope: AssistantScope, matches: Destination[], municipalityWide: boolean): AssistantAnswer {
  const header = municipalityWide
    ? `Cordova-wide destinations from the ASC directory:`
    : `Verified destinations ${scope.type === "near" ? "near" : "in"} ${scope.label} from the ASC directory:`;

  const lines = matches.slice(0, 8).map((destination) => {
    // A place listed in many barangays needs a reminder to confirm locally.
    const ambiguity =
      destination.barangays.length > 1
        ? ` Address lists ${destination.barangays.join(" / ")}; confirm locally.`
        : "";
    return `• ${destination.name} (${destination.category}) - ${destination.description}${ambiguity}`;
  });

  const suffix = municipalityWide
    ? ""
    : "\n\nThese results are limited to the requested location. Ask for Cordova-wide options if you want other destinations.";

  return {
    text: `${header}\n\n${lines.join("\n")}${suffix}`,
    destinations: linkRecords(matches.slice(0, 8)),
    scope,
  };
}

// Keep only AI-suggested links whose names actually appear in the reply text.
export function destinationLinksForReply(
  records: AssistantDestinationLink[],
  reply: string
): AssistantDestinationLink[] {
  const normalizedReply = normalize(reply);

  return records.filter(
    (record) =>
      containsTerm(normalizedReply, normalize(record.name)) ||
      containsTerm(normalizedReply, normalize(record.slug))
  );
}

// Local answer generator used when the Laravel AI chat request is unavailable.
// It reuses the same destination and event data loaded by the rest of the app.
export function resolveAssistantAnswer(
  query: string,
  history: AssistantChatMessage[],
  destinations: Destination[],
  cultureItems: CultureItem[]
): AssistantAnswer {
  const current = latestUserMessage(history) || query;
  const normalized = normalize(current);

  // Greetings do not need a database or directory lookup.
  if (/^(hi|hello|hey|greetings|mabuhay|good (morning|afternoon|evening))\b/.test(normalized)) {
    return {
      text: "Hello, what can I help you?",
      destinations: [],
      scope: { type: "general", label: "Cordova", category: null, followUp: false },
    };
  }

  const mentioned = destinations.find(
    (destination) =>
      containsTerm(normalized, normalize(destination.slug)) ||
      containsTerm(normalized, normalize(destination.name))
  );

  // A bare place name asks for that place's own details.
  if (mentioned && !/\b(near|nearby|around|close to|in|at)\b/.test(normalized)) {
    return destinationReply(mentioned);
  }

  // Culture questions reuse the events loaded for the calendar and AI panel.
  if (/festival|culture|cultural|event|fiesta/.test(normalized)) {
    const item = cultureItems.find((culture) =>
      containsTerm(normalized, normalize(culture.title))
    ) ?? cultureItems[0];

    return {
      text: item
        ? `${item.title} (${item.dateOrSchedule})\n\n${item.description}`
        : "I couldn't find verified culture or event details in the ASC directory yet.",
      destinations: [],
      scope: { type: "general", label: "Cordova", category: null, followUp: false },
    };
  }

  // Account questions explain built-in features without calling Laravel.
  if (/favorite|visited|review|account|save|profile/.test(normalized)) {
    return {
      text: "Asa sa Cordova Website Features:\n\n• Favorites: Save favorite destinations for quick trip planning.\n• Visited Records: Track places you have visited.\n• Traveler Reviews: Read and submit ratings and reviews on any destination page.",
      destinations: [],
      scope: { type: "general", label: "Cordova", category: null, followUp: false },
    };
  }

  // All other questions go through scope + filtering + a short list reply.
  const scope = resolveScope(history, destinations);
  const matches = filterDestinations(scope, destinations);
  const municipalityWide = scope.type === "general" || scope.type === "municipality";

  if (!municipalityWide && matches.length === 0) {
    return {
      text: noMatchReply(scope),
      destinations: [],
      scope,
    };
  }

  if (matches.length === 0) {
    return {
      text: "I couldn't find verified destinations in the ASC directory for that question yet.",
      destinations: [],
      scope,
    };
  }

  return listReply(scope, matches, municipalityWide);
}
