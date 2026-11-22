import { useCallback, useEffect, useState } from "react";
import { adminApi, getAdminErrorMessage, getNumber, getString } from "@/lib/admin-api";
import type { AdminAnalytics } from "@/lib/admin-api";
import { BarChart } from "@/components/admin/BarChart";
import type { BarChartDatum } from "@/components/admin/BarChart";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingState } from "@/components/admin/LoadingState";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { StatCard } from "@/components/admin/StatCard";

// Try several possible key names and return the first real number.
// Different backend versions may call the same count "users" or "total_users",
// so this keeps the cards filled either way. A dash means no number was found.
function valueFrom(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = getNumber(record[key], Number.NaN);
    if (Number.isFinite(value)) return String(value);
  }
  return "—";
}

// Convert whatever shape the API sends into the simple { label, value } list
// that BarChart expects. Accepting several shapes prevents a whole page break
// when the backend returns an object instead of an array.
function toChartData(value: unknown): BarChartDatum[] {
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  if (!Array.isArray(value) && !record.data && !record.items) {
    // Plain objects like { Beach: 12 } become chart pairs without extra code.
    return Object.entries(record)
      .filter(([, entry]) => typeof entry === "number" || typeof entry === "string")
      .map(([label, entry]) => ({ label, value: getNumber(entry, 0) }));
  }

  const source = Array.isArray(value) ? value : (record.data ?? record.items);
  if (!Array.isArray(source)) return [];

  return source
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const item = entry as Record<string, unknown>;
        // Row fields have different names; try the common ones so labels and
        // numbers are still found if the API renames a column.
        return {
          label: getString(
            item.label ?? item.name ?? item.category ?? item.month ?? item.destination ?? item.status,
            "Item"
          ),
          value: getNumber(item.value ?? item.count ?? item.total ?? item.quantity, 0),
        };
      }
      return { label: String(entry), value: 1 };
    })
    .filter((item) => item.label !== "Item");
}

// Admin analytics page: fetch the report, then draw number cards and charts.
function AnalyticsPage() {
  // data holds the API response; loading and error decide which message shows.
  // reloadKey is only a counter: changing it re-runs the request below, which
  // is how the Refresh and Retry buttons work.
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // useCallback keeps one stable function so the effect below does not loop.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminApi.analytics());
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  // Request once when the page opens and again whenever reloadKey changes.
  // The tiny timeout lets React show the loading state before the fetch starts.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadKey]);

  // Counts may sit at the top level or inside totals/stats. Merging all three
  // lets valueFrom() find them without knowing the backend's exact layout.
  const summary = {
    ...(data?.totals ?? {}),
    ...(data?.stats ?? {}),
    ...(data ?? {}),
  };

  const charts = data ? (data.charts ?? {}) : {};
  const chartRecord = charts && typeof charts === "object"
    ? (charts as Record<string, unknown>)
    : {};

  // Known chart names from the API. Both snake_case and camelCase are checked
  // because the response can come from different backend versions.
  const chartCandidates = [
    {
      title: "Destinations by category",
      data: data?.destinations_by_category ?? chartRecord.destinations_by_category ?? chartRecord.destinationsByCategory,
    },
    {
      title: "Events by category",
      data: data?.events_by_category ?? chartRecord.events_by_category ?? chartRecord.eventsByCategory,
    },
    {
      title: "Reviews by destination",
      data: data?.reviews_by_destination ?? chartRecord.reviews_by_destination ?? chartRecord.reviewsByDestination,
    },
    {
      title: "Rating distribution",
      data: data?.ratings_distribution ?? chartRecord.ratings_distribution ?? chartRecord.ratingsDistribution,
    },
    {
      title: "Monthly events",
      data: data?.monthly_events ?? chartRecord.monthly_events ?? chartRecord.monthlyEvents,
    },
    {
      title: "Feedback by status",
      data: data?.feedback_by_status ?? chartRecord.feedback_by_status ?? chartRecord.feedbackByStatus,
    },
  ];

  // Only keep series with real data so empty charts do not waste screen space.
  const renderedCharts = chartCandidates
    .map((candidate) => ({ title: candidate.title, data: toChartData(candidate.data) }))
    .filter((candidate) => candidate.data.length > 0);

  // If no known name matched, scan the remaining top-level fields for anything
  // that can be drawn. The limit of four keeps the page readable.
  if (renderedCharts.length === 0 && data) {
    const excluded = new Set([
      "totals",
      "stats",
      "charts",
      "message",
      "destinations_by_category",
      "events_by_category",
      "reviews_by_destination",
      "ratings_distribution",
      "monthly_events",
      "feedback_by_status",
    ]);

    Object.entries(data).forEach(([key, value]) => {
      if (excluded.has(key) || renderedCharts.length >= 4) return;
      const candidate = toChartData(value);
      if (candidate.length > 0) {
        renderedCharts.push({
          title: key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
          data: candidate,
        });
      }
    });
  }

  // Show the card grid only when at least one known count is numeric.
  const hasCounters = [
    "destinations",
    "events",
    "users",
    "reviews",
    "feedback",
    "total_destinations",
    "total_events",
    "total_users",
    "total_reviews",
  ].some((key) => Number.isFinite(getNumber(summary[key], Number.NaN)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#58111A]">Analytics</h2>
          <p className="mt-1 text-sm text-[#7A585B]">
            Figures and charts are calculated by the backend from real platform data.
          </p>
        </div>
        {/* Changing reloadKey re-runs the load effect, so this refreshes the report. */}
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="self-start rounded-full border border-[#800020] px-5 py-2.5 text-sm font-semibold text-[#800020] transition hover:bg-[#FFF0F2]"
        >
          Refresh
        </button>
      </div>

      {/* Only one state is visible at a time: loading, error, or loaded data. */}
      {loading && <LoadingState message="Loading analytics..." />}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      )}

      {!loading && !error && <SetupNotice setup={data?.setup} />}

      {!loading && !error && data && (
        <>
          {hasCounters ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Destinations"
                value={valueFrom(summary, ["destinations", "total_destinations", "totalDestinations"])}
              />
              <StatCard
                label="Events"
                value={valueFrom(summary, ["events", "total_events", "totalEvents"])}
              />
              <StatCard
                label="Users"
                value={valueFrom(summary, ["users", "total_users", "totalUsers"])}
              />
              <StatCard
                label="Reviews"
                value={valueFrom(summary, ["reviews", "total_reviews", "totalReviews"])}
              />
            </div>
          ) : (
            <EmptyState message="No summary counters were returned by the analytics API." />
          )}

          {renderedCharts.length === 0 ? (
            <EmptyState
              title="No charts available"
              message="The analytics API did not return any chart series to display."
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {renderedCharts.map((chart) => (
                <BarChart key={chart.title} title={chart.title} data={chart.data} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AnalyticsPage;
