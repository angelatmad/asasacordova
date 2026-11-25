<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

/** A place in the Cordova directory, identified by slug for friendly URLs. */
class Destination extends Model
{
    // Only these columns can be mass-assigned when an admin saves a destination.
    protected $fillable = [
        'slug',
        'name',
        'category',
        'image',
        'description',
        'overview',
        'highlights',
        'address',
        'municipality',
        'barangays',
        'location_aliases',
        'opening_hours',
        'closing_hours',
        'operating_days',
        'entrance_fee',
        'contact_number',
        'website_url',
        'social_url',
        'facilities',
        'latitude',
        'longitude',
        'location_note',
        'route_steps',
    ];

    // JSON columns store lists and are cast back to PHP arrays; coordinates become floats.
    protected $casts = [
        'highlights' => 'array',
        'facilities' => 'array',
        'barangays' => 'array',
        'location_aliases' => 'array',
        'route_steps' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
        // These values are added by the public API's review summary helper.
        'reviews_count' => 'integer',
        'average_rating' => 'float',
        'rating_distribution' => 'array',
        'featured_review' => 'array',
    ];

    // Reviews, favorites and visits link by slug, not by the numeric id.
    /** All reviews written about this destination. */
    public function reviews()
    {
        return $this->hasMany(DestinationReview::class, 'destination_slug', 'slug');
    }

    public function validReviews(): HasMany
    {
        return $this->reviews()->whereBetween('rating', [1, 5]);
    }

    public function withReviewSummary(): self
    {
        $reviews = $this->relationLoaded('validReviews')
            ? $this->getRelation('validReviews')
            : $this->validReviews()->with('user')->get();

        $validReviews = $reviews->filter(fn (DestinationReview $review): bool => $this->isValidReview($review));
        $count = $validReviews->count();
        $average = $count > 0 ? round((float) $validReviews->avg('rating'), 2) : null;
        $distribution = $this->ratingDistribution($validReviews);

        $this->setAttribute('reviews_count', $count);
        $this->setAttribute('average_rating', $average);
        $this->setAttribute('rating_distribution', $distribution);
        $this->setAttribute('featured_review', $this->featuredReview($validReviews, $distribution, $average));

        return $this;
    }

    private function isValidReview(DestinationReview $review): bool
    {
        $rating = (int) $review->rating;

        return $rating >= 1 && $rating <= 5 && trim((string) $review->comment) !== '';
    }

    private function ratingDistribution(Collection $reviews): array
    {
        $distribution = array_fill_keys(['1', '2', '3', '4', '5'], 0);

        foreach ($reviews as $review) {
            $distribution[(string) (int) $review->rating] += 1;
        }

        return $distribution;
    }

    private function featuredReview(Collection $reviews, array $distribution, ?float $average): ?array
    {
        $highestCount = max($distribution);

        if ($highestCount === 0 || $average === null) {
            return null;
        }

        $ratings = collect(array_keys($distribution))
            ->filter(fn (string $rating): bool => $distribution[$rating] === $highestCount)
            ->map(fn (string $rating): int => (int) $rating)
            ->sort(function (int $left, int $right) use ($average): int {
                $distance = abs($left - $average) <=> abs($right - $average);

                return $distance !== 0 ? $distance : $left <=> $right;
            })
            ->values();

        $featuredRating = $ratings->first();
        $review = $reviews
            ->filter(fn (DestinationReview $item): bool => (int) $item->rating === $featuredRating)
            ->sort(function (DestinationReview $left, DestinationReview $right): int {
                return [
                    $right->created_at?->getTimestamp() ?? 0,
                    (int) $right->id,
                ] <=> [
                    $left->created_at?->getTimestamp() ?? 0,
                    (int) $left->id,
                ];
            })
            ->first();

        if ($review === null) {
            return null;
        }

        return [
            'id' => (int) $review->id,
            'rating' => (int) $review->rating,
            'comment' => (string) $review->comment,
            'author_name' => $review->user?->name,
            'created_at' => $review->created_at?->toISOString(),
        ];
    }

    /** Users who saved this destination to their favorites. */
    public function favorites()
    {
        return $this->hasMany(Favorite::class, 'destination_slug', 'slug');
    }

    /** Visit logs that record how often users opened this destination. */
    public function visitedDestinations()
    {
        return $this->hasMany(VisitedDestination::class, 'destination_slug', 'slug');
    }
}
