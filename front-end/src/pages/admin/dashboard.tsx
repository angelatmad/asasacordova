import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  CalendarDays,
  Footprints,
  Heart,
  Mail,
  MapPinned,
  MessageSquareText,
  Users,
} from "lucide-react";
import { adminApi, getAdminErrorMessage, getNumber, getString } from "@/lib/admin-api";
import type { AdminDashboard, AdminEvent, AdminFeedback, AdminReview } from "@/lib/admin-api";
import { BarChart } from "@/components/admin/BarChart";
import type { BarChartDatum } from "@/components/admin/BarChart";
import { DataTable } from "@/components/admin/DataTable";
import type { DataTableColumn } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingState } from "@/components/admin/LoadingState";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { StatCard } from "@/components/admin/StatCard";

// Return the first key that holds a real number. The API may name a count
// "events" or "total_events", so trying several keys avoids blank cards.
function valueFrom(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = getNumber(record[key], Number.NaN);
    if (Number.isFinite(value)) return String(value);
  }
  return "—";
}

// Normalize different API chart shapes into { label, value } pairs for BarChart.
// The backend may return an array, a "data"/"items" list, or a plain object.
function toChartData(value: unknown): BarChartDatum[] {
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  if (!Array.isArray(value) && !record.data && !record.items) {
    // A plain object such as { Beach: 8 } is already label/value pairs.
    return Object.entries(record)
      .filter(([, entry]) => typeof entry === "number" || typeof entry === "string")
      .map(([label, entry]) => ({ label, value: getNumber(entry, 0) }));
  }

  const source = Array.isArray(value)
    ? value
    : (record.data ?? record.items);

  if (!Array.isArray(source)) return [];

  return source
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const item = entry as Record<string, unknown>;
        // Try common field names so renamed API columns still produce a chart.
        return {
          label: getString(
            item.label ?? item.name ?? item.category ?? item.month ?? item.destination,
            "Item"
          ),
          value: getNumber(item.value ?? item.count ?? item.total ?? item.quantity, 0),
        };
      }
      return { label: String(entry), value: 1 };
    })
    .filter((item) => item.label !== "Item");
}

