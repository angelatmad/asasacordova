// One destination's visit count and most recent visit date.
export type VisitRecord = {
  destinationSlug: string;
  count: number;
  lastVisitedDate: string;
};

// Guest favorites live in localStorage so they survive a page refresh.
export function getFavorites(): string[] {
  try {
    const stored = localStorage.getItem("asc_favorites");
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

// Save a favorite list, removing duplicates so a slug appears only once.
export function setFavorites(slugs: string[]): string[] {
  const updated = Array.from(new Set(slugs));
  try {
    localStorage.setItem("asc_favorites", JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
  return updated;
}

// Add or remove one slug, then reuse setFavorites to store the clean list.
export function toggleFavorite(slug: string): string[] {
  const current = getFavorites();
  return setFavorites(
    current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
  );
}

export function getVisitedRecords(): Record<string, VisitRecord> {
  try {
    const stored = localStorage.getItem("asc_visited");
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error(e);
    return {};
  }
}

// Store the whole visit map; user-data-api reuses this after loading from Laravel.
export function setVisitedRecords(records: Record<string, VisitRecord>): Record<string, VisitRecord> {
  try {
    localStorage.setItem("asc_visited", JSON.stringify(records));
  } catch (e) {
    console.error(e);
  }
  return records;
}

// Increase the count by one and stamp today's date in a readable format.
export function recordVisit(slug: string): Record<string, VisitRecord> {
  const records = getVisitedRecords();
  // A first visit starts from zero so the increment below becomes one.
  const existing = records[slug] || { destinationSlug: slug, count: 0, lastVisitedDate: "" };
  const updated: VisitRecord = {
    destinationSlug: slug,
    count: existing.count + 1,
    lastVisitedDate: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
  records[slug] = updated;
  try {
    localStorage.setItem("asc_visited", JSON.stringify(records));
  } catch (e) {
    console.error(e);
  }
  return records;
}

export function removeVisit(slug: string): Record<string, VisitRecord> {
  const records = getVisitedRecords();
  delete records[slug];
  try {
    localStorage.setItem("asc_visited", JSON.stringify(records));
  } catch (e) {
    console.error(e);
  }
  return records;
}

