<?php

namespace Tests\Feature;

use App\Models\Destination;
use App\Models\DestinationReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class DestinationFeaturedReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_mostly_one_star_reviews_feature_the_one_star_group_without_changing_average(): void
    {
        $destination = $this->createDestination();
        $user = User::factory()->create(['name' => 'Maria Santos']);

        for ($index = 1; $index <= 8; $index += 1) {
            $this->createReview($destination, $user, 1, "One star review {$index}");
        }
        $this->createReview($destination, $user, 2, 'Two star review');
        for ($index = 1; $index <= 2; $index += 1) {
            $this->createReview($destination, $user, 3, "Three star review {$index}");
        }
        for ($index = 1; $index <= 5; $index += 1) {
            $this->createReview($destination, $user, 4, "Four star review {$index}");
        }
        for ($index = 1; $index <= 3; $index += 1) {
            $this->createReview($destination, $user, 5, "Five star review {$index}");
        }

        $this->getJson('/api/destinations/featured-place')
            ->assertOk()
            ->assertJsonPath('reviews_count', 19)
            ->assertJsonPath('average_rating', 2.68)
            ->assertJsonPath('rating_distribution.1', 8)
            ->assertJsonPath('rating_distribution.2', 1)
            ->assertJsonPath('rating_distribution.3', 2)
            ->assertJsonPath('rating_distribution.4', 5)
            ->assertJsonPath('rating_distribution.5', 3)
            ->assertJsonPath('featured_review.rating', 1)
            ->assertJsonPath('featured_review.comment', 'One star review 8')
            ->assertJsonPath('featured_review.author_name', 'Maria Santos');
    }

    public function test_list_endpoint_includes_featured_review(): void
    {
        $destination = $this->createDestination();
        $user = User::factory()->create(['name' => 'List Reviewer']);

        $this->createReview($destination, $user, 2, 'First two star review');
        $this->createReview($destination, $user, 2, 'Second two star review');
        $this->createReview($destination, $user, 5, 'Five star review');

        $this->getJson('/api/destinations')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.slug', 'featured-place')
            ->assertJsonPath('0.reviews_count', 3)
            ->assertJsonPath('0.rating_distribution.2', 2)
            ->assertJsonPath('0.featured_review.rating', 2)
            ->assertJsonPath('0.featured_review.comment', 'Second two star review')
            ->assertJsonPath('0.featured_review.author_name', 'List Reviewer');
    }

    public function test_mostly_five_star_reviews_feature_the_most_recent_five_star_review(): void
    {
        $destination = $this->createDestination();
        $user = User::factory()->create(['name' => 'Juan Reyes']);

        $this->createReview($destination, $user, 5, 'Older five star review', '2026-01-01 10:00:00');
        $this->createReview($destination, $user, 5, 'Newer five star review', '2026-02-01 10:00:00');
        $this->createReview($destination, $user, 5, 'Middle five star review', '2026-01-15 10:00:00');
        $this->createReview($destination, $user, 4, 'Four star review');

        $this->getJson('/api/destinations/featured-place')
            ->assertOk()
            ->assertJsonPath('reviews_count', 4)
            ->assertJsonPath('average_rating', 4.75)
            ->assertJsonPath('rating_distribution.5', 3)
            ->assertJsonPath('featured_review.rating', 5)
            ->assertJsonPath('featured_review.comment', 'Newer five star review');
    }

    public function test_mostly_three_star_reviews_feature_the_three_star_group(): void
    {
        $destination = $this->createDestination();
        $user = User::factory()->create();

        for ($index = 1; $index <= 5; $index += 1) {
            $this->createReview($destination, $user, 3, "Three star review {$index}");
        }
        $this->createReview($destination, $user, 1, 'One star review');

        $this->getJson('/api/destinations/featured-place')
            ->assertOk()
            ->assertJsonPath('reviews_count', 6)
            ->assertJsonPath('average_rating', 2.67)
            ->assertJsonPath('rating_distribution.3', 5)
            ->assertJsonPath('featured_review.rating', 3)
            ->assertJsonPath('featured_review.comment', 'Three star review 5');
    }

    public function test_tie_breaks_by_distance_to_average_before_rating_value(): void
    {
        $destination = $this->createDestination();
        $user = User::factory()->create();

        $this->createReview($destination, $user, 1, 'One star A');
        $this->createReview($destination, $user, 1, 'One star B');
        $this->createReview($destination, $user, 4, 'Closer to average A');
        $this->createReview($destination, $user, 4, 'Closer to average B');
        $this->createReview($destination, $user, 5, 'Five star review');

        $this->getJson('/api/destinations/featured-place')
            ->assertOk()
            ->assertJsonPath('average_rating', 3)
            ->assertJsonPath('rating_distribution.1', 2)
            ->assertJsonPath('rating_distribution.4', 2)
            ->assertJsonPath('featured_review.rating', 4)
            ->assertJsonPath('featured_review.comment', 'Closer to average B');
    }

    public function test_equal_tie_breaks_deterministically_by_lower_rating(): void
    {
        $destination = $this->createDestination();
        $user = User::factory()->create();

        $this->createReview($destination, $user, 2, 'Two star A');
        $this->createReview($destination, $user, 2, 'Two star B');
        $this->createReview($destination, $user, 4, 'Four star A');
        $this->createReview($destination, $user, 4, 'Four star B');

        $this->getJson('/api/destinations/featured-place')
            ->assertOk()
            ->assertJsonPath('average_rating', 3)
            ->assertJsonPath('rating_distribution.2', 2)
            ->assertJsonPath('rating_distribution.4', 2)
            ->assertJsonPath('featured_review.rating', 2)
            ->assertJsonPath('featured_review.comment', 'Two star B');
    }

    public function test_destination_without_reviews_has_no_featured_feedback(): void
    {
        $this->createDestination();

        $this->getJson('/api/destinations/featured-place')
            ->assertOk()
            ->assertJsonPath('reviews_count', 0)
            ->assertJsonPath('average_rating', null)
            ->assertJsonPath('rating_distribution.1', 0)
            ->assertJsonPath('rating_distribution.5', 0)
            ->assertJsonPath('featured_review', null);
    }

    public function test_empty_comments_are_excluded_from_summary_and_featured_review(): void
    {
        $destination = $this->createDestination();
        $user = User::factory()->create();

        $this->createReview($destination, $user, 1, '   ');
        $this->createReview($destination, $user, 1, '');
        $this->createReview($destination, $user, 5, 'A real five star comment');

        $this->getJson('/api/destinations/featured-place')
            ->assertOk()
            ->assertJsonPath('reviews_count', 1)
            ->assertJsonPath('average_rating', 5)
            ->assertJsonPath('rating_distribution.1', 0)
            ->assertJsonPath('rating_distribution.5', 1)
            ->assertJsonPath('featured_review.rating', 5)
            ->assertJsonPath('featured_review.comment', 'A real five star comment');
    }

    public function test_deleted_reviews_are_excluded_from_summary_and_featured_review(): void
    {
        $destination = $this->createDestination();
        $user = User::factory()->create();

        $deleted = $this->createReview($destination, $user, 5, 'Deleted five star comment');
        $deleted->delete();
        $this->createReview($destination, $user, 3, 'First three star comment');
        $this->createReview($destination, $user, 3, 'Second three star comment');

        $this->getJson('/api/destinations/featured-place')
            ->assertOk()
            ->assertJsonPath('reviews_count', 2)
            ->assertJsonPath('average_rating', 3)
            ->assertJsonPath('rating_distribution.5', 0)
            ->assertJsonPath('rating_distribution.3', 2)
            ->assertJsonPath('featured_review.rating', 3)
            ->assertJsonPath('featured_review.comment', 'Second three star comment');
    }

    public function test_invalid_ratings_are_excluded_from_summary_and_featured_review(): void
    {
        $destination = $this->createDestination();
        $user = User::factory()->create();

        $this->createReview($destination, $user, 9, 'Invalid rating comment');
        $this->createReview($destination, $user, 0, 'Another invalid rating');
        $this->createReview($destination, $user, 4, 'Valid four star review');
        $this->createReview($destination, $user, 4, 'Most recent valid review');

        $this->getJson('/api/destinations/featured-place')
            ->assertOk()
            ->assertJsonPath('reviews_count', 2)
            ->assertJsonPath('average_rating', 4)
            ->assertJsonPath('rating_distribution.4', 2)
            ->assertJsonPath('featured_review.rating', 4)
            ->assertJsonPath('featured_review.comment', 'Most recent valid review');
    }

    private function createDestination(): Destination
    {
        return Destination::query()->create([
            'slug' => 'featured-place',
            'name' => 'Featured Place',
            'category' => 'Attraction',
            'description' => 'A destination used by the featured review test.',
        ]);
    }

    private function createReview(
        Destination $destination,
        User $user,
        int $rating,
        string $comment,
        ?string $createdAt = null
    ): DestinationReview {
        $review = DestinationReview::query()->create([
            'destination_slug' => $destination->slug,
            'user_id' => $user->id,
            'rating' => $rating,
            'comment' => $comment,
        ]);

        if ($createdAt !== null) {
            $review->created_at = Carbon::parse($createdAt);
            $review->updated_at = Carbon::parse($createdAt);
            $review->save();
        }

        return $review;
    }
}
