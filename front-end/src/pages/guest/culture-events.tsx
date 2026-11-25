import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Check, ChevronLeft, ChevronRight, MapPin, Plus, X } from "lucide-react";
import Navbar from "@/components/common/navbar";
import type { CultureItem } from "@/lib/culture";
import { eventToCultureItem, fetchEvents as fetchEventRecords, type ApiEvent } from "@/lib/event-api";
import { philippineCalendarEvents } from "@/lib/philippine-calendar";
import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  buildMonthGrid,
  expandEventOccurrences,
  formatDateKey,
  formatMonthTitle,
  getCalendarDateIndicator,
  getCategoryStyle,
  getMonthKeyFromDateKey,
  getMonthParts,
  getPhilippineTodayKey,
  getUpcomingEvents,
  groupOccurrencesByDate,
  normalizeDateKey,
  projectRecurringEvents,
  shiftMonthKey,
  type CalendarDayCell,
  type CalendarOccurrence,
  type CalendarSource,
  type UnifiedCalendarEvent,
} from "@/lib/calendar";
import { API_BASE_URL } from "@/lib/api-config";

const CULTURE_API_BASE_URL = `${API_BASE_URL}/api`;

// Checks the logged-in user's role so only admins see edit/delete controls.
async function requestAdminRole(token: string): Promise<boolean> {
  const res = await fetch(`${CULTURE_API_BASE_URL}/auth/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return false;
  const user = (await res.json()) as { role?: string };
  return user.role === "admin";
}

type CalendarEvent = UnifiedCalendarEvent & { apiEvent?: ApiEvent };
type CalendarViewMode = CalendarSource | "all";

const CALENDAR_LEGEND: { category: string; source: CalendarSource; label: string }[] = [
  { category: "national_regular", source: "philippine", label: "Regular Holiday" },
  { category: "national_special", source: "philippine", label: "Special Non-Working" },
  { category: "local_fiesta", source: "philippine", label: "Local Fiesta" },
  { category: "cultural_festival", source: "philippine", label: "Cultural Festival" },
  { category: "religious", source: "philippine", label: "Religious Observance" },
  { category: "chinese_filipino", source: "philippine", label: "Chinese Filipino" },
];

// Gives database categories friendlier names for the calendar chips.
function formatCordovaCategory(category: string): string {
  if (category === "culture") return "Culture & Identity";
  if (category === "festival") return "Festival";
  return "Community Event";
}

interface CalendarDayButtonProps {
  cell: CalendarDayCell;
  occurrences: CalendarOccurrence<CalendarEvent>[];
  todayKey: string;
  selectedDateKey: string | null;
  onSelect: (dateKey: string) => void;
}

// One calendar day: date, event markers, and up to two event names.
function CalendarDayButton({
  cell,
  occurrences,
  todayKey,
  selectedDateKey,
  onSelect,
}: CalendarDayButtonProps) {
  // Blank cells keep the first row aligned with the weekday headings.
  if (!cell.dateKey || cell.dayNumber === null) {
    return (
      <div
        aria-hidden="true"
        className="min-h-[68px] rounded-xl border border-transparent bg-[#FAF6F5]/30 sm:min-h-[96px] sm:rounded-2xl"
      />
    );
  }

  const dateKey = cell.dateKey;
  // The helper decides today, selected, holiday, and event styling.
  const indicator = getCalendarDateIndicator(dateKey, occurrences, todayKey, selectedDateKey);
  const { hasEvents, uniqueEventCount, isHoliday, isToday, isSelected } = indicator;
  // A multi-day event appears once in a day cell, even if it spans days.
  const uniqueOccurrences = occurrences.filter(
    (occurrence, index, list) => list.findIndex((item) => item.event.id === occurrence.event.id) === index,
  );

  const containerClass = isSelected
    ? "border-[#800020] bg-[#FFF0F2] shadow-md ring-2 ring-[#800020]/30"
    : isToday
      ? "border-[#800020] bg-[#FFF0F2] ring-1 ring-[#800020]/40"
      : isHoliday
        ? "border-[#722F37]/40 bg-[#FAF6F5] hover:border-[#800020] hover:bg-[#FFF0F2] hover:shadow-sm"
        : hasEvents
          ? "border-[#800020]/40 bg-white hover:border-[#800020] hover:bg-[#FFF0F2] hover:shadow-sm"
          : "border-[#EBD5D3] bg-white hover:border-[#800020]/50 hover:bg-[#FAF6F5]";

  const dayClass = isToday
    ? "bg-[#800020] text-white"
    : hasEvents || isSelected
      ? "text-[#800020]"
      : "text-[#7A585B]";

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      aria-label={`${formatDateKey(dateKey)}${hasEvents ? `, ${uniqueEventCount} event${uniqueEventCount > 1 ? "s" : ""}` : ", no events"}${isToday ? ", today" : ""}${isSelected ? ", selected" : ""}`}
      aria-pressed={isSelected}
      className={`flex min-h-[68px] flex-col justify-between rounded-xl border p-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#800020] sm:min-h-[96px] sm:rounded-2xl sm:p-2 ${containerClass}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold sm:h-7 sm:w-7 sm:text-xs ${dayClass}`}
        >
          {cell.dayNumber}
        </span>
        {isToday && (
          <span className="hidden rounded-full bg-[#800020] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:inline">
            Today
          </span>
        )}
      </div>

      <div className="mt-1 flex min-h-[14px] items-center justify-between gap-1">
        <span className="flex items-center gap-1" aria-hidden="true">
          {hasEvents ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-[#800020]" />
              {uniqueEventCount > 1 && (
                <span className="rounded-full bg-[#800020] px-1 text-[8px] font-bold leading-[1.2] text-white sm:text-[9px]">
                  {uniqueEventCount}
                </span>
              )}
            </>
          ) : (
            <span className="h-1.5 w-1.5" />
          )}
        </span>
        {isToday && (
          <span className="text-[8px] font-bold uppercase tracking-wide text-[#800020] sm:hidden">Today</span>
        )}
      </div>

      <div className="hidden sm:block">
        {uniqueOccurrences.slice(0, 2).map((occurrence) => {
          const style = getCategoryStyle(occurrence.event.category, occurrence.event.source);
          return (
            <span
              key={occurrence.id}
              title={occurrence.event.title}
              className={`block truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${style.chip}`}
            >
              {occurrence.event.title}
            </span>
          );
        })}
        {uniqueOccurrences.length > 2 && (
          <span className="block text-right text-[9px] font-bold text-[#800020]">
            +{uniqueOccurrences.length - 2} more
          </span>
        )}
      </div>
    </button>
  );
}