// Admin home page: fetch the overview once, then show cards, a chart, links,
// and short recent-activity tables.
function DashboardPage() {
  // data is the API response; loading/error control the status messages.
  // reloadKey is a counter used by Refresh and Retry to re-run the request.
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // useCallback keeps this function stable so the effect below runs only when
  // its dependencies actually change.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminApi.dashboard());
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and after a retry. The timeout lets the loading UI render
  // before the network request begins.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadKey]);

  // Counts may live at the top level or inside totals/counts/stats. Merging all
  // of them means the cards work with either response layout.
  const summary = {
    ...(data?.totals ?? {}),
    ...(data?.counts ?? {}),
    ...(data?.stats ?? {}),
    ...(data ?? {}),
  };

  // The chart may be nested under "charts" or sent at the top level.
  const chartRecord = (data?.charts ?? {}) as Record<string, unknown>;
  const chartSource = chartRecord.destinations_by_category ?? chartRecord.destinations ?? data?.destinations_by_category;
  const chartData = toChartData(chartSource);

  // Each column tells DataTable which field to show and how to format it.
  const eventColumns: DataTableColumn<AdminEvent>[] = [
    {
      key: "title",
      header: "Event",
      render: (row) => <span className="font-semibold">{row.title}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (row) => <span className="text-xs text-[#7A585B]">{getString(row.date_label || row.date, "—")}</span>,
    },
    {
      key: "location",
      header: "Location",
      render: (row) => <span className="text-xs text-[#7A585B]">{getString(row.location, "—")}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className="rounded-full bg-[#FFF0F2] px-2.5 py-1 text-[11px] font-bold text-[#800020]">
          {row.is_published || row.published ? "Published" : "Draft"}
        </span>
      ),
    },
  ];

  // Reviews are read-only here; the full moderation tools live on the reviews page.
  const reviewColumns: DataTableColumn<AdminReview>[] = [
    {
      key: "destination",
      header: "Destination",
      render: (row) => (
        <span className="text-xs font-semibold">
          {getString(row.destination ?? row.destination_slug ?? row.destinationSlug, "—")}
        </span>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      render: (row) => <span className="font-bold text-[#800020]">{getNumber(row.rating, 0)}/5</span>,
    },
    {
      key: "comment",
      header: "Comment",
      render: (row) => (
        <span className="line-clamp-2 text-xs text-[#7A585B]">{getString(row.comment, "—")}</span>
      ),
    },
  ];

  // Same idea for feedback: only the fields useful in a quick overview.
  const feedbackColumns: DataTableColumn<AdminFeedback>[] = [
    {
      key: "subject",
      header: "Subject",
      render: (row) => <span className="font-semibold">{getString(row.subject, "—")}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className="rounded-full bg-[#FFF0F2] px-2.5 py-1 text-[11px] font-bold capitalize text-[#800020]">
          {getString(row.status, "—")}
        </span>
      ),
    },
    {
      key: "submitted",
      header: "Submitted",
      render: (row) => (
        <span className="text-xs text-[#7A585B]">{getString(row.created_at, "—")}</span>
      ),
    },
  ];

  // Fall back to empty arrays so .length and .map never crash if the API omits
  // one of these lists.
  const recentEvents = Array.isArray(data?.recent_events) ? data.recent_events : [];
  const recentReviews = Array.isArray(data?.recent_reviews) ? data.recent_reviews : [];
  const recentFeedback = Array.isArray(data?.recent_feedback) ? data.recent_feedback : [];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-[#58111A] to-[#800020] p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F2DCDA]/80">
          Asa sa Cordova Administration
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
          Tourism overview
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[#F2DCDA]">
          Monitor destinations, events, accounts, reviews, and visitor feedback from one place.
        </p>
      </div>

      {/* Show loading, then error, then the loaded dashboard content. */}
      {loading && <LoadingState message="Loading dashboard..." />}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      )}

      {!loading && !error && <SetupNotice setup={data?.setup} />}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Destinations"
              value={valueFrom(summary, ["destinations", "destinations_count", "total_destinations", "totalDestinations"])}
              icon={<MapPinned size={20} strokeWidth={2} aria-hidden="true" />}
            />
            <StatCard
              label="Events"
              value={valueFrom(summary, ["events", "events_count", "total_events", "totalEvents"])}
              icon={<CalendarDays size={20} strokeWidth={2} aria-hidden="true" />}
            />
            <StatCard
              label="Users"
              value={valueFrom(summary, ["users", "users_count", "total_users", "totalUsers"])}
              icon={<Users size={20} strokeWidth={2} aria-hidden="true" />}
            />
            <StatCard
              label="Reviews"
              value={valueFrom(summary, ["reviews", "reviews_count", "total_reviews", "totalReviews"])}
              icon={<MessageSquareText size={20} strokeWidth={2} aria-hidden="true" />}
            />
            <StatCard
              label="Feedback"
              value={valueFrom(summary, ["feedback", "feedback_count", "total_feedback", "totalFeedback"])}
              icon={<Mail size={20} strokeWidth={2} aria-hidden="true" />}
            />
            <StatCard
              label="Favorites"
              value={valueFrom(summary, ["favorites", "favorites_count", "total_favorites", "totalFavorites"])}
              icon={<Heart size={20} strokeWidth={2} aria-hidden="true" />}
            />
            <StatCard
              label="Visits"
              value={valueFrom(summary, ["visited", "visits", "visited_count", "total_visits", "totalVisited"])}
              icon={<Footprints size={20} strokeWidth={2} aria-hidden="true" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <BarChart title="Destinations by category" data={chartData} />
            <div className="rounded-3xl border border-[#EBD5D3] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 font-display text-lg font-semibold text-[#58111A]">
                Quick actions
              </h3>
              {/* These links reuse the sidebar routes so admins can jump to common tasks. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { to: "/admin/destinations", label: "Manage destinations", icon: MapPinned },
                  { to: "/admin/events", label: "Manage events", icon: CalendarDays },
                  { to: "/admin/users", label: "Manage users", icon: Users },
                  { to: "/admin/reviews", label: "Moderate feedback", icon: MessageSquareText },
                ].map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="flex items-center gap-3 rounded-2xl border border-[#EBD5D3] bg-[#FAF6F5] p-4 text-sm font-semibold text-[#58111A] transition hover:border-[#800020] hover:bg-[#FFF0F2]"
                  >
                    <action.icon
                      size={18}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="shrink-0 text-[#800020]"
                    />
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-[#58111A]">Recent events</h3>
                <Link to="/admin/events" className="text-xs font-bold text-[#800020] hover:underline">
                  View all
                </Link>
              </div>
              {recentEvents.length === 0 ? (
                <EmptyState message="No recent events were returned by the server." />
              ) : (
                <DataTable columns={eventColumns} rows={recentEvents} rowKey={(row) => row.id} />
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-[#58111A]">Recent reviews</h3>
                <Link to="/admin/reviews" className="text-xs font-bold text-[#800020] hover:underline">
                  View all
                </Link>
              </div>
              {recentReviews.length === 0 ? (
                <EmptyState message="No recent reviews were returned by the server." />
              ) : (
                <DataTable columns={reviewColumns} rows={recentReviews} rowKey={(row) => row.id} />
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-[#58111A]">Recent feedback</h3>
                <Link to="/admin/reviews" className="text-xs font-bold text-[#800020] hover:underline">
                  View all
                </Link>
              </div>
              {recentFeedback.length === 0 ? (
                <EmptyState message="No recent feedback was returned by the server." />
              ) : (
                <DataTable columns={feedbackColumns} rows={recentFeedback} rowKey={(row) => row.id} />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
