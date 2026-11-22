<?php

namespace App\Http\Controllers\Admin;

use App\Models\Destination;
use App\Models\DestinationReview;
use App\Models\Event;
use App\Models\Favorite;
use App\Models\Feedback;
use App\Models\User;
use App\Models\VisitedDestination;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

// Gives the admin home page its summary cards and recent activity lists.
// Every read is guarded by a table flag because setup may still be incomplete.
class DashboardController extends AdminController
{
    // Return counts, five newest records per section, popular destinations,
    // a category chart, and setup flags in one response.
    public function index(): JsonResponse
    {
        // Only these tables are needed for the dashboard.
        $tables = [
            'users',
            'destinations',
            'events',
            'destination_reviews',
            'feedback',
            'favorites',
            'visited_destinations',
        ];

        $flags = $this->tableFlags($tables);
        $missing = $this->missingTables($flags);

        // A missing table contributes a zero instead of causing an error.
        $counts = [
            'users' => $flags['users'] ? User::count() : 0,
            'destinations' => $flags['destinations'] ? Destination::count() : 0,
            'events' => $flags['events'] ? Event::count() : 0,
            'reviews' => $flags['destination_reviews'] ? DestinationReview::count() : 0,
            'feedback' => $flags['feedback'] ? Feedback::count() : 0,
            'favorites' => $flags['favorites'] ? Favorite::count() : 0,
            'visited' => $flags['visited_destinations'] ? VisitedDestination::count() : 0,
        ];

        // latest() + limit(5) gives only the five newest accounts.
        $recentUsers = $flags['users']
            ? User::query()
                ->select('id', 'name', 'email', 'role', 'created_at')
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (User $user): array => [
                    'id' => (int) $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'created_at' => $this->formatDate($user->created_at),
                ])
                ->values()
                ->all()
            : [];