function CultureEventsPage() {
  // Today in Philippine time keeps holidays on the correct local day.
  const todayKey = useMemo(() => getPhilippineTodayKey(), []);
  const [activeTab, setActiveTab] = useState<"all" | "culture" | "festival" | "event">("all");
  // The calendar can show Cordova events, Philippine holidays, or both.
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>("cordova");
  const [apiEvents, setApiEvents] = useState<ApiEvent[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token] = useState(localStorage.getItem("asc_token"));
  // Dates use "YYYY-MM" and "YYYY-MM-DD" strings so they are easy to compare.
  const [calendarMonthKey, setCalendarMonthKey] = useState(() => getMonthKeyFromDateKey(todayKey));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  // This filter applies only to Philippine holidays and cultural items.
  const [phCategoryFilter, setPhCategoryFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ApiEvent | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    date_label: "",
    details: "",
    time: "",
    location: "",
    image: "",
    category: "event",
    is_published: true,
  });
  // Lets "Upcoming Events" scroll back to the calendar after a click.
  const calendarSectionRef = useRef<HTMLElement>(null);

  // Re-fetch events after create, edit, or delete so the list stays current.
  const reloadEvents = useCallback(async () => {
    try {
      setApiEvents(await fetchEventRecords(token));
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  }, [token]);

  // active prevents old requests from updating state after unmount or navigation.
  useEffect(() => {
    let active = true;

    fetchEventRecords(token)
      .then((records) => {
        if (active) setApiEvents(records);
      })
      .catch((err) => console.error("Failed to fetch events", err));

    // Only call the role endpoint when a token exists.
    if (token) {
      requestAdminRole(token)
        .then((isAdminUser) => {
          if (active && isAdminUser) setIsAdmin(true);
        })
        .catch((err) => console.error("Failed to check user role", err));
    }

    return () => {
      active = false;
    };
  }, [token]);

  // Converts API records into the simpler shape used by the cards below.
  const combinedItems = useMemo<CultureItem[]>(
    () => apiEvents.map(eventToCultureItem),
    [apiEvents]
  );

  const filteredItems = useMemo(() => {
    if (activeTab === "all") {
      return combinedItems;
    }
    return combinedItems.filter((item) => item.category === activeTab);
  }, [activeTab, combinedItems]);

  // The month key drives the grid and the year used for repeating holidays.
  const { year } = useMemo(() => getMonthParts(calendarMonthKey), [calendarMonthKey]);
  const monthTitle = useMemo(() => formatMonthTitle(calendarMonthKey), [calendarMonthKey]);
  const monthGrid = useMemo(() => buildMonthGrid(calendarMonthKey), [calendarMonthKey]);

  // API events become calendar events; dates without a valid day are skipped.
  const cordovaEvents = useMemo<CalendarEvent[]>(
    () =>
      apiEvents
        .map((event) => ({
          id: `cordova-${event.id}`,
          sourceId: String(event.id),
          source: "cordova" as const,
          title: event.title,
          description: event.description,
          location: event.location,
          startDateKey: normalizeDateKey(event.date ?? "") ?? "",
          time: event.time ?? undefined,
          image: event.image ?? undefined,
          category: event.category,
          categoryLabel: formatCordovaCategory(event.category),
          apiEvent: event,
        }))
        .filter((event) => event.startDateKey),
    [apiEvents],
  );

  // Holidays are filtered by category before entering the calendar.
  const philippineEvents = useMemo<CalendarEvent[]>(
    () =>
      philippineCalendarEvents
        .filter((event) => phCategoryFilter === "all" || event.category === phCategoryFilter)
        .map((event) => ({
          id: `ph-${event.id}`,
          sourceId: event.id,
          source: "philippine" as const,
          title: event.title,
          description: event.description,
          location: event.location,
          startDateKey: normalizeDateKey(event.date) ?? "",
          endDateKey: event.endDate ? normalizeDateKey(event.endDate) ?? undefined : undefined,
          category: event.category,
          categoryLabel: event.categoryLabel,
          significance: event.significance,
          isRecurringYearly: event.isRecurringYearly,
          // Removing the year lets the same holiday repeat in other years.
          recurrenceKey: event.id.replace(/-\d{4}$/, ""),
        }))
        .filter((event) => event.startDateKey),
    [phCategoryFilter],
  );

  // Repeats yearly holidays into the month being viewed.
  const projectedPhilippineEvents = useMemo(
    () => projectRecurringEvents(philippineEvents, year),
    [philippineEvents, year],
  );

  // Both sources are merged for the "All" view.
  const calendarEvents = useMemo<CalendarEvent[]>(
    () => [...cordovaEvents, ...projectedPhilippineEvents],
    [cordovaEvents, projectedPhilippineEvents],
  );

  // Source filter: "all" shows both sets, otherwise keep only one source.
  const modeEvents = useMemo<CalendarEvent[]>(() => {
    if (calendarViewMode === "all") return calendarEvents;
    return calendarEvents.filter((event) => event.source === calendarViewMode);
  }, [calendarEvents, calendarViewMode]);

  // Expands each event to every day it covers, from start date to end date.
  const occurrences = useMemo(() => expandEventOccurrences(modeEvents), [modeEvents]);
  // Grouping by date makes calendar lookups fast.
  const occurrencesByDate = useMemo(() => groupOccurrencesByDate(occurrences), [occurrences]);
  // Only the clicked day's events appear in the detail panel.
  const selectedOccurrences = selectedDateKey ? occurrencesByDate[selectedDateKey] ?? [] : [];
  // Limit the upcoming list to eight items so the page stays short.
  const upcomingEvents = useMemo(
    () => getUpcomingEvents(calendarEvents, todayKey).slice(0, 8),
    [calendarEvents, todayKey],
  );

  const calendarHeading =
    calendarViewMode === "cordova"
      ? "Cordova Events Calendar"
      : calendarViewMode === "philippine"
        ? "Philippine Holidays & Cultural Calendar"
        : "All Events & Holidays Calendar";

  const calendarDescription =
    calendarViewMode === "cordova"
      ? "Every date in the selected month, with published Cordova community events and fiestas."
      : calendarViewMode === "philippine"
        ? "Philippine national holidays, special non-working days, and cultural celebrations in Asia/Manila time."
        : "Cordova community events, Philippine holidays, and cultural observances in one monthly view.";

  function goToMonth(delta: number) {
    // Moving months clears the selected day to avoid showing an old date.
    setCalendarMonthKey((current) => shiftMonthKey(current, delta));
    setSelectedDateKey(null);
  }

  function goToToday() {
    // Recompute today in case the app has been open past midnight.
    const nextTodayKey = getPhilippineTodayKey();
    setCalendarMonthKey(getMonthKeyFromDateKey(nextTodayKey));
    setSelectedDateKey(null);
  }

  function handleDateClick(dateKey: string | null) {
    if (!dateKey) return;
    setSelectedDateKey(dateKey);
  }

  // Jump an event into view: set its month, select its date, and scroll.
  function handleEventNavigate(event: CalendarEvent) {
    const eventMonthKey = getMonthKeyFromDateKey(event.startDateKey);
    setCalendarMonthKey(eventMonthKey);
    setSelectedDateKey(event.startDateKey);
    if (calendarViewMode !== "all") {
      setCalendarViewMode(event.source);
    }
    calendarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Create starts with a blank form; edit fills fields from the chosen event.
  function openCreateModal() {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      date: "",
      date_label: "",
      details: "",
      time: "",
      location: "",
      image: "",
      category: "event",
      is_published: true,
    });
    setIsModalOpen(true);
  }

  function openEditModal(event: ApiEvent) {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      date: normalizeDateKey(event.date ?? "") ?? "",
      date_label: event.date_label || "",
      details: (event.details || []).join("\n"),
      time: event.time || "",
      location: event.location,
      image: event.image || "",
      category: event.category,
      is_published: event.is_published,
    });
    setIsModalOpen(true);
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    const dateLabel = formData.date_label.trim();
    // An event needs either an exact date or a text label like "January".
    if (!formData.date && !dateLabel) {
      alert("Provide a calendar date or a schedule label.");
      return;
    }

    // POST creates a new event; PUT updates the one being edited.
    const url = editingEvent ? `${CULTURE_API_BASE_URL}/events/${editingEvent.id}` : `${CULTURE_API_BASE_URL}/events`;
    const method = editingEvent ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          date: formData.date || null,
          date_label: dateLabel || null,
          // One highlight per line; split and trim into a clean string list.
          details: formData.details.split("\n").map((line) => line.trim()).filter(Boolean),
          time: formData.time,
          location: formData.location,
          image: formData.image,
          category: formData.category,
          is_published: formData.is_published,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        void reloadEvents();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to save event");
      }
    } catch (err) {
      console.error("Error saving event", err);
    }
  }

  // Deleting asks for confirmation, then refreshes the calendar.
  async function handleDeleteEvent(id: number) {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const res = await fetch(`${CULTURE_API_BASE_URL}/events/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        void reloadEvents();
        setSelectedDateKey(null);
      } else {
        alert("Failed to delete event");
      }
    } catch (err) {
      console.error("Error deleting event", err);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF6F5]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#58111A] px-6 pb-20 pt-40 text-white sm:px-10">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#800020]/30 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-[#800020]/20 blur-3xl" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#F2DCDA]">
              Heritage & Community
            </p>

            <h1 className="mt-5 font-display text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
              Culture & Events in Cordova
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
              Explore the local traditions, annual festivals, Philippine national holidays, culinary heritage, and
              community events that define the vibrant spirit of Cordova, Cebu and the Philippines.
            </p>
          </div>

          {isAdmin && (
            <div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-full border border-[#800020] bg-[#800020] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#58111A]"
              >
                <Plus size={18} strokeWidth={2} aria-hidden="true" />
                <span>Add New Event (Admin)</span>
              </button>
            </div>
          )}
        </div>
      </section>

      <section ref={calendarSectionRef} className="scroll-mt-24 px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-7xl rounded-3xl border border-[#EBD5D3] bg-white p-4 shadow-sm sm:p-6 lg:p-10">
          <div className="flex flex-col gap-4 border-b border-[#EBD5D3] pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#58111A]">
                Calendars & Schedules
              </h2>
              <p className="mt-1 text-xs text-[#7A585B]">
                View Cordova community events, Philippine holidays, or both in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#EBD5D3] bg-[#FAF6F5] p-1.5">
              {[
                { id: "cordova" as const, label: "Cordova & Community Events" },
                { id: "philippine" as const, label: "Philippine Holidays & Culture" },
                { id: "all" as const, label: "All Events & Holidays" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setCalendarViewMode(mode.id)}
                  className={`rounded-xl px-3 py-2 text-[11px] font-bold transition sm:px-5 sm:text-xs ${
                    calendarViewMode === mode.id
                      ? "bg-[#800020] text-white shadow-sm"
                      : "text-[#7A585B] hover:text-[#58111A]"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold text-[#58111A]">
                  {calendarHeading} ({monthTitle})
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#7A585B]">{calendarDescription}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* This filter is hidden in Cordova-only view because it targets holidays. */}
                {calendarViewMode !== "cordova" && (
                  <select
                    value={phCategoryFilter}
                    onChange={(e) => setPhCategoryFilter(e.target.value)}
                    aria-label="Filter Philippine events by category"
                    className="rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-3 py-2 text-xs font-semibold text-[#58111A] focus:border-[#800020] focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    <option value="national_regular">Regular Holidays</option>
                    <option value="national_special">Special Non-Working</option>
                    <option value="cultural_festival">Cultural Festivals</option>
                    <option value="local_fiesta">Cordova Local Fiestas</option>
                    <option value="religious">Religious Observances</option>
                    <option value="chinese_filipino">Chinese Filipino</option>
                    <option value="seasonal">Seasonal</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-4 py-2 text-xs font-semibold text-[#58111A] transition hover:bg-[#F2DCDA]"
                >
                  Today
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToMonth(-1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] text-[#58111A] transition hover:bg-[#F2DCDA]"
                    aria-label="Previous Month"
                  >
                    <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <span className="min-w-[124px] text-center font-display text-sm font-bold text-[#58111A] sm:text-base">
                    {monthTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToMonth(1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] text-[#58111A] transition hover:bg-[#F2DCDA]"
                    aria-label="Next Month"
                  >
                    <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {calendarViewMode !== "cordova" && (
              <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-[#EBD5D3] bg-[#FAF6F5] p-3 text-[11px] sm:gap-3 sm:p-4 sm:text-xs">
                <span className="self-center font-bold text-[#58111A]">Legend:</span>
                {CALENDAR_LEGEND.map((item) => {
                  const style = getCategoryStyle(item.category, item.source);
                  return (
                    <span
                      key={item.category}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium ${style.chip}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                      {item.label}
                    </span>
                  );
                })}
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF0F2] px-2.5 py-1 font-medium text-[#800020]">
                  <span className="h-2 w-2 rounded-full bg-[#800020]" />
                  Today
                </span>
              </div>
            )}

            <div className="mt-6 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-[#7A585B] sm:gap-2 sm:text-xs">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
              {/* Each grid cell becomes one clickable day button. */}
              {monthGrid.map((cell, index) => (
                <CalendarDayButton
                  key={cell.dateKey ?? `blank-${index}`}
                  cell={cell}
                  occurrences={cell.dateKey ? occurrencesByDate[cell.dateKey] ?? [] : []}
                  todayKey={todayKey}
                  selectedDateKey={selectedDateKey}
                  onSelect={handleDateClick}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[#7A585B]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#800020]" /> Event date
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#800020] text-[8px] font-bold text-white">2</span>
                Multiple events
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#800020]" /> Today
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-[#800020] bg-[#FFF0F2]" /> Selected
              </span>
              <span>Dates without events remain selectable.</span>
            </div>

            {/* Panel appears only after a date is clicked. */}
            {selectedDateKey && (
              <div className="mt-8 rounded-2xl border border-[#EBD5D3] bg-[#FAF6F5] p-4 shadow-inner sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-display text-lg font-semibold text-[#58111A]">
                      Events on {formatDateKey(selectedDateKey)}
                    </h4>
                    <p className="mt-1 text-[11px] text-[#7A585B]">
                      {selectedOccurrences.length} event{selectedOccurrences.length === 1 ? "" : "s"} scheduled
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDateKey(null)}
                    className="inline-flex items-center gap-1.5 shrink-0 text-xs font-semibold text-[#7A585B] transition hover:text-[#58111A]"
                  >
                    <X size={18} strokeWidth={2} aria-hidden="true" />
                    <span>Close</span>
                  </button>
                </div>

                {selectedOccurrences.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedOccurrences.map((occurrence) => {
                      const style = getCategoryStyle(occurrence.event.category, occurrence.event.source);
                      const apiEvent = occurrence.event.apiEvent;

                      return (
                        <article
                          key={occurrence.id}
                          className="flex flex-col justify-between rounded-2xl border border-[#EBD5D3] bg-white p-5 shadow-sm"
                        >
                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${style.chip}`}>
                                {occurrence.event.categoryLabel}
                              </span>
                              <span className="text-xs font-semibold text-[#7A585B]">
                                {occurrence.event.time || "All Day"}
                              </span>
                            </div>

                            <h5 className="mt-3 font-display text-xl font-semibold text-[#58111A]">
                              {occurrence.event.title}
                            </h5>
                            <p className="mt-1 text-xs font-semibold text-[#800020]">
                              <MapPin size={14} strokeWidth={2} aria-hidden="true" /> {occurrence.event.location}
                            </p>
                            <p className="mt-3 text-xs leading-relaxed text-[#7A585B]">
                              {occurrence.event.description}
                            </p>
                            {occurrence.event.significance && (
                              <p className="mt-3 text-[11px] font-semibold text-[#800020]">
                                {occurrence.event.significance}
                              </p>
                            )}
                            {/* Multi-day event: tell the user it began earlier. */}
                            {!occurrence.isStart && (
                              <p className="mt-2 text-[11px] text-[#7A585B]">
                                Continuing from {formatDateKey(occurrence.event.startDateKey)}
                              </p>
                            )}
                            {occurrence.event.image && (
                              <div className="mt-3 overflow-hidden rounded-xl border border-[#EBD5D3]">
                                <img src={occurrence.event.image} alt={occurrence.event.title} className="h-36 w-full object-cover" />
                              </div>
                            )}
                          </div>

                          {occurrence.event.source === "philippine" && (
                            <div className="mt-5 flex items-center justify-between border-t border-[#EBD5D3] pt-3 text-[11px] text-[#7A585B]">
                              <span>Philippine Standard Time</span>
                              <span className="font-semibold text-[#800020]">Verified Calendar Date</span>
                            </div>
                          )}

                          {/* Only database events can be edited; holidays are read-only. */}
                          {isAdmin && apiEvent && (
                            <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#EBD5D3] pt-3">
                              <button
                                type="button"
                                onClick={() => openEditModal(apiEvent)}
                                className="rounded-xl bg-[#FFF0F2] px-3 py-1.5 text-xs font-semibold text-[#800020] transition hover:bg-[#F2DCDA]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEvent(apiEvent.id)}
                                className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  // Empty state confirms the date was opened but has no events.
                  <p className="text-xs text-[#7A585B]">No events scheduled for this date.</p>
                )}
              </div>
            )}

            <div className="mt-10 border-t border-[#EBD5D3] pt-8">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h4 className="font-display text-xl font-semibold text-[#58111A]">Upcoming Events</h4>
                  <p className="mt-1 text-xs text-[#7A585B]">
                    Sorted chronologically from today in Philippine time. Select an event to open its calendar date.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#800020]">
                  {upcomingEvents.length} upcoming event{upcomingEvents.length === 1 ? "" : "s"}
                </span>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {upcomingEvents.map((event) => {
                    const normalized = normalizeDateKey(event.startDateKey) ?? todayKey;
                    // Split YYYY-MM-DD into month and day for the small date badge.
                    const [, month, day] = normalized.split("-").map(Number);
                    const style = getCategoryStyle(event.category, event.source);

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleEventNavigate(event)}
                        className="flex items-center gap-3 rounded-2xl border border-[#EBD5D3] bg-[#FAF6F5] p-3 text-left transition hover:border-[#800020] hover:bg-[#FFF0F2]"
                      >
                        <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#800020] text-white">
                          <span className="text-[10px] font-bold uppercase">{MONTH_NAMES[month - 1].slice(0, 3)}</span>
                          <span className="text-base font-bold leading-none">{day}</span>
                        </span>
                        <span className="min-w-0">
                          <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.chip}`}>
                            {event.categoryLabel}
                          </span>
                          <span className="block truncate text-sm font-semibold text-[#58111A]">{event.title}</span>
                          <span className="block truncate text-[11px] text-[#7A585B]">{event.location}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Empty state when nothing is ahead of today.
                <p className="rounded-2xl border border-dashed border-[#EBD5D3] bg-white px-6 py-10 text-center text-xs text-[#7A585B]">
                  No upcoming events are currently available.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-10 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap gap-3">
            {[
              { id: "all", label: "All Heritage & Events" },
              { id: "culture", label: "A. Culture & Identity" },
              { id: "festival", label: "B. Festivals & Celebrations" },
              { id: "event", label: "C. Community Events" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as "all" | "culture" | "festival" | "event")}
                className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[#800020] text-white shadow-md shadow-[#800020]/10"
                    : "border border-[#EBD5D3] bg-white text-[#7A585B] hover:border-[#800020] hover:text-[#800020]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mb-8 mt-10">
            <p className="text-sm text-[#7A585B]">
              Showing <span className="font-semibold text-[#58111A]">{filteredItems.length}</span> items
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {filteredItems.map((item: CultureItem) => (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-3xl border border-[#EBD5D3] bg-white p-7 shadow-sm transition hover:shadow-md sm:p-9"
              >
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-[#F2DCDA] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#800020]">
                      {item.category === "culture"
                        ? "Culture"
                        : item.category === "festival"
                          ? "Festival"
                          : "Event"}
                    </span>

                    <span className="text-xs font-medium text-[#7A585B]">
                      {item.dateOrSchedule}
                    </span>
                  </div>

                  <h3 className="mt-5 font-display text-2xl font-semibold text-[#58111A]">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs font-semibold text-[#800020]">
                    <MapPin size={14} strokeWidth={2} aria-hidden="true" /> {item.venueOrLocation}
                  </p>

                  <p className="mt-4 text-sm leading-7 text-[#7A585B]">
                    {item.description}
                  </p>

                  <div className="mt-6 space-y-2.5 border-t border-[#EBD5D3] pt-6">
                    {item.details.map((detail, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#F2DCDA] text-[#800020]">
                          <Check size={14} strokeWidth={2} aria-hidden="true" />
                        </span>
                        <span className="text-xs leading-5 text-[#7A585B]">
                          {detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-[#EBD5D3] pt-5 text-xs text-[#7A585B]">
                  <span>Asa sa Cordova Community Archive</span>
                  <span className="font-semibold text-[#800020]">Verified Factual Info</span>
                </div>
              </article>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#EBD5D3] bg-white/60 px-6 py-16 text-center">
              <h3 className="font-display text-xl font-semibold text-[#58111A]">
                No items found
              </h3>
              <p className="mt-2 text-sm text-[#7A585B]">
                Try selecting another category filter.
              </p>
            </div>
          )}
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-[#EBD5D3] pb-4">
              <h3 className="font-display text-xl font-semibold text-[#58111A]">
                {editingEvent ? "Edit Event" : "Create New Event"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A585B]"
              >
                <X size={18} strokeWidth={2} aria-hidden="true" />
                <span>Cancel</span>
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#58111A]">Event Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-[#EBD5D3] px-4 py-2.5 text-xs text-[#58111A] focus:border-[#800020] focus:outline-none"
                  placeholder="e.g. Cordova Seafood Festival"
                />
              </div>

              {/* The "*" shows which field is still required: date or label. */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#58111A]">
                    Calendar Date {formData.date_label.trim() ? "" : "*"}
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-xl border border-[#EBD5D3] px-4 py-2.5 text-xs text-[#58111A] focus:border-[#800020] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#58111A]">Time</label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full rounded-xl border border-[#EBD5D3] px-4 py-2.5 text-xs text-[#58111A] focus:border-[#800020] focus:outline-none"
                    placeholder="e.g. 5:00 PM onwards"
                  />
                </div>
              </div>

              <div>
                {/* Used for events without an exact day, such as "Every January". */}
                <label className="mb-1 block text-xs font-bold text-[#58111A]">
                  Schedule Label {formData.date ? "" : "*"}
                </label>
                <input
                  type="text"
                  required={!formData.date}
                  value={formData.date_label}
                  onChange={(e) => setFormData({ ...formData, date_label: e.target.value })}
                  className="w-full rounded-xl border border-[#EBD5D3] px-4 py-2.5 text-xs text-[#58111A] focus:border-[#800020] focus:outline-none"
                  placeholder="e.g. January (Annual Fiesta celebration)"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#58111A]">Location / Venue</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-xl border border-[#EBD5D3] px-4 py-2.5 text-xs text-[#58111A] focus:border-[#800020] focus:outline-none"
                  placeholder="e.g. Cordova Municipal Hall"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#58111A]">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-[#EBD5D3] bg-white px-4 py-2.5 text-xs text-[#58111A] focus:border-[#800020] focus:outline-none"
                  >
                    <option value="event">Community Event</option>
                    <option value="festival">Festival</option>
                    <option value="culture">Culture & Identity</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#58111A]">Status</label>
                  <select
                    value={formData.is_published ? "1" : "0"}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.value === "1" })}
                    className="w-full rounded-xl border border-[#EBD5D3] bg-white px-4 py-2.5 text-xs text-[#58111A] focus:border-[#800020] focus:outline-none"
                  >
                    <option value="1">Published</option>
                    <option value="0">Unpublished (Draft)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#58111A]">Image URL (Optional)</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full rounded-xl border border-[#EBD5D3] px-4 py-2.5 text-xs text-[#58111A] focus:border-[#800020] focus:outline-none"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#58111A]">Description</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-[#EBD5D3] px-4 py-2.5 text-xs text-[#58111A] focus:border-[#800020] focus:outline-none"
                  placeholder="Provide event details..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#58111A]">
                  Highlights (one per line)
                </label>
                <textarea
                  rows={4}
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  className="w-full rounded-xl border border-[#EBD5D3] px-4 py-2.5 text-xs text-[#58111A] focus:border-[#800020] focus:outline-none"
                  placeholder={"Community activities and traditions\nWhat visitors can expect"}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-[#EBD5D3] pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-5 py-2.5 text-xs font-semibold text-[#7A585B] hover:bg-[#FAF6F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#800020] px-6 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-[#58111A]"
                >
                  {editingEvent ? "Update Event" : "Publish Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default CultureEventsPage;
