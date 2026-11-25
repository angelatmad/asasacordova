import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  adminApi,
  getAdminErrorMessage,
  getNumber,
  getString,
  normalizeAdminList,
  pageItems,
} from "@/lib/admin-api";
import type { AdminFeedback, AdminId, AdminReview } from "@/lib/admin-api";
import { clearDestinationsCache } from "@/lib/destination-api";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { FeedbackBanner } from "@/components/admin/FeedbackBanner";
import { LoadingState } from "@/components/admin/LoadingState";
import { Modal } from "@/components/admin/Modal";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";

// Which moderation list is on screen. "all" mixes reviews and feedback.
type Tab = "review" | "feedback" | "all";

// Remembers what the confirm dialog should delete. Replies need parentId so the
// API knows which review the reply belongs to.
interface DeleteTarget {
  kind: "review" | "reply" | "feedback";
  id: AdminId;
  parentId?: AdminId;
  label: string;
}

// Show the linked user's name, or a short fallback when the API only returns an
// id. This keeps cards readable even for older records.
function authorName(record: { user?: { name?: string } | null; user_id?: AdminId | null }): string {
  return getString(record.user?.name, record.user_id ? `User ${String(record.user_id)}` : "Anonymous");
}

// Moderation page: review destination ratings, reply to visitor feedback,
// change feedback status, and delete reviews/replies/feedback.
function ReviewsPage() {
  // Active tab and filter state. Search is debounced before it reaches the API.
  const [tab, setTab] = useState<Tab>("review");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  // Each tab keeps its own list so switching tabs does not show stale rows.
  const [perPage] = useState(10);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [allActivity, setAllActivity] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // reloadKey re-runs the request after a change; notice is the banner message.
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  // deleteTarget/deleting drive the confirm dialog. The rest drive the reply
  // modal and remember which single row is busy changing status.
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<AdminFeedback | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<AdminId | null>(null);

  // Debounce typing so a pause creates one request instead of many.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Feedback and reviews live on different API endpoints, so the active tab
  // decides which request runs. Both send search/status/page as query params.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (tab === "feedback") {
        const payload = await adminApi.feedback({
          search: debouncedSearch || undefined,
          status: status === "all" ? undefined : status,
          page,
          per_page: perPage,
        });
        // Extra local status check protects against APIs that ignore the query.
        const result = normalizeAdminList<AdminFeedback>(payload, page, perPage);
        const filtered = result.items.filter(
          (item) => status === "all" || item.status === status
        );
        const visible = result.isPaginated ? filtered : pageItems(filtered, page, perPage);
        setFeedback(visible);
        setTotal(result.isPaginated ? result.total : filtered.length);
        setLastPage(
          result.isPaginated
            ? result.lastPage
            : Math.max(1, Math.ceil(filtered.length / perPage))
        );
        } else {
          // "review" and "all" share this endpoint; only the type param differs.
          const payload = await adminApi.reviews(tab, {
          search: debouncedSearch || undefined,
          status: status === "all" ? undefined : status,
          page,
          per_page: perPage,
        });
        const result = normalizeAdminList<AdminReview>(payload, page, perPage);
        const visible = result.isPaginated
          ? result.items
          : pageItems(result.items, page, perPage);
        if (tab === "all") setAllActivity(visible);
        else setReviews(visible);
        setTotal(result.isPaginated ? result.total : result.items.length);
        setLastPage(
          result.isPaginated
            ? result.lastPage
            : Math.max(1, Math.ceil(result.items.length / perPage))
        );
      }
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, perPage, status, tab]);

  // Re-fetch on filter/tab/page changes and after a successful modification.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadKey]);

  // Small helper used by delete, status change, and reply after success.
  function reload() {
    setReloadKey((key) => key + 1);
  }

  // One dialog handles three delete kinds; `kind` chooses the endpoint.
  // A reply also needs its parent review id in the URL.
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setNotice(null);

    try {
      let response;
      if (deleteTarget.kind === "review") {
        response = await adminApi.deleteReview(deleteTarget.id);
      } else if (deleteTarget.kind === "reply" && deleteTarget.parentId !== undefined) {
        response = await adminApi.deleteReviewReply(deleteTarget.parentId, deleteTarget.id);
      } else {
        response = await adminApi.deleteFeedback(deleteTarget.id);
      }

      setNotice({ type: "success", message: response.message || "Deleted successfully." });
      clearDestinationsCache();
      setDeleteTarget(null);
      reload();
    } catch (requestError) {
      setNotice({ type: "error", message: getAdminErrorMessage(requestError) });
    } finally {
      setDeleting(false);
    }
  }

  // Track the row id so only that button is disabled while the PUT request runs.
  async function changeStatus(item: AdminFeedback, nextStatus: "pending" | "resolved") {
    setUpdatingStatus(item.id);
    setNotice(null);

    try {
      const response = await adminApi.updateFeedbackStatus(item.id, nextStatus);
      setNotice({ type: "success", message: response.message || "Status updated." });
      reload();
    } catch (requestError) {
      setNotice({ type: "error", message: getAdminErrorMessage(requestError) });
    } finally {
      setUpdatingStatus(null);
    }
  }

  // Send the replyText draft to the feedback API, then clear it and reload.
  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!replyTarget || !replyText.trim()) return;
    setReplying(true);
    setNotice(null);

    try {
      const response = await adminApi.replyToFeedback(replyTarget.id, replyText.trim());
      setNotice({ type: "success", message: response.message || "Reply sent." });
      setReplyTarget(null);
      setReplyText("");
      reload();
    } catch (requestError) {
      setNotice({ type: "error", message: getAdminErrorMessage(requestError) });
    } finally {
      setReplying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#58111A]">Reviews & Feedback</h2>
        <p className="mt-1 text-sm text-[#7A585B]">
          Moderate destination reviews and respond to visitor feedback.
        </p>
      </div>

      {/* Switching tabs also resets pagination to page 1. */}
      <div className="flex flex-wrap gap-2">
        {([
          { value: "review", label: "Destination reviews" },
          { value: "feedback", label: "Visitor feedback" },
          { value: "all", label: "All activity" },
        ] as Array<{ value: Tab; label: string }>).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setTab(option.value);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              tab === option.value
                ? "bg-[#800020] text-white shadow-md"
                : "border border-[#EBD5D3] bg-white text-[#58111A] hover:border-[#800020] hover:bg-[#FFF0F2]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {notice && (
        <FeedbackBanner
          message={notice.message}
          type={notice.type}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Filter changes reset the page so results always start at the top. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={tab === "feedback" ? "Search feedback..." : "Search reviews..."}
          label="Search moderation items"
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="w-full rounded-full border border-[#EBD5D3] bg-white px-4 py-2.5 text-sm text-[#58111A] outline-none focus:border-[#800020] sm:w-52"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading && <LoadingState message="Loading moderation items..." />}

      {!loading && error && (
        <ErrorState message={error} onRetry={reload} />
      )}

      {/* Each conditional block shows only the list for the active tab. */}
      {!loading && !error && tab === "review" && (
        <>
          {reviews.length === 0 ? (
            <EmptyState
              title="No reviews found"
              message={search ? "Try a different search." : "No destination reviews were returned by the server."}
            />
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-3xl border border-[#EBD5D3] bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#800020]">
                        {getString(review.destination ?? review.destination_slug ?? review.destinationSlug, "Unknown destination")}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-semibold text-[#58111A]">
                        {authorName(review)} · {getNumber(review.rating, 0)}/5
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#7A585B]">{getString(review.created_at, "—")}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            kind: "review",
                            id: review.id,
                            label: `the review by ${authorName(review)}`,
                          })
                        }
                        className="rounded-full border border-[#F2DCDA] px-3 py-1.5 text-[11px] font-bold text-[#722F37] hover:bg-[#F2DCDA]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-[#7A585B]">
                    {getString(review.comment, "No comment text available.")}
                  </p>
                  {/* Replies are nested under a review, so render them only
                      when the array exists and is not empty. */}
                  {review.replies && review.replies.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-[#EBD5D3] pt-4">
                      {review.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start justify-between gap-3 rounded-xl bg-[#FAF6F5] p-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#58111A]">
                              {getString(reply.user?.name, `User ${String(reply.user_id ?? "?")}`)}
                            </p>
                            <p className="mt-1 text-xs text-[#7A585B]">
                              {getString(reply.reply ?? reply.comment, "—")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                kind: "reply",
                                id: reply.id,
                                parentId: review.id,
                                label: "this reply",
                              })
                            }
                            className="shrink-0 rounded-full border border-[#F2DCDA] px-3 py-1 text-[10px] font-bold text-[#722F37] hover:bg-[#F2DCDA]"
                          >
                            Delete reply
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !error && tab === "feedback" && (
        <>
          {feedback.length === 0 ? (
            <EmptyState
              title="No feedback found"
              message={search || status !== "all" ? "Try changing your search or filters." : "No feedback was returned by the server."}
            />
          ) : (
            <div className="space-y-4">
              {feedback.map((item) => (
                <article key={item.id} className="rounded-3xl border border-[#EBD5D3] bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-[#58111A]">
                        {getString(item.subject, "No subject")}
                      </h3>
                      <p className="mt-1 text-xs text-[#7A585B]">
                        {authorName(item)} · {getString(item.created_at, "—")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize ${
                        item.status === "resolved"
                          ? "bg-[#F2DCDA] text-[#722F37]"
                          : "bg-[#FFF0F2] text-[#800020]"
                      }`}
                    >
                      {getString(item.status, "pending")}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-[#7A585B]">
                    {getString(item.message, "No message text available.")}
                  </p>

                  {item.replies && item.replies.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-[#EBD5D3] pt-4">
                      {item.replies.map((reply) => (
                        <div key={reply.id} className="rounded-xl bg-[#FAF6F5] p-3">
                          <p className="text-xs font-bold text-[#58111A]">
                            {getString(reply.user?.name, `User ${String(reply.user_id ?? "?")}`)}
                          </p>
                          <p className="mt-1 text-xs text-[#7A585B]">{getString(reply.reply, "—")}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#EBD5D3] pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTarget(item);
                        setReplyText("");
                      }}
                      className="rounded-full bg-[#800020] px-4 py-2 text-[11px] font-bold text-white transition hover:bg-[#58111A]"
                    >
                      Reply
                    </button>
                    {/* Toggle between pending and resolved from the current value. */}
                    <button
                      type="button"
                      disabled={updatingStatus === item.id}
                      onClick={() => void changeStatus(item, item.status === "resolved" ? "pending" : "resolved")}
                      className="rounded-full border border-[#800020] px-4 py-2 text-[11px] font-bold text-[#800020] transition hover:bg-[#FFF0F2] disabled:opacity-50"
                    >
                      Mark {item.status === "resolved" ? "pending" : "resolved"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "feedback",
                          id: item.id,
                          label: `the feedback "${getString(item.subject, "item")}"`,
                        })
                      }
                      className="rounded-full border border-[#F2DCDA] px-4 py-2 text-[11px] font-bold text-[#722F37] transition hover:bg-[#F2DCDA]"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !error && tab === "all" && (
        <>
          {allActivity.length === 0 ? (
            <EmptyState message="No activity was returned by the server." />
          ) : (
            <div className="space-y-3">
              {allActivity.map((item, index) => {
                // This list can mix reviews and feedback, so read fields safely
                // with getString and fall back when a field is absent.
                const record = item as unknown as Record<string, unknown>;
                const text = getString(record.comment ?? record.message ?? record.reply, "No text available.");
                return (
                  <div key={`${String(item.id)}-${index}`} className="rounded-2xl border border-[#EBD5D3] bg-white p-4">
                    <p className="text-xs font-bold text-[#800020]">
                      {getString(record.subject ?? record.destination ?? record.destination_slug, "Activity")}
                    </p>
                    <p className="mt-2 text-sm text-[#7A585B]">{text}</p>
                    <p className="mt-2 text-[11px] text-[#7A585B]/70">{getString(record.created_at, "—")}</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <Pagination
        page={page}
        lastPage={lastPage}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
      />

      {/* Shared confirm dialog; the message comes from deleteTarget.label. */}
      {deleteTarget && (
        <ConfirmDialog
          title="Confirm deletion"
          message={`Delete ${deleteTarget.label}? This cannot be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Reply draft lives in replyText; Send is disabled while it is empty. */}
      {replyTarget && (
        <Modal
          title={`Reply to: ${getString(replyTarget.subject, "feedback")}`}
          description="The reply is sent through the admin feedback API."
          onClose={() => setReplyTarget(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="rounded-full border border-[#EBD5D3] bg-white px-5 py-2.5 text-sm font-semibold text-[#58111A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="feedback-reply-form"
                disabled={replying || !replyText.trim()}
                className="rounded-full bg-[#800020] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#58111A] disabled:opacity-50"
              >
                {replying ? "Sending..." : "Send reply"}
              </button>
            </>
          }
        >
          <form id="feedback-reply-form" onSubmit={submitReply}>
            <label className="block text-xs font-semibold text-[#58111A]">
              Reply message
              <textarea
                required
                rows={5}
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Write a response to the visitor..."
                className="mt-2 w-full rounded-xl border border-[#EBD5D3] bg-white px-3.5 py-2.5 text-sm text-[#58111A] outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15"
              />
            </label>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default ReviewsPage;