        // Eager load the author so each review does not need its own query.
        // Both tables must exist because the response includes the user's name.
        $recentReviews = $flags['destination_reviews'] && $flags['users']
            ? DestinationReview::query()
                ->with('user:id,name')
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (DestinationReview $review): array => [
                    'id' => (int) $review->id,
                    'rating' => (int) $review->rating,
                    'comment' => $review->comment,
                    'created_at' => $this->formatDate($review->created_at),
                    'user' => $review->user ? [
                        'id' => (int) $review->user->id,
                        'name' => $review->user->name,
                    ] : null,
                    'user_name' => $review->user?->name,
                    'destination_slug' => $review->destination_slug,
                ])
                ->values()
                ->all()
            : [];

        // is_published is cast to boolean so the UI can toggle it reliably.
        $recentEvents = $flags['events']
            ? Event::query()
                ->select('id', 'title', 'date', 'time', 'location', 'category', 'image', 'is_published', 'created_at')
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (Event $event): array => [
                    'id' => (int) $event->id,
                    'title' => $event->title,
                    'date' => $this->formatDate($event->date),
                    'time' => $event->time,
                    'location' => $event->location,
                    'category' => $event->category,
                    'image' => $event->image,
                    'is_published' => (bool) $event->is_published,
                    'created_at' => $this->formatDate($event->created_at),
                ])
                ->values()
                ->all()
            : [];

        // Feedback also needs the users table to show who sent each message.
        $recentFeedback = $flags['feedback'] && $flags['users']
            ? Feedback::query()
                ->with('user:id,name')
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (Feedback $feedback): array => [
                    'id' => (int) $feedback->id,
                    'subject' => $feedback->subject,
                    'message' => $feedback->message,
                    'status' => $feedback->status,
                    'user_name' => $feedback->user?->name,
                    'created_at' => $this->formatDate($feedback->created_at),
                ])
                ->values()
                ->all()
            : [];

        // These six-month series feed the small activity charts.
        $activity = [
            'registrations' => $this->monthlyActivity($flags['users'] ? 'users' : null, 'created_at'),
            'reviews' => $this->monthlyActivity($flags['destination_reviews'] ? 'destination_reviews' : null, 'created_at'),
        ];

        $destinationsByCategory = $this->destinationsByCategory($flags);

        $payload = [
            'counts' => $counts,
            'setup' => [
                'complete' => $missing === [],
                'tables' => $flags,
                'flags' => $flags,
                'missing_tables' => $missing,
            ],
            'recent_users' => $recentUsers,
            'recent_reviews' => $recentReviews,
            'recent_events' => $recentEvents,
            'recent_feedback' => $recentFeedback,
            'popular_destinations' => $this->popularDestinations($flags),
            'destinations_by_category' => $destinationsByCategory,
            'charts' => ['destinations_by_category' => $destinationsByCategory],
            'activity' => $activity,
            'registrations_over_time' => $activity['registrations'],
            'reviews_over_time' => $activity['reviews'],
        ];

        // 'data' repeats the payload for screens that read nested responses.
        return $this->json('Dashboard data retrieved successfully.', array_merge($payload, ['data' => $payload]));
    }

    // Group destinations by category for a pie/donut chart.
    // Blank categories are labelled 'Uncategorized' instead of showing an empty name.
    private function destinationsByCategory(array $flags): array
    {
        if (! $flags['destinations']) {
            return [];
        }

        $expression = "COALESCE(NULLIF(category, ''), 'Uncategorized')";

        return DB::table('destinations')
            ->selectRaw($expression.' as category, COUNT(*) as total')
            ->groupBy(DB::raw($expression))
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row): array => [
                'category' => $row->category,
                'name' => $row->category,
                'count' => (int) $row->total,
                'value' => (int) $row->total,
            ])
            ->all();
    }

    // Combine reviews, favorites, and visits into a simple popularity ranking.
    // Each aggregate is fetched once, then joined in PHP by destination slug.
    private function popularDestinations(array $flags): array
    {
        $reviews = $flags['destination_reviews']
            ? DB::table('destination_reviews')
                ->select('destination_slug')
                ->selectRaw('COUNT(*) as reviews_count')
                ->selectRaw('AVG(rating) as average_rating')
                ->groupBy('destination_slug')
                ->get()
                ->keyBy('destination_slug')
            : collect();

        $favorites = $flags['favorites']
            ? DB::table('favorites')
                ->select('destination_slug')
                ->selectRaw('COUNT(*) as favorites_count')
                ->groupBy('destination_slug')
                ->get()
                ->keyBy('destination_slug')
            : collect();

        $visits = $flags['visited_destinations']
            ? DB::table('visited_destinations')
                ->select('destination_slug')
                ->selectRaw('SUM(visit_count) as visits_count')
                ->groupBy('destination_slug')
                ->get()
                ->keyBy('destination_slug')
            : collect();

        // Use the destinations list when available so names and categories are real.
        if ($flags['destinations']) {
            return DB::table('destinations')
                ->select('id', 'slug', 'name', 'category')
                ->get()
                ->map(function ($destination) use ($reviews, $favorites, $visits): array {
                    $slug = $destination->slug;

                    return [
                        'id' => (int) $destination->id,
                        'slug' => $slug,
                        'name' => $destination->name,
                        'category' => $destination->category,
                        'reviews_count' => (int) ($reviews->get($slug)?->reviews_count ?? 0),
                        'average_rating' => round((float) ($reviews->get($slug)?->average_rating ?? 0), 2),
                        'favorites_count' => (int) ($favorites->get($slug)?->favorites_count ?? 0),
                        'visits_count' => (int) ($visits->get($slug)?->visits_count ?? 0),
                    ];
                })
                // Weighting: 1 review beats 100 favorites, and 1 favorite
                // beats 10 visits, so meaningful feedback rises to the top.
                ->sortByDesc(fn (array $item): int => ($item['reviews_count'] * 1000) + ($item['favorites_count'] * 10) + $item['visits_count'])
                ->take(5)
                ->values()
                ->all();
        }

        // Fallback: if destinations are not installed, rank by review slugs.
        if ($reviews->isEmpty()) {
            return [];
        }

        return $reviews
            ->map(function ($review, string $slug) use ($favorites, $visits): array {
                return [
                    'destination_slug' => $slug,
                    'slug' => $slug,
                    'name' => $slug,
                    'reviews_count' => (int) $review->reviews_count,
                    'average_rating' => round((float) $review->average_rating, 2),
                    'favorites_count' => (int) ($favorites->get($slug)?->favorites_count ?? 0),
                    'visits_count' => (int) ($visits->get($slug)?->visits_count ?? 0),
                ];
            })
            ->sortByDesc('reviews_count')
            ->take(5)
            ->values()
            ->all();
    }
}
