// "Today" must follow Philippine time, even if the browser is in another country.
export const PHILIPPINE_TIME_ZONE = "Asia/Manila";

// Labels used by the calendar header; as const keeps them as fixed string values.
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

// Two sources share one calendar: local Cordova events and Philippine holidays.
export type CalendarSource = "cordova" | "philippine";

// One common event shape so the calendar does not need separate rendering code.
export interface UnifiedCalendarEvent {
  id: string;
  sourceId: string;
  source: CalendarSource;
  title: string;
  description: string;
  location: string;
  startDateKey: string;
  endDateKey?: string;
  time?: string;
  image?: string;
  category: string;
  categoryLabel: string;
  significance?: string;
  isRecurringYearly?: boolean;
  recurrenceKey?: string;
}

// A multi-day event becomes one occurrence per day. The id keeps each day unique.
export interface CalendarOccurrence<T extends UnifiedCalendarEvent = UnifiedCalendarEvent> {
  id: string;
  event: T;
  dateKey: string;
  isStart: boolean;
  isEnd: boolean;
}

// A null dateKey means an empty square that completes the 7-column grid.
export interface CalendarDayCell {
  dateKey: string | null;
  dayNumber: number | null;
}

// Flags that tell a day cell whether to show a dot, today ring, or selection.
export interface CalendarDateIndicator {
  hasEvents: boolean;
  eventCount: number;
  uniqueEventCount: number;
  isHoliday: boolean;
  isToday: boolean;
  isSelected: boolean;
}

// Build the small summary used by each calendar day.
export function getCalendarDateIndicator<T extends UnifiedCalendarEvent>(
  dateKey: string,
  occurrences: CalendarOccurrence<T>[],
  todayKey: string,
  selectedDateKey: string | null,
): CalendarDateIndicator {
  return {
    hasEvents: occurrences.length > 0,
    eventCount: occurrences.length,
    // Count the original event once, even if it spans several days.
    uniqueEventCount: new Set(occurrences.map((occurrence) => occurrence.event.id)).size,
    isHoliday: occurrences.some((occurrence) => occurrence.event.source === "philippine"),
    isToday: dateKey === todayKey,
    isSelected: dateKey === selectedDateKey,
  };
}

interface CategoryStyle {
  dot: string;
  chip: string;
  label: string;
}

// These holidays move each year, so copying their old month would be wrong.
const MOVABLE_PHILIPPINE_EVENT_IDS = new Set([
  "ph-chinese-new-year",
  "ph-maundy-thursday",
  "ph-good-friday",
  "ph-national-heroes",
  "ph-sinulog",
]);

// Tailwind color classes for each badge type shown in the calendar.
const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  national_regular: {
    dot: "bg-[#800020]",
    chip: "bg-[#800020] text-white",
    label: "Regular Holiday",
  },
  national_special: {
    dot: "bg-[#722F37]",
    chip: "bg-[#722F37] text-white",
    label: "Special Non-Working",
  },
  local_fiesta: {
    dot: "bg-[#58111A]",
    chip: "bg-[#58111A] text-white",
    label: "Local Fiesta",
  },
  cultural_festival: {
    dot: "bg-[#F2DCDA] ring-1 ring-[#800020]",
    chip: "bg-[#F2DCDA] text-[#800020]",
    label: "Cultural Festival",
  },
  religious: {
    dot: "bg-[#EBD5D3] ring-1 ring-[#58111A]",
    chip: "bg-[#EBD5D3] text-[#58111A]",
    label: "Religious",
  },
  chinese_filipino: {
    dot: "bg-[#FFF0F2] ring-1 ring-[#722F37]",
    chip: "bg-[#FFF0F2] text-[#722F37]",
    label: "Chinese Filipino",
  },
  seasonal: {
    dot: "bg-[#FAF6F5] ring-1 ring-[#7A585B]",
    chip: "bg-[#FAF6F5] text-[#58111A]",
    label: "Seasonal",
  },
  culture: {
    dot: "bg-[#F2DCDA] ring-1 ring-[#800020]",
    chip: "bg-[#F2DCDA] text-[#800020]",
    label: "Culture",
  },
  festival: {
    dot: "bg-[#58111A]",
    chip: "bg-[#58111A] text-white",
    label: "Festival",
  },
  event: {
    dot: "bg-[#800020]",
    chip: "bg-[#800020] text-white",
    label: "Community Event",
  },
};

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  dot: "bg-[#800020]",
  chip: "bg-[#800020] text-white",
  label: "Event",
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Laravel dates may include a time; the calendar only needs YYYY-MM-DD.
export function normalizeDateKey(value: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

// Format in Asia/Manila so the browser's own time zone cannot shift the day.
export function getPhilippineTodayKey(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const partValue = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return `${partValue("year")}-${partValue("month")}-${partValue("day")}`;
}

export function getMonthKeyFromDateKey(dateKey: string): string {
  return normalizeDateKey(dateKey)?.slice(0, 7) ?? getPhilippineTodayKey().slice(0, 7);
}

export function getMonthParts(monthKey: string): { year: number; monthIndex: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, monthIndex: month - 1 };
}

