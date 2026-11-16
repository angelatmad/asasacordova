import { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/common/navbar";
import { cultureAndEventsData, type CultureItem } from "@/lib/culture";

interface ApiEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  time?: string;
  location: string;
  image?: string;
  category: string;
  is_published: boolean;
}

function CultureEventsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "culture" | "festival" | "event">("all");
  const [apiEvents, setApiEvents] = useState<ApiEvent[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token] = useState(localStorage.getItem("asc_token"));

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateEvents, setSelectedDateEvents] = useState<ApiEvent[] | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Modal / Form state for Admin
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ApiEvent | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    image: "",
    category: "event",
    is_published: true,
  });

  useEffect(() => {
    fetchEvents();
    checkUserRole();
  }, []);

  async function fetchEvents() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/events", {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setApiEvents(data);
      }
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  }

  async function checkUserRole() {
    if (!token) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const user = await res.json();
        if (user.role === "admin") {
          setIsAdmin(true);
        }
      }
    } catch (err) {
      console.error("Failed to check user role", err);
    }
  }

  // Combine static culture items and api events for the listing
  const combinedItems = useMemo(() => {
    const formattedApiEvents: CultureItem[] = apiEvents.map((ev) => ({
      id: `api-${ev.id}`,
      title: ev.title,
      category: (ev.category === "culture" || ev.category === "festival" ? ev.category : "event") as any,
      dateOrSchedule: `${ev.date}${ev.time ? ` • ${ev.time}` : ""}`,
      venueOrLocation: ev.location,
      description: ev.description,
      details: [ev.is_published ? "Published Event" : "Unpublished Draft", ev.image ? `Image URL: ${ev.image}` : "No image provided"],
    }));

    return [...cultureAndEventsData, ...formattedApiEvents];
  }, [apiEvents]);

  const filteredItems = useMemo(() => {
    if (activeTab === "all") {
      return combinedItems;
    }
    return combinedItems.filter((item) => item.category === activeTab);
  }, [activeTab, combinedItems]);

  // Calendar computation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding for previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, dateString: null });
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const formattedMonth = String(month + 1).padStart(2, "0");
      const formattedDay = String(d).padStart(2, "0");
      const dateString = `${year}-${formattedMonth}-${formattedDay}`;
      days.push({ dayNumber: d, dateString });
    }

    return days;
  }, [year, month]);

  // Map events by date string
  const eventsByDate = useMemo(() => {
    const map: Record<string, ApiEvent[]> = {};
    apiEvents.forEach((ev) => {
      // ev.date might be "2026-11-20T00:00:00.000000Z" or "2026-11-20"
      const dateKey = ev.date.split("T")[0];
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(ev);
    });
    return map;
  }, [apiEvents]);

  function handlePrevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateEvents(null);
    setSelectedDateStr(null);
  }

  function handleNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateEvents(null);
    setSelectedDateStr(null);
  }

  function handleDateClick(dateString: string | null) {
    if (!dateString) return;
    setSelectedDateStr(dateString);
    setSelectedDateEvents(eventsByDate[dateString] || []);
  }

  // Admin Form Handlers
  function openCreateModal() {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
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
      date: event.date.split("T")[0],
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
    const url = editingEvent
      ? `http://127.0.0.1:8000/api/events/${editingEvent.id}`
      : "http://127.0.0.1:8000/api/events";
    const method = editingEvent ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchEvents();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to save event");
      }
    } catch (err) {
      console.error("Error saving event", err);
    }
  }

  async function handleDeleteEvent(id: number) {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/events/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        fetchEvents();
        setSelectedDateEvents(null);
        setSelectedDateStr(null);
      } else {
        alert("Failed to delete event");
      }
    } catch (err) {
      console.error("Error deleting event", err);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F3ED]">
      <Navbar />

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-[#292929] px-6 pb-20 pt-40 text-white sm:px-10">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#C96B6B]/10 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-[#E8A0A0]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E8A0A0]">
              Heritage & Community
            </p>

            <h1 className="mt-5 font-display text-4xl font-semibold sm:text-5xl lg:text-6xl">
              Culture & Events in Cordova
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
              Explore the local traditions, annual festivals, culinary heritage, and
              community events that define the vibrant spirit of Cordova, Cebu.
            </p>
          </div>

          {isAdmin && (
            <div>
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-full bg-[#C96B6B] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#B55959]"
              >
                + Add New Event (Admin)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Large Calendar Section */}
      <section className="px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-7xl rounded-3xl border border-[#F1E5DF] bg-white p-6 sm:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#292929]">
                Events Calendar
              </h2>
              <p className="text-xs text-[#716767] mt-1">
                Highlighted dates indicate published community events and festivals.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-display text-lg font-bold text-[#292929]">
                {monthNames[month]} {year}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F1E5DF] bg-[#FFFAF8] text-[#292929] hover:bg-[#FFF5F5]"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F1E5DF] bg-[#FFFAF8] text-[#292929] hover:bg-[#FFF5F5]"
                >
                  &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-[#716767] mb-3">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((item, index) => {
              const hasEvents = item.dateString && eventsByDate[item.dateString] && eventsByDate[item.dateString].length > 0;
              const isSelected = item.dateString === selectedDateStr;

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(item.dateString)}
                  className={`min-h-[90px] sm:min-h-[110px] rounded-2xl border p-2 flex flex-col justify-between transition cursor-pointer ${
                    !item.dateString
                      ? "bg-[#F5F3ED]/40 border-transparent cursor-default"
                      : isSelected
                      ? "border-[#C96B6B] bg-[#FFF5F5] shadow-md ring-2 ring-[#C96B6B]/20"
                      : hasEvents
                      ? "border-[#C96B6B]/60 bg-[#FFFAF8] hover:border-[#C96B6B]"
                      : "border-[#F1E5DF] bg-white hover:border-[#E8A0A0]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        !item.dateString
                          ? "text-transparent"
                          : hasEvents
                          ? "text-[#C96B6B]"
                          : "text-[#292929]"
                      }`}
                    >
                      {item.dayNumber}
                    </span>
                    {hasEvents && (
                      <span className="flex h-2 w-2 rounded-full bg-[#C96B6B]" title="Events on this date" />
                    )}
                  </div>

                  {hasEvents && item.dateString && (
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {eventsByDate[item.dateString].slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="truncate rounded-md bg-[#C96B6B] px-1.5 py-0.5 text-[10px] font-semibold text-white"
                        >
                          {ev.title}
                        </div>
                      ))}
                      {eventsByDate[item.dateString].length > 2 && (
                        <p className="text-[9px] font-bold text-[#C96B6B] text-right">
                          +{eventsByDate[item.dateString].length - 2} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Date Modal / Panel */}
          {selectedDateStr && (
            <div className="mt-8 rounded-2xl border border-[#F1E5DF] bg-[#FFFAF8] p-6 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold text-[#292929]">
                  Events on {selectedDateStr}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateStr(null);
                    setSelectedDateEvents(null);
                  }}
                  className="text-xs font-semibold text-[#716767] hover:text-[#292929]"
                >
                  ✕ Close
                </button>
              </div>

              {selectedDateEvents && selectedDateEvents.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedDateEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-2xl border border-[#F1E5DF] bg-white p-5 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-[#FCEBEC] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#C96B6B]">
                            {ev.category}
                          </span>
                          <span className="text-xs font-semibold text-[#716767]">
                            {ev.time ? ev.time : "All Day"}
                          </span>
                        </div>

                        <h4 className="mt-3 font-display text-xl font-semibold text-[#292929]">
                          {ev.title}
                        </h4>
                        <p className="mt-1 text-xs font-semibold text-[#C96B6B]">
                          📍 {ev.location}
                        </p>
                        <p className="mt-3 text-xs leading-relaxed text-[#716767]">
                          {ev.description}
                        </p>
                        {ev.image && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-[#F1E5DF]">
                            <img src={ev.image} alt={ev.title} className="h-36 w-full object-cover" />
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#F1E5DF] pt-3">
                          <button
                            type="button"
                            onClick={() => openEditModal(ev)}
                            className="rounded-xl bg-[#FFF5F5] px-3 py-1.5 text-xs font-semibold text-[#C96B6B] hover:bg-[#FCEBEC]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#716767]">No events scheduled for this date.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Listings */}
      <section className="px-6 py-12 sm:px-10 lg:py-16">
        <div className="mx-auto max-w-7xl">
          {/* Tabs */}
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
                    ? "bg-[#C96B6B] text-white shadow-md shadow-[#C96B6B]/10"
                    : "border border-[#F1E5DF] bg-white text-[#716767] hover:border-[#C96B6B] hover:text-[#C96B6B]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results count */}
          <div className="mb-8 mt-10">
            <p className="text-sm text-[#716767]">
              Showing <span className="font-semibold text-[#292929]">{filteredItems.length}</span> items
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-8 lg:grid-cols-2">
            {filteredItems.map((item: CultureItem) => (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-3xl border border-[#F1E5DF] bg-white p-7 shadow-sm transition hover:shadow-md sm:p-9"
              >
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-[#FCEBEC] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#C96B6B]">
                      {item.category === "culture"
                        ? "Culture"
                        : item.category === "festival"
                          ? "Festival"
                          : "Event"}
                    </span>

                    <span className="text-xs font-medium text-[#716767]">
                      {item.dateOrSchedule}
                    </span>
                  </div>

                  <h3 className="mt-5 font-display text-2xl font-semibold text-[#292929]">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs font-semibold text-[#C96B6B]">
                    📍 {item.venueOrLocation}
                  </p>

                  <p className="mt-4 text-sm leading-7 text-[#716767]">
                    {item.description}
                  </p>

                  <div className="mt-6 space-y-2.5 border-t border-[#F1E5DF] pt-6">
                    {item.details.map((detail, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FCEBEC] text-[10px] font-bold text-[#C96B6B]">
                          ✓
                        </span>
                        <span className="text-xs leading-5 text-[#716767]">
                          {detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-[#F1E5DF] pt-5 text-xs text-[#716767]">
                  <span>Asa sa Cordova Community Archive</span>
                  <span className="font-semibold text-[#C96B6B]">Verified Factual Info</span>
                </div>
              </article>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#F1E5DF] bg-white/60 px-6 py-16 text-center">
              <h3 className="font-display text-xl font-semibold text-[#292929]">
                No items found
              </h3>
              <p className="mt-2 text-sm text-[#716767]">
                Try selecting another category filter.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Admin Event Management Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1E5DF]">
              <h3 className="font-display text-xl font-semibold text-[#292929]">
                {editingEvent ? "Edit Event" : "Create New Event"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-semibold text-[#716767]"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#292929] mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-[#F1E5DF] px-4 py-2.5 text-xs text-[#292929] focus:border-[#C96B6B] focus:outline-none"
                  placeholder="e.g. Cordova Seafood Festival"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#292929] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-xl border border-[#F1E5DF] px-4 py-2.5 text-xs text-[#292929] focus:border-[#C96B6B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#292929] mb-1">Time</label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full rounded-xl border border-[#F1E5DF] px-4 py-2.5 text-xs text-[#292929] focus:border-[#C96B6B] focus:outline-none"
                    placeholder="e.g. 5:00 PM onwards"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292929] mb-1">Location / Venue</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-xl border border-[#F1E5DF] px-4 py-2.5 text-xs text-[#292929] focus:border-[#C96B6B] focus:outline-none"
                  placeholder="e.g. Cordova Municipal Hall"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#292929] mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-[#F1E5DF] px-4 py-2.5 text-xs text-[#292929] focus:border-[#C96B6B] focus:outline-none bg-white"
                  >
                    <option value="event">Community Event</option>
                    <option value="festival">Festival</option>
                    <option value="culture">Culture & Identity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#292929] mb-1">Status</label>
                  <select
                    value={formData.is_published ? "1" : "0"}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.value === "1" })}
                    className="w-full rounded-xl border border-[#F1E5DF] px-4 py-2.5 text-xs text-[#292929] focus:border-[#C96B6B] focus:outline-none bg-white"
                  >
                    <option value="1">Published</option>
                    <option value="0">Unpublished (Draft)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292929] mb-1">Image URL (Optional)</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full rounded-xl border border-[#F1E5DF] px-4 py-2.5 text-xs text-[#292929] focus:border-[#C96B6B] focus:outline-none"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292929] mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-[#F1E5DF] px-4 py-2.5 text-xs text-[#292929] focus:border-[#C96B6B] focus:outline-none"
                  placeholder="Provide event details..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#F1E5DF]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-5 py-2.5 text-xs font-semibold text-[#716767] hover:bg-[#FFFAF8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#C96B6B] px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#B55959]"
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
