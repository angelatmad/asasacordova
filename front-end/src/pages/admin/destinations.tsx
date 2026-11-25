import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import {
  adminApi,
  getAdminErrorMessage,
  getString,
  normalizeAdminList,
  pageItems,
} from "@/lib/admin-api";
import type { AdminDestination, AdminDestinationInput } from "@/lib/admin-api";
import { clearDestinationsCache } from "@/lib/destination-api";
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

// Shared classes keep every form field looking the same.
const controlClass =
  "w-full rounded-xl border border-[#EBD5D3] bg-white px-3.5 py-2.5 text-sm text-[#58111A] outline-none transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15";
const labelClass = "block text-xs font-semibold text-[#58111A]";

// A draft is the form's working copy. Every field is a string because HTML
// inputs return text; this lets create and edit use the very same form.
interface DestinationDraft {
  name: string;
  slug: string;
  category: string;
  description: string;
  overview: string;
  image: string;
  address: string;
  municipality: string;
  barangays: string;
  location_aliases: string;
  opening_hours: string;
  closing_hours: string;
  operating_days: string;
  entrance_fee: string;
  contact_number: string;
  website_url: string;
  social_url: string;
  location_note: string;
  latitude: string;
  longitude: string;
  highlights: string;
  facilities: string;
}

// Blank draft for a new destination; also used to reset the form on cancel/create.
const emptyDraft: DestinationDraft = {
  name: "",
  slug: "",
  category: "",
  description: "",
  overview: "",
  image: "",
  address: "",
  municipality: "",
  barangays: "",
  location_aliases: "",
  opening_hours: "",
  closing_hours: "",
  operating_days: "",
  entrance_fee: "",
  contact_number: "",
  website_url: "",
  social_url: "",
  location_note: "",
  latitude: "",
  longitude: "",
  highlights: "",
  facilities: "",
};

// Copy a saved destination into the form. Array fields become comma-separated
// text because the inputs are plain text boxes; coordinates become strings.
function toDraft(item: AdminDestination): DestinationDraft {
  return {
    name: getString(item.name),
    slug: getString(item.slug),
    category: getString(item.category),
    description: getString(item.description),
    overview: getString(item.overview),
    image: getString(item.image),
    address: getString(item.address),
    municipality: getString(item.municipality),
    barangays: Array.isArray(item.barangays)
      ? item.barangays.join(", ")
      : getString(item.barangays),
    location_aliases: Array.isArray(item.location_aliases)
      ? item.location_aliases.join(", ")
      : getString(item.location_aliases),
    opening_hours: getString(item.opening_hours ?? item.openingHours),
    closing_hours: getString(item.closing_hours ?? item.closingHours),
    operating_days: getString(item.operating_days ?? item.operatingDays),
    entrance_fee: getString(item.entrance_fee ?? item.entranceFee),
    contact_number: getString(item.contact_number ?? item.contactNumber),
    website_url: getString(item.website_url ?? item.websiteUrl),
    social_url: getString(item.social_url ?? item.socialUrl),
    location_note: getString(item.location_note ?? item.locationNote),
    latitude: item.latitude === null || item.latitude === undefined ? "" : String(item.latitude),
    longitude: item.longitude === null || item.longitude === undefined ? "" : String(item.longitude),
    highlights: Array.isArray(item.highlights)
      ? item.highlights.join(", ")
      : getString(item.highlights),
    facilities: Array.isArray(item.facilities)
      ? item.facilities.join(", ")
      : getString(item.facilities),
  };
}

// Turn "Beach, Museum" into ["Beach", "Museum"] for the API. Trimming and
// dropping blanks keeps empty commas from creating empty list items.
function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

// Draft-to-payload conversion: trim spaces, change blank strings to undefined
// so the API can keep old values, and turn coordinates into numbers (or null).
function toInput(draft: DestinationDraft): AdminDestinationInput {
  const latitude = draft.latitude.trim() ? Number(draft.latitude) : null;
  const longitude = draft.longitude.trim() ? Number(draft.longitude) : null;

  return {
    name: draft.name.trim(),
    slug: draft.slug.trim() || undefined,
    category: draft.category.trim() || undefined,
    description: draft.description.trim() || undefined,
    overview: draft.overview.trim() || undefined,
    image: draft.image.trim() || undefined,
    address: draft.address.trim() || undefined,
    municipality: draft.municipality.trim() || undefined,
    barangays: splitList(draft.barangays),
    location_aliases: splitList(draft.location_aliases),
    opening_hours: draft.opening_hours.trim() || undefined,
    closing_hours: draft.closing_hours.trim() || undefined,
    operating_days: draft.operating_days.trim() || undefined,
    entrance_fee: draft.entrance_fee.trim() || undefined,
    contact_number: draft.contact_number.trim() || undefined,
    website_url: draft.website_url.trim() || undefined,
    social_url: draft.social_url.trim() || undefined,
    location_note: draft.location_note.trim() || undefined,
    latitude: latitude !== null && Number.isFinite(latitude) ? latitude : null,
    longitude: longitude !== null && Number.isFinite(longitude) ? longitude : null,
    highlights: splitList(draft.highlights),
    facilities: splitList(draft.facilities),
  };
}

