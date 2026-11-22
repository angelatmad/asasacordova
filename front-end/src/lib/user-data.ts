// A traveler rating saved in the browser when the user is not signed in.
export type Review = {
  id: string;
  destinationSlug: string;
  authorName: string;
  authorEmail?: string;
  isAdmin?: boolean;
  rating: number; // 1 to 5
  comment: string;
  date: string;
};

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

// Each destination has its own storage key so reviews do not mix between places.
export function getReviews(slug: string): Review[] {
  try {
    const stored = localStorage.getItem(`asc_reviews_${slug}`);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error(e);
  }

  // Default initial reviews for destinations so signed-up users see rich visitor feedback right away
  const defaultReviewsMap: Record<string, Review[]> = {
    "10000-roses": [
      {
        id: "r1",
        destinationSlug: "10000-roses",
        authorName: "Maria Santos",
        authorEmail: "maria@example.com",
        rating: 5,
        comment: "Breathtaking view especially right at sunset and into the evening when the LED roses light up!",
        date: "Oct 12, 2026",
      },
      {
        id: "r2",
        destinationSlug: "10000-roses",
        authorName: "John Reyes",
        authorEmail: "john@example.com",
        rating: 5,
        comment: "Great photo spot by the Cordova coast. Very scenic and well maintained.",
        date: "Sep 28, 2026",
      },
    ],
    "solea": [
      {
        id: "s1",
        destinationSlug: "solea",
        authorName: "Bea Alonzo",
        authorEmail: "bea@example.com",
        rating: 5,
        comment: "Amazing resort pools and relaxing seaside atmosphere! Perfect weekend getaway.",
        date: "Nov 02, 2026",
      },
    ],
    "cordova-bantayan-beach": [
      {
        id: "b1",
        destinationSlug: "cordova-bantayan-beach",
        authorName: "Carlos Garcia",
        authorEmail: "carlos@example.com",
        rating: 5,
        comment: "Tranquil beach vibes and wonderful breeze. Great spot to unwind.",
        date: "Oct 19, 2026",
      },
    ],
    "cordova-reef": [
      {
        id: "cr1",
        destinationSlug: "cordova-reef",
        authorName: "Danna Lim",
        authorEmail: "danna@example.com",
        rating: 5,
        comment: "Classic seaside village charm with excellent hospitality and ocean views.",
        date: "Oct 05, 2026",
      },
    ],
    "lantaw-restaurant": [
      {
        id: "l1",
        destinationSlug: "lantaw-restaurant",
        authorName: "Mark Anthony",
        authorEmail: "mark@example.com",
        rating: 5,
        comment: "Delicious native seafood dishes with a stunning floating view of the Mactan channel.",
        date: "Nov 10, 2026",
      },
    ],
  };

  return defaultReviewsMap[slug] || [
    {
      id: "def_" + slug,
      destinationSlug: slug,
      authorName: "Cordova Explorer",
      authorEmail: "explorer@asasa-cordova.ph",
      rating: 5,
      comment: "Wonderful destination with amazing local ambiance and scenery!",
      date: "Nov 01, 2026",
    },
  ];
}

// Add a new review at the top so the newest feedback is seen first.
export function addReview(slug: string, rating: number, comment: string, authorName = "Visitor", authorEmail = ""): Review[] {
  const existing = getReviews(slug);
  const newRev: Review = {
    id: "rev_" + Math.random().toString(36).substring(2, 9),
    destinationSlug: slug,
    authorName,
    authorEmail,
    rating,
    comment,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };
  const updated = [newRev, ...existing];
  try {
    localStorage.setItem(`asc_reviews_${slug}`, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
  return updated;
}

// Remove one review by id and save the remaining list for this slug.
export function deleteReview(slug: string, reviewId: string): Review[] {
  const existing = getReviews(slug);
  const updated = existing.filter((r) => r.id !== reviewId);
  try {
    localStorage.setItem(`asc_reviews_${slug}`, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
  return updated;
}
