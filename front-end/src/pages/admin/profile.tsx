import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { adminApi, getAdminErrorMessage, getNumber, getString, unwrapEntity } from "@/lib/admin-api";
import type { AdminProfile, AdminUser } from "@/lib/admin-api";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingState } from "@/components/admin/LoadingState";
import { StatCard } from "@/components/admin/StatCard";

// Admin profile page: show the signed-in admin's account details and stats.
function ProfilePage() {
  // data is the raw response; user is the account object pulled out of it.
  const [data, setData] = useState<AdminProfile | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Bumping reloadKey is how Refresh/Retry asks for the profile again.
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch the profile. unwrapEntity tries "user" then "admin" because the API
  // may nest the account under either key; the fallback is the response itself.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await adminApi.profile();
      setData(payload);
      setUser(
        unwrapEntity<AdminUser>(payload, "user") ??
          unwrapEntity<AdminUser>(payload, "admin")
      );
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  // Run the request on mount and whenever reloadKey changes.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadKey]);

  // Only numeric stats can be shown as cards; text values are ignored.
  const stats = data?.stats ?? {};
  const statEntries = Object.entries(stats).filter(([, value]) =>
    Number.isFinite(getNumber(value, Number.NaN))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#58111A]">Admin profile</h2>
          <p className="mt-1 text-sm text-[#7A585B]">
            Account details returned by the admin profile endpoint.
          </p>
        </div>
        {/* Changing reloadKey re-runs the profile request. */}
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="self-start rounded-full border border-[#800020] px-5 py-2.5 text-sm font-semibold text-[#800020] transition hover:bg-[#FFF0F2]"
        >
          Refresh
        </button>
      </div>

      {loading && <LoadingState message="Loading admin profile..." />}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      )}

      {!loading && !error && (
        <>
          {/* Without an account object we show an empty state instead of
              reading properties from null. */}
          {!user ? (
            <EmptyState message="The profile API did not return an account record." />
          ) : (
            <div className="rounded-3xl border border-[#EBD5D3] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {/* A simple avatar: first letter of the name, or "A" if missing. */}
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#F2DCDA] font-display text-3xl font-bold text-[#800020]">
                  {getString(user.name, "A").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <span className="inline-block rounded-full bg-[#FFF0F2] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#800020]">
                    {getString(user.role, "admin")}
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-[#58111A]">
                    {getString(user.name, "Administrator")}
                  </h3>
                  <p className="mt-1 text-sm text-[#7A585B]">{getString(user.email, "—")}</p>
                </div>
              </div>

              <dl className="mt-8 grid grid-cols-1 gap-4 border-t border-[#EBD5D3] pt-6 sm:grid-cols-3">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-[#7A585B]">User ID</dt>
                  <dd className="mt-1 font-semibold text-[#58111A]">{String(user.id)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-[#7A585B]">Member since</dt>
                  <dd className="mt-1 font-semibold text-[#58111A]">{getString(user.created_at, "—")}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-[#7A585B]">Last updated</dt>
                  <dd className="mt-1 font-semibold text-[#58111A]">{getString(user.updated_at, "—")}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Turn keys like "total_users" into readable labels ("total users"). */}
          {statEntries.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statEntries.map(([key, value]) => (
                <StatCard
                  key={key}
                  label={key.replace(/_/g, " ")}
                  value={String(getNumber(value, 0))}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              to="/profile"
              className="rounded-full border border-[#800020] px-5 py-2.5 text-sm font-semibold text-[#800020] transition hover:bg-[#FFF0F2]"
            >
              Visitor profile
            </Link>
            <Link
              to="/admin/dashboard"
              className="rounded-full bg-[#800020] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#58111A]"
            >
              Back to dashboard
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default ProfilePage;