// Use UTC dates when moving months so daylight-saving time cannot skip a day.
export function shiftMonthKey(monthKey: string, delta: number): string {
  const { year, monthIndex } = getMonthParts(monthKey);
  const shifted = new Date(Date.UTC(year, monthIndex + delta, 1));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}`;
}

export function formatMonthTitle(monthKey: string): string {
  const { year, monthIndex } = getMonthParts(monthKey);
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

// Format the chosen day in UTC to keep the displayed date stable.
export function formatDateKey(dateKey: string): string {
  const normalized = normalizeDateKey(dateKey) ?? getPhilippineTodayKey();
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// Adding days in UTC keeps date-only values from shifting across time zones.
function addDaysToDateKey(dateKey: string, days: number): string {
  const normalized = normalizeDateKey(dateKey) ?? getPhilippineTodayKey();
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

// Build blank cells before day 1 and after the last day so all weeks have 7 cells.
export function buildMonthGrid(monthKey: string): CalendarDayCell[] {
  const { year, monthIndex } = getMonthParts(monthKey);
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: CalendarDayCell[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ dateKey: null, dayNumber: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      dateKey: `${year}-${pad(monthIndex + 1)}-${pad(day)}`,
      dayNumber: day,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null, dayNumber: null });
  }

  return cells;
}

// Show a multi-day event on every day it spans, with start/end flags for styling.
export function expandEventOccurrences<T extends UnifiedCalendarEvent>(events: T[]): CalendarOccurrence<T>[] {
  const occurrences: CalendarOccurrence<T>[] = [];

  events.forEach((event) => {
    const startDateKey = normalizeDateKey(event.startDateKey);
    const requestedEndDateKey = normalizeDateKey(event.endDateKey ?? event.startDateKey);
    if (!startDateKey || !requestedEndDateKey) return;

    const endDateKey = requestedEndDateKey < startDateKey ? startDateKey : requestedEndDateKey;
    let cursor = startDateKey;
    let guard = 0;

    // The guard stops a bad end date from creating an endless loop.
    while (cursor <= endDateKey && guard < 31) {
      occurrences.push({
        id: `${event.id}@${cursor}`,
        event,
        dateKey: cursor,
        isStart: cursor === startDateKey,
        isEnd: cursor === endDateKey,
      });
      cursor = addDaysToDateKey(cursor, 1);
      guard += 1;
    }
  });

  return occurrences;
}

// Group occurrences by day, showing new events before continuing days.
export function groupOccurrencesByDate<T extends UnifiedCalendarEvent>(
  occurrences: CalendarOccurrence<T>[],
): Record<string, CalendarOccurrence<T>[]> {
  const grouped: Record<string, CalendarOccurrence<T>[]> = {};

  occurrences.forEach((occurrence) => {
    if (!grouped[occurrence.dateKey]) {
      grouped[occurrence.dateKey] = [];
    }
    grouped[occurrence.dateKey].push(occurrence);
  });

  Object.values(grouped).forEach((items) => {
    items.sort((a, b) => {
      if (a.isStart !== b.isStart) return a.isStart ? -1 : 1;
      return a.event.title.localeCompare(b.event.title);
    });
  });

  return grouped;
}

// Remove duplicate ids, keep future events, then sort by date and title.
export function getUpcomingEvents<T extends UnifiedCalendarEvent>(events: T[], fromDateKey: string): T[] {
  const unique = new Map(events.map((event) => [event.id, event]));

  return Array.from(unique.values())
    .filter((event) => event.startDateKey >= fromDateKey)
    .sort((a, b) => a.startDateKey.localeCompare(b.startDateKey) || a.title.localeCompare(b.title));
}

// Copy fixed-date yearly holidays into the viewed year. Movable holidays and
// years already in the data are skipped to avoid wrong or duplicate entries.
export function projectRecurringEvents(events: UnifiedCalendarEvent[], year: number): UnifiedCalendarEvent[] {
  const yearKey = String(year);
  const explicit = events.filter(
    (event) => event.startDateKey.startsWith(yearKey) || (event.endDateKey?.startsWith(yearKey) ?? false),
  );
  const explicitKeys = new Set(explicit.map((event) => event.recurrenceKey ?? event.id));

  const projected = events
    .filter(
      (event) =>
        event.source === "philippine" &&
        event.isRecurringYearly &&
        !MOVABLE_PHILIPPINE_EVENT_IDS.has(event.sourceId) &&
        !event.startDateKey.startsWith(yearKey) &&
        !explicitKeys.has(event.recurrenceKey ?? event.id),
    )
    .map((event) => ({
      ...event,
      id: `${event.id}-${yearKey}`,
      startDateKey: `${yearKey}-${event.startDateKey.slice(5)}`,
      endDateKey: event.endDateKey ? `${yearKey}-${event.endDateKey.slice(5)}` : undefined,
    }));

  return [...explicit, ...projected].sort(
    (a, b) => a.startDateKey.localeCompare(b.startDateKey) || a.title.localeCompare(b.title),
  );
}

// Unknown local events use the generic event badge; unknown holidays use default.
export function getCategoryStyle(category: string, source: CalendarSource): CategoryStyle {
  if (source === "cordova" && !CATEGORY_STYLES[category]) {
    return CATEGORY_STYLES.event;
  }
  return CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE;
}
