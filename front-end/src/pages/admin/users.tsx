import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  getAdminErrorMessage,
  getString,
  normalizeAdminList,
  pageItems,
  unwrapEntity,
} from "@/lib/admin-api";
import type { AdminId, AdminRole, AdminUser } from "@/lib/admin-api";
import { DataTable } from "@/components/admin/DataTable";
import type { DataTableColumn } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { FeedbackBanner } from "@/components/admin/FeedbackBanner";
import { LoadingState } from "@/components/admin/LoadingState";
import { Modal } from "@/components/admin/Modal";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";

// Only the exact value "admin" gets admin access; anything else is a user.
// This keeps the filter and the role badge consistent with the server's check.
function userRole(user: AdminUser): AdminRole {
  return user.role === "admin" ? "admin" : "user";
}

// Admin users page: browse accounts, filter by role, change roles, and view details.
function UsersPage() {
  // List, debounced search, and role filter state.
  const [items, setItems] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Pagination state; "all" means no role filter.
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  // Banner message plus the id of the row whose role is being saved.
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [changingRole, setChangingRole] = useState<AdminId | null>(null);
  // Detail modal state: which id to load, the result, and its loading/error flags.
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<AdminId | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Debounce typing by 300 ms to avoid a request for every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Request users with the current search/role/page. useCallback keeps the
  // function stable so the effect below does not re-run on every render.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await adminApi.users({
        search: debouncedSearch || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        page,
        per_page: perPage,
      });
      // The API helper handles paginated and plain-array replies. We also check
      // the role locally in case the API ignores the role query parameter.
      const result = normalizeAdminList<AdminUser>(payload, page, perPage);
      const filtered = result.items.filter(
        (item) => roleFilter === "all" || userRole(item) === roleFilter
      );
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
  }, [debouncedSearch, page, perPage, roleFilter]);

  // Re-fetch when filters/page change or after a role update (reloadKey).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadKey]);

  // Fetch details only while the modal is open. isActive prevents a slow older
  // request from writing state after the modal closes or another user opens.
  useEffect(() => {
    if (!detailOpen || detailId === null) return;
    let isActive = true;

    adminApi
      .user(detailId)
      .then((payload) => {
        if (!isActive) return;
        setDetailUser(unwrapEntity<AdminUser>(payload, "user"));
      })
      .catch((requestError: unknown) => {
        if (isActive) setDetailError(getAdminErrorMessage(requestError));
      })
      .finally(() => {
        if (isActive) setDetailLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [detailId, detailOpen]);

  // Save the new role on the server, refresh the list, and update the open
  // detail card immediately so the user sees the change without extra clicks.
  async function changeRole(user: AdminUser, role: AdminRole) {
    setChangingRole(user.id);
    setFeedback(null);

    try {
      const response = await adminApi.updateUserRole(user.id, role);
      setFeedback({
        type: "success",
        message: response.message || `Role updated to ${role}.`,
      });
      setReloadKey((key) => key + 1);
      if (detailId === user.id && detailUser) {
        setDetailUser({ ...detailUser, role });
      }
    } catch (requestError) {
      setFeedback({ type: "error", message: getAdminErrorMessage(requestError) });
    } finally {
      setChangingRole(null);
    }
  }

  // Clear old details first so a previous user's data never flashes on screen.
  function openDetail(user: AdminUser) {
    setDetailId(user.id);
    setDetailLoading(true);
    setDetailError("");
    setDetailUser(null);
    setDetailOpen(true);
  }

  // The role column is a select, so admins can change access without leaving
  // the table. Its onChange calls changeRole() with the chosen value.
  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: "name",
      header: "User",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{getString(row.name, "Unnamed user")}</p>
          <p className="truncate text-[11px] text-[#7A585B]">{getString(row.email, "—")}</p>
        </div>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (row) => (
        <span className="text-xs text-[#7A585B]">{getString(row.created_at, "—")}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <select
          value={userRole(row)}
          disabled={changingRole === row.id}
          onChange={(event) => void changeRole(row, event.target.value as AdminRole)}
          aria-label={`Role for ${getString(row.name, "user")}`}
          className="rounded-full border border-[#EBD5D3] bg-white px-3 py-1.5 text-[11px] font-bold text-[#800020] outline-none focus:border-[#800020] disabled:opacity-50"
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <button
          type="button"
          onClick={() => openDetail(row)}
          className="rounded-full border border-[#800020] px-3 py-1.5 text-[11px] font-bold text-[#800020] transition hover:bg-[#800020] hover:text-white"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#58111A]">Users</h2>
        <p className="mt-1 text-sm text-[#7A585B]">
          Review registered accounts and manage administrator access.
        </p>
      </div>

      {feedback && (
        <FeedbackBanner
          message={feedback.message}
          type={feedback.type}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Filter changes reset the page so results start from page 1. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name or email..."
          label="Search users"
        />
        <select
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by role"
          className="w-full rounded-full border border-[#EBD5D3] bg-white px-4 py-2.5 text-sm text-[#58111A] outline-none focus:border-[#800020] sm:w-48"
        >
          <option value="all">All roles</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
        </select>
      </div>

      {loading && <LoadingState message="Loading users..." />}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      )}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <EmptyState
              title="No users found"
              message={
                search || roleFilter !== "all"
                  ? "Try a different search or role filter."
                  : "No registered users were returned by the server."
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

      {/* The modal shows loading, error, or details depending on the request. */}
      {detailOpen && (
        <Modal
          title="User details"
          description="Account information loaded from the admin API."
          onClose={() => setDetailOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="rounded-full bg-[#800020] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#58111A]"
            >
              Close
            </button>
          }
        >
          {detailLoading && <LoadingState message="Loading user details..." compact />}
          {!detailLoading && detailError && <ErrorState message={detailError} />}
          {!detailLoading && !detailError && detailUser && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F2DCDA] font-display text-xl font-bold text-[#800020]">
                  {getString(detailUser.name, "?").charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-[#58111A]">
                    {getString(detailUser.name, "Unnamed user")}
                  </p>
                  <p className="text-xs text-[#7A585B]">{getString(detailUser.email, "—")}</p>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-3 rounded-2xl bg-[#FAF6F5] p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-[#7A585B]">User ID</dt>
                  <dd className="mt-1 font-semibold text-[#58111A]">{String(detailUser.id)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-[#7A585B]">Role</dt>
                  <dd className="mt-1 font-semibold capitalize text-[#800020]">{userRole(detailUser)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-[#7A585B]">Joined</dt>
                  <dd className="mt-1 font-semibold text-[#58111A]">{getString(detailUser.created_at, "—")}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-[#7A585B]">Updated</dt>
                  <dd className="mt-1 font-semibold text-[#58111A]">{getString(detailUser.updated_at, "—")}</dd>
                </div>
              </dl>
              {/* Disable the current role and any button while a save is running. */}
              <div>
                <p className="mb-2 text-xs font-semibold text-[#58111A]">Change role</p>
                <div className="flex gap-2">
                  {(["user", "admin"] as AdminRole[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={changingRole === detailUser.id || userRole(detailUser) === option}
                      onClick={() => void changeRole(detailUser, option)}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                        userRole(detailUser) === option
                          ? "bg-[#800020] text-white"
                          : "border border-[#800020] text-[#800020] hover:bg-[#FFF0F2]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export default UsersPage;
