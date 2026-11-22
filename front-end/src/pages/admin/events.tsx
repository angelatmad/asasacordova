import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CalendarPlus } from "lucide-react";
import {
  adminApi,
  getAdminErrorMessage,
  getString,
  normalizeAdminList,
  pageItems,
} from "@/lib/admin-api";
import type { AdminEvent, AdminEventInput } from "@/lib/admin-api";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable } from "@/components/admin/DataTable";
import type { DataTableColumn } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { FeedbackBanner } from "@/components/admin/FeedbackBanner";
import { LoadingState } from "@/components/admin/LoadingState";
import { Modal } from "@/components/admin/Modal";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";

const controlClass =
  "w-full rounded-xl border border-[#EBD5D3] bg-white px-3.5 py-2.5 text-sm text-[#58111A] outline-none transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15";
const labelClass = "block text-xs font-semibold text-[#58111A]";

// Form working copy. Fields stay as strings/booleans to match the inputs;
// toInput() converts them into the API payload before saving.
interface EventDraft {
  title: string;
  description: string;
  date: string;
  date_label: string;
  details: string;
  time: string;
  location: string;
  image: string;
  category: string;
  is_published: boolean;
}

// Defaults for a new event: category "event" and published by default.
const emptyDraft: EventDraft = {
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
};

// Fill the form from a saved event. Dates are cut to yyyy-mm-dd because that
// is what <input type="date"> understands, and detail lines are joined with \n.
function toDraft(item: AdminEvent): EventDraft {
  return {
    title: getString(item.title),
    description: getString(item.description),
    date: getString(item.date).slice(0, 10),
    date_label: getString(item.date_label),
    details: Array.isArray(item.details) ? item.details.join("\n") : "",
    time: getString(item.time),
    location: getString(item.location),
    image: getString(item.image),
    category: getString(item.category, "event"),
    is_published: item.is_published ?? item.published ?? false,
  };
}

// Draft-to-payload conversion: trim text, drop blank lines, and send null for
// an empty date so the backend knows the event uses a schedule label instead.
function toInput(draft: EventDraft): AdminEventInput {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    date: draft.date || null,
    date_label: draft.date_label.trim() || null,
    details: draft.details.split("\n").map((line) => line.trim()).filter(Boolean),
    time: draft.time.trim() || undefined,
    location: draft.location.trim(),
    image: draft.image.trim() || undefined,
    category: draft.category.trim() || "event",
    is_published: draft.is_published,
  };
}

// The API may return either "is_published" or "published"; one helper keeps
// the table, filter, and form consistent.
function isPublished(item: AdminEvent): boolean {
  return Boolean(item.is_published ?? item.published);
}

