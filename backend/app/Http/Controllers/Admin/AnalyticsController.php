<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

// Builds the totals, leaderboards, and chart data for the admin Analytics page.
// Each query is skipped when its table is missing, so incomplete setup still works.
class AnalyticsController extends AdminController
{
    // Return one JSON response containing counts, top lists, monthly activity,
    // charts, and setup flags that the front end uses to build the whole page.
    public function index(): JsonResponse
    {
        // Flags let us avoid querying tables that do not exist yet.
        $flags = $this->tableFlags([
            'destinations',
            'destination_reviews',
            'favorites',
            'visited_destinations',
            'users',
            'events',
            'feedback',
        ]);
        $missing = $this->missingTables($flags);

        $destinations = $flags['destinations']
            ? DB::table('destinations')->select('id', 'slug', 'name', 'category')->get()
            : collect();

        // GROUP BY gives one row per destination, with review count and average rating.
        $reviews = $flags['destination_reviews']
            ? DB::table('destination_reviews')
                ->select('destination_slug')
                ->selectRaw('COUNT(*) as reviews_count')
                ->selectRaw('AVG(rating) as average_rating')
                ->groupBy('destination_slug')
                ->get()
                ->keyBy('destination_slug')
            : collect();

        // COUNT(*) counts how many users saved each destination.
        $favorites = $flags['favorites']
            ? DB::table('favorites')
                ->select('destination_slug')
                ->selectRaw('COUNT(*) as favorites_count')
                ->groupBy('destination_slug')
                ->get()
                ->keyBy('destination_slug')
            : collect();

        // SUM adds up repeat visits stored in each user's visited record.
        $visits = $flags['visited_destinations']
            ? DB::table('visited_destinations')
                ->select('destination_slug')
                ->selectRaw('SUM(visit_count) as visits_count')
                ->groupBy('destination_slug')
                ->get()
                ->keyBy('destination_slug')
            : collect();

        // keyBy() above means each result can be found by slug in O(1) below.
        // Show the real destination name when available, otherwise use the slug.
        $nameFor = function (string $slug) use ($destinations): string {
            $destination = $destinations->firstWhere('slug', $slug);

            return $destination ? (string) $destination->name : $slug;
        };

        // Sort by favorites, keep the top 10, and reset keys for a clean JSON array.
        $mostFavorited = $favorites
            ->map(function ($row, string $slug) use ($nameFor): array {
                return [
                    'destination_slug' => $slug,
                    'slug' => $slug,
                    'name' => $nameFor($slug),
                    'favorites_count' => (int) $row->favorites_count,
                ];
            })
            ->sortByDesc('favorites_count')
            ->take(10)
            ->values()
            ->all();

        $mostVisited = $visits
            ->map(function ($row, string $slug) use ($nameFor): array {
                return [
                    'destination_slug' => $slug,
                    'slug' => $slug,
                    'name' => $nameFor($slug),
                    'visits_count' => (int) $row->visits_count,
                    'visit_count' => (int) $row->visits_count,
                ];
            })
            ->sortByDesc('visits_count')
            ->take(10)
            ->values()
            ->all();

        // Ignore destinations with no reviews, then sort by rating.
        // Review count breaks ties so a proven rating ranks higher.
        $highestRated = $reviews
            ->filter(fn ($row): bool => (int) $row->reviews_count > 0)
            ->map(function ($row, string $slug) use ($nameFor): array {
                return [
                    'destination_slug' => $slug,
                    'slug' => $slug,
                    'name' => $nameFor($slug),
                    'reviews_count' => (int) $row->reviews_count,
                    'average_rating' => round((float) $row->average_rating, 2),
                ];
            })
            ->sort(function (array $left, array $right): int {
                return [$right['average_rating'], $right['reviews_count']]
                    <=> [$left['average_rating'], $left['reviews_count']];
            })
            ->take(10)
            ->values()
            ->all();

        // MonthlyActivity fills in zero-count months for smooth chart lines.
        $activity = [
            'registrations' => $this->monthlyActivity($flags['users'] ? 'users' : null, 'created_at'),
            'reviews' => $this->monthlyActivity($flags['destination_reviews'] ? 'destination_reviews' : null, 'created_at'),
            'events' => $this->monthlyActivity($flags['events'] ? 'events' : null, 'created_at'),
        ];

        // Plain row counts for the summary cards.
        $counts = [
            'destinations' => $flags['destinations'] ? DB::table('destinations')->count() : 0,
            'events' => $flags['events'] ? DB::table('events')->count() : 0,
            'users' => $flags['users'] ? DB::table('users')->count() : 0,
            'reviews' => $flags['destination_reviews'] ? DB::table('destination_reviews')->count() : 0,
            'feedback' => $flags['feedback'] ? DB::table('feedback')->count() : 0,
            'favorites' => $flags['favorites'] ? DB::table('favorites')->count() : 0,
            'visited' => $flags['visited_destinations'] ? DB::table('visited_destinations')->count() : 0,
        ];

        // Each chart is a list of label/value pairs; groupedCounts handles the
        // simple GROUP BY cases, while reviews are reused from the query above.
        // COALESCE(NULLIF(..., ''), '...') labels blank categories/statuses.
        $charts = [
            'destinations_by_category' => $this->groupedCounts(
                $flags['destinations'] ? 'destinations' : null,
                "COALESCE(NULLIF(category, ''), 'Uncategorized')"
            ),
            'events_by_category' => $this->groupedCounts(
                $flags['events'] ? 'events' : null,
                "COALESCE(NULLIF(category, ''), 'Uncategorized')"
            ),
            'reviews_by_destination' => $reviews
                ->map(function ($row, string $slug) use ($nameFor): array {
                    $count = (int) $row->reviews_count;

                    return [
                        'destination' => $slug,
                        'name' => $nameFor($slug),
                        'label' => $nameFor($slug),
                        'count' => $count,
                        'value' => $count,
                    ];
                })
                ->sortByDesc('count')
                ->take(10)
                ->values()
                ->all(),
            'ratings_distribution' => $this->groupedCounts(
                $flags['destination_reviews'] ? 'destination_reviews' : null,
                'rating'
            ),
            'monthly_events' => $activity['events'],
            'feedback_by_status' => $this->groupedCounts(
                $flags['feedback'] ? 'feedback' : null,
                "COALESCE(NULLIF(status, ''), 'pending')"
            ),
        ];

        // Collect everything the Analytics screen needs into one response body.
        $payload = [
            'most_favorited' => $mostFavorited,
            'most_visited' => $mostVisited,
            'highest_rated' => $highestRated,
            'registrations_over_time' => $activity['registrations'],
            'reviews_over_time' => $activity['reviews'],
            'activity' => $activity,
            'counts' => $counts,
            'totals' => $counts,
            'charts' => $charts,
            'setup' => [
                'complete' => $missing === [],
                'tables' => $flags,
                'flags' => $flags,
                'missing_tables' => $missing,
            ],
        ];

        // Repeat counts at the top level and inside 'data' for older screens
        // that read one shape or the other.
        return $this->json(
            'Analytics data retrieved successfully.',
            array_merge($counts, $payload, ['data' => array_merge($counts, $payload)])
        );
    }

    // Group rows by one SQL expression and return chart-friendly totals.
    // Returning [] when the table is missing keeps the caller simple.
    private function groupedCounts(?string $table, string $expression): array
    {
        if ($table === null) {
            return [];
        }

        return DB::table($table)
            ->selectRaw($expression.' as label, COUNT(*) as total')
            ->groupBy(DB::raw($expression))
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row): array => [
                'label' => (string) $row->label,
                'name' => (string) $row->label,
                'count' => (int) $row->total,
                'value' => (int) $row->total,
            ])
            ->all();
    }
}