// Admin destination manager: list/filter with pagination, plus create/edit/delete.
function DestinationsPage() {
  // List, search text, and the debounced copy used in the request.
  const [items, setItems] = useState<AdminDestination[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Pagination state: perPage is fixed; total/lastPage tell Pagination what to show.
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  // feedback is the banner message after a save/delete. The next group controls
  // the form modal: whether it is open, which item is edited, the draft, and busy flag.
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDestination | null>(null);
  const [draft, setDraft] = useState<DestinationDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  // deleteTarget stays null until a row is confirmed; deleting disables the dialog.
  const [deleteTarget, setDeleteTarget] = useState<AdminDestination | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Wait 300 ms after typing before searching, so we do not send one request
  // per keystroke. The cleanup cancels a pending timer if the user keeps typing.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Request the current page of destinations. Empty filters are sent as
  // undefined so the API helper leaves them out of the query string.
  // useCallback keeps this function stable for the effect below.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await adminApi.destinations({
        search: debouncedSearch || undefined,
        category: category || undefined,
        page,
        per_page: perPage,
      });
      // The helper understands both paginated replies and plain arrays. For a
      // plain array we cut the page here with pageItems().
      const result = normalizeAdminList<AdminDestination>(payload, page, perPage);
      const visible = result.isPaginated
        ? result.items
        : pageItems(result.items, page, perPage);

      setItems(visible);
      setTotal(result.isPaginated ? result.total : result.items.length);
      setLastPage(
        result.isPaginated
          ? result.lastPage
          : Math.max(1, Math.ceil(result.items.length / perPage))
      );
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [category, debouncedSearch, page, perPage]);

  // Re-fetch when filters/page change or after a save/delete bumps reloadKey.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadKey]);

  // Copy the draft and replace only the edited field (never mutate state).
  function updateDraft(key: keyof DestinationDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  // New record: no editing item and a completely blank draft.
  function openCreate() {
    setEditing(null);
    setDraft({ ...emptyDraft });
    setFormOpen(true);
  }

  // Edit record: remember the item and prefill the draft from it.
  function openEdit(item: AdminDestination) {
    setEditing(item);
    setDraft(toDraft(item));
    setFormOpen(true);
  }

  // One handler for both create and edit. preventDefault stops the browser from
  // reloading the page, and `editing` decides which API endpoint to call.
  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const input = toInput(draft);
      // PUT with an id updates; POST without one creates.
      const response = editing
        ? await adminApi.updateDestination(editing.id, input)
        : await adminApi.createDestination(input);

      setFeedback({
        type: "success",
        message: response.message || (editing ? "Destination updated." : "Destination created."),
      });
      setFormOpen(false);
      clearDestinationsCache();
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setFeedback({ type: "error", message: getAdminErrorMessage(requestError) });
    } finally {
      setSaving(false);
    }
  }

  // Called only after the confirm dialog. On success we clear the target and
  // reload the list so the table matches the database.
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback(null);

    try {
      const response = await adminApi.deleteDestination(deleteTarget.id);
      setFeedback({
        type: "success",
        message: response.message || "Destination deleted.",
      });
      setDeleteTarget(null);
      clearDestinationsCache();
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setFeedback({ type: "error", message: getAdminErrorMessage(requestError) });
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<AdminDestination>[] = [
    {
      key: "name",
      header: "Destination",
      render: (row) => (
        <div className="flex items-center gap-3">
          {getString(row.image) && (
            <img
              src={getString(row.image)}
              alt=""
              className="h-10 w-10 shrink-0 rounded-xl border border-[#EBD5D3] object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{getString(row.name, "Untitled")}</p>
            <p className="truncate text-[11px] text-[#7A585B]">{getString(row.slug, "No slug")}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => (
        <span className="rounded-full bg-[#FFF0F2] px-2.5 py-1 text-[11px] font-bold text-[#800020]">
          {getString(row.category, "Uncategorized")}
        </span>
      ),
    },
    {
      key: "address",
      header: "Address",
      render: (row) => (
        <span className="line-clamp-2 text-xs text-[#7A585B]">{getString(row.address, "—")}</span>
      ),
    },
    {
      key: "hours",
      header: "Hours",
      render: (row) => (
        <span className="text-xs text-[#7A585B]">
          {getString(row.opening_hours ?? row.openingHours, "—")} -{" "}
          {getString(row.closing_hours ?? row.closingHours, "—")}
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

  // Build the category dropdown from loaded rows. Set removes duplicates and
  // filter(Boolean) removes empty categories.
  const categories = Array.from(
    new Set(items.map((item) => getString(item.category)).filter(Boolean))
  ).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#58111A]">Destinations</h2>
          <p className="mt-1 text-sm text-[#7A585B]">
            Create and maintain the visitor destination directory.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-[#800020] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#58111A]"
        >
          <Plus size={18} strokeWidth={2} aria-hidden="true" />
          New destination
        </button>
      </div>

      {feedback && (
        <FeedbackBanner
          message={feedback.message}
          type={feedback.type}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Changing a filter resets to page 1 so the user cannot land on an empty page. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search destinations..."
          label="Search destinations"
        />
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by category"
          className="w-full rounded-full border border-[#EBD5D3] bg-white px-4 py-2.5 text-sm text-[#58111A] outline-none focus:border-[#800020] sm:w-52"
        >
          <option value="">All categories</option>
          {categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingState message="Loading destinations..." />}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      )}

      {!loading && !error && (
        <>
          {/* Empty state, table, and pager are mutually exclusive views of the list. */}
          {items.length === 0 ? (
            <EmptyState
              title="No destinations found"
              message={
                search || category
                  ? "Try a different search or category filter."
                  : "Add the first destination from the API to get started."
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
          title={editing ? "Edit destination" : "New destination"}
          description="Fields are saved directly through the admin API."
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
                form="destination-form"
                disabled={saving}
                className="rounded-full bg-[#800020] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#58111A] disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Save changes" : "Create destination"}
              </button>
            </>
          }
        >
          {/* Inputs are controlled by draft. The Save button in the modal footer
              submits this form by id, keeping one submit path for create/edit. */}
          <form id="destination-form" onSubmit={submitForm} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Name *
              <input
                required
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                className={controlClass}
              />
            </label>
            {/* The slug is the public URL, so it is locked while editing. */}
            <label className={labelClass}>
              Slug
              <input
                value={draft.slug}
                onChange={(event) => updateDraft("slug", event.target.value)}
                disabled={editing !== null}
                className={`${controlClass} disabled:cursor-not-allowed disabled:bg-[#FAF6F5] disabled:text-[#7A585B]`}
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
            <label className={labelClass}>
              Image URL
              <input
                value={draft.image}
                onChange={(event) => updateDraft("image", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Short description
              <textarea
                rows={2}
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Overview
              <textarea
                rows={3}
                value={draft.overview}
                onChange={(event) => updateDraft("overview", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Address
              <input
                value={draft.address}
                onChange={(event) => updateDraft("address", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Municipality
              <input
                value={draft.municipality}
                onChange={(event) => updateDraft("municipality", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Barangays (comma separated)
              <input
                value={draft.barangays}
                onChange={(event) => updateDraft("barangays", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Location aliases / landmarks (comma separated)
              <input
                value={draft.location_aliases}
                onChange={(event) => updateDraft("location_aliases", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Opening hours
              <input
                value={draft.opening_hours}
                onChange={(event) => updateDraft("opening_hours", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Closing hours
              <input
                value={draft.closing_hours}
                onChange={(event) => updateDraft("closing_hours", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Operating days
              <input
                value={draft.operating_days}
                onChange={(event) => updateDraft("operating_days", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Entrance fee
              <input
                value={draft.entrance_fee}
                onChange={(event) => updateDraft("entrance_fee", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Contact number
              <input
                value={draft.contact_number}
                onChange={(event) => updateDraft("contact_number", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Official website
              <input
                value={draft.website_url}
                onChange={(event) => updateDraft("website_url", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Official social page
              <input
                value={draft.social_url}
                onChange={(event) => updateDraft("social_url", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Visitor / location note
              <textarea
                rows={2}
                value={draft.location_note}
                onChange={(event) => updateDraft("location_note", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Latitude
              <input
                type="number"
                step="any"
                value={draft.latitude}
                onChange={(event) => updateDraft("latitude", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Longitude
              <input
                type="number"
                step="any"
                value={draft.longitude}
                onChange={(event) => updateDraft("longitude", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Highlights (comma separated)
              <input
                value={draft.highlights}
                onChange={(event) => updateDraft("highlights", event.target.value)}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Facilities (comma separated)
              <input
                value={draft.facilities}
                onChange={(event) => updateDraft("facilities", event.target.value)}
                className={controlClass}
              />
            </label>
          </form>
        </Modal>
      )}

      {/* Delete only happens after this dialog is confirmed. */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete destination"
          message={`Delete "${getString(deleteTarget.name, "this destination")}"? This cannot be undone.`}
          confirmLabel="Delete destination"
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default DestinationsPage;