// Admin events page: list/filter events, then create, edit, publish, or delete.
function EventsPage() {
  // List and filter state. "all" means no status filter is applied.
  const [items, setItems] = useState<AdminEvent[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  // Pagination state: total/lastPage are calculated after each request.
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  // Banner message plus form state (open, edited item, draft, busy flag).
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce typing by 300 ms so each pause creates one request, not many.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Ask the API for events matching search/category/status/page. useCallback
  // keeps the function stable so the effect below only re-runs on real changes.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await adminApi.events({
        search: debouncedSearch || undefined,
        category: category || undefined,
        status: status === "all" ? undefined : status,
        page,
        per_page: perPage,
      });
      // The helper handles paginated replies and plain arrays. We also filter
      // by published/draft locally so both response types behave the same.
      const result = normalizeAdminList<AdminEvent>(payload, page, perPage);
      const published = status === "published";
      const draftStatus = status === "draft";
      const filtered = result.items.filter((item) => {
        if (published) return isPublished(item);
        if (draftStatus) return !isPublished(item);
        return true;
      });
      const visible = result.isPaginated ? filtered : pageItems(filtered, page, perPage);

      setItems(visible);
      setTotal(result.isPaginated ? result.total : filtered.length);
      setLastPage(
        result.isPaginated
          ? result.lastPage
          : Math.max(1, Math.ceil(filtered.length / perPage))
      );
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [category, debouncedSearch, page, perPage, status]);

  // Re-fetch on filter/page changes and after saves or deletes (reloadKey).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadKey]);

  // Immutable state update: copy the draft, then replace one field.
  function updateDraft(key: keyof EventDraft, value: string | boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  // New event: blank draft and no editing item.
  function openCreate() {
    setEditing(null);
    setDraft({ ...emptyDraft });
    setFormOpen(true);
  }

  // Edit event: prefill the form from the selected row.
  function openEdit(item: AdminEvent) {
    setEditing(item);
    setDraft(toDraft(item));
    setFormOpen(true);
  }

  // Create or update depending on `editing`. An event needs either a real date
  // or a text schedule label, so we validate before calling the API.
  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.date && !draft.date_label.trim()) {
      setFeedback({ type: "error", message: "Provide a calendar date or a schedule label." });
      return;
    }
    setSaving(true);
    setFeedback(null);

    try {
      const input = toInput(draft);
      // PUT with an id updates; POST without one creates.
      const response = editing
        ? await adminApi.updateEvent(editing.id, input)
        : await adminApi.createEvent(input);

      setFeedback({
        type: "success",
        message: response.message || (editing ? "Event updated." : "Event created."),
      });
      setFormOpen(false);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setFeedback({ type: "error", message: getAdminErrorMessage(requestError) });
    } finally {
      setSaving(false);
    }
  }

  // Runs after the confirm dialog; a successful delete reloads the list.
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback(null);

    try {
      const response = await adminApi.deleteEvent(deleteTarget.id);
      setFeedback({ type: "success", message: response.message || "Event deleted." });
      setDeleteTarget(null);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setFeedback({ type: "error", message: getAdminErrorMessage(requestError) });
    } finally {
      setDeleting(false);
    }
  }

  // Column definitions for the table. The status cell uses isPublished() so
  // differently named API fields still show the right badge and color.
  const columns: DataTableColumn<AdminEvent>[] = [
    {
      key: "title",
      header: "Event",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{getString(row.title, "Untitled")}</p>
          <p className="truncate text-[11px] text-[#7A585B]">
            {getString(row.category, "event")}
          </p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Schedule",
      render: (row) => (
        <div className="text-xs text-[#7A585B]">
          <p>{getString(row.date_label || row.date, "—")}</p>
          {row.time && <p>{getString(row.time)}</p>}
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (row) => (
        <span className="line-clamp-2 text-xs text-[#7A585B]">{getString(row.location, "—")}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            isPublished(row)
              ? "bg-[#FFF0F2] text-[#800020]"
              : "bg-[#F2DCDA] text-[#722F37]"
          }`}
        >
          {isPublished(row) ? "Published" : "Draft"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded-full border border-[#800020] px-3 py-1.5 text-[11px] font-bold text-[#800020] transition hover:bg-[#800020] hover:text-white"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="rounded-full border border-[#F2DCDA] px-3 py-1.5 text-[11px] font-bold text-[#722F37] transition hover:bg-[#F2DCDA]"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  // Unique, sorted category options taken from the rows currently loaded.
  const categories = Array.from(
    new Set(items.map((item) => getString(item.category)).filter(Boolean))
  ).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#58111A]">Events</h2>
          <p className="mt-1 text-sm text-[#7A585B]">
            Manage published events and drafts for the events calendar.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-[#800020] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#58111A]"
        >
          <CalendarPlus size={18} strokeWidth={2} aria-hidden="true" />
          New event
        </button>
      </div>

      {feedback && (
        <FeedbackBanner
          message={feedback.message}
          type={feedback.type}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Every filter change resets the page so results start from page 1. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search events..."
          label="Search events"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
            className="w-full rounded-full border border-[#EBD5D3] bg-white px-4 py-2.5 text-sm text-[#58111A] outline-none focus:border-[#800020] sm:w-44"
          >
            <option value="">All categories</option>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="w-full rounded-full border border-[#EBD5D3] bg-white px-4 py-2.5 text-sm text-[#58111A] outline-none focus:border-[#800020] sm:w-40"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {loading && <LoadingState message="Loading events..." />}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      )}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <EmptyState
              title="No events found"
              message={
                search || category || status !== "all"
                  ? "Try changing your search or filters."
                  : "No events have been added through the API yet."
              }
            />
          ) : (
            <DataTable columns={columns} rows={items} rowKey={(row) => row.id} />
          )}
          <Pagination
            page={page}
            lastPage={lastPage}
            total={total}
            perPage={perPage}
            onPageChange={setPage}
          />
        </>
      )}

      {formOpen && (
        <Modal
          title={editing ? "Edit event" : "New event"}
          description="Published events appear in the public culture and events calendar."
          size="lg"
          onClose={() => setFormOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-full border border-[#EBD5D3] bg-white px-5 py-2.5 text-sm font-semibold text-[#58111A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="event-form"
                disabled={saving}
                className="rounded-full bg-[#800020] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#58111A] disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Save changes" : "Create event"}
              </button>
            </>
          }
        >
          {/* Controlled inputs read from draft; the footer Save button submits
              this form by id for both create and edit. */}
          <form id="event-form" onSubmit={submitForm} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Title *
              <input
                required
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Description *
              <textarea
                required
                rows={3}
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Calendar Date {draft.date_label.trim() ? "" : "*"}
              <input
                type="date"
                value={draft.date}
                onChange={(event) => updateDraft("date", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Time
              <input
                value={draft.time}
                onChange={(event) => updateDraft("time", event.target.value)}
                placeholder="e.g. 9:00 AM"
                className={controlClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Schedule Label {draft.date ? "" : "*"}
              <input
                required={!draft.date}
                value={draft.date_label}
                onChange={(event) => updateDraft("date_label", event.target.value)}
                placeholder="e.g. January (Annual Fiesta celebration)"
                className={controlClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Highlights (one per line)
              <textarea
                rows={4}
                value={draft.details}
                onChange={(event) => updateDraft("details", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Location *
              <input
                required
                value={draft.location}
                onChange={(event) => updateDraft("location", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Category
              <input
                value={draft.category}
                onChange={(event) => updateDraft("category", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Image URL
              <input
                value={draft.image}
                onChange={(event) => updateDraft("image", event.target.value)}
                className={controlClass}
              />
            </label>
            {/* Publishing here controls whether the event appears publicly. */}
            <label className="flex items-center gap-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.is_published}
                onChange={(event) => updateDraft("is_published", event.target.checked)}
                className="h-4 w-4 accent-[#800020]"
              />
              <span className="text-sm font-semibold text-[#58111A]">Publish this event</span>
            </label>
          </form>
        </Modal>
      )}

      {/* The API delete runs only when this dialog is confirmed. */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete event"
          message={`Delete "${getString(deleteTarget.title, "this event")}"? This cannot be undone.`}
          confirmLabel="Delete event"
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default EventsPage;
