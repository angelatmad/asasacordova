<?php

namespace Tests\Feature;

use App\Models\Destination;
use App\Models\DestinationReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DestinationReviewSummaryTest extends TestCase
{
    use RefreshDatabase;

    // The public directory must expose database review totals for every card.
    public function test_destination_list_includes_real_review_totals(): void
    {
        $reviewed = $this->createDestination('reviewed-place', 'Reviewed Place');
        $this->createDestination('unreviewed-place', 'Unreviewed Place');
        $user = User::factory()->create();

        $this->addReview($reviewed, $user, 4);
        $this->addReview($reviewed, $user, 5);

        $this->getJson('/api/destinations')
            ->assertOk()
            ->assertJsonFragment([
                'slug' => 'reviewed-place',
                'reviews_count' => 2,
                'average_rating' => 4.5,
            ])
            ->assertJsonFragment([
                'slug' => 'unreviewed-place',
                'reviews_count' => 0,
                'average_rating' => null,
            ]);
    }

    // The detail page uses the same aggregates so its rating matches the card.
    public function test_destination_detail_includes_real_review_totals(): void
    {
        $destination = $this->createDestination('reviewed-place', 'Reviewed Place');
        $user = User::factory()->create();

        $this->addReview($destination, $user, 3);
        $this->addReview($destination, $user, 4);

        $this->getJson('/api/destinations/reviewed-place')
            ->assertOk()
            ->assertJsonPath('reviews_count', 2)
            ->assertJsonPath('average_rating', 3.5);
    }

    // A destination without reviews returns zero and null instead of sample stars.
    public function test_destination_detail_without_reviews_has_empty_summary(): void
    {
        $this->createDestination('unreviewed-place', 'Unreviewed Place');

        $this->getJson('/api/destinations/unreviewed-place')
            ->assertOk()
            ->assertJsonPath('reviews_count', 0)
            ->assertJsonPath('average_rating', null);
    }

    // Build a minimal valid destination row for these API tests.
    private function createDestination(string $slug, string $name): Destination
    {
        return Destination::create([
            'slug' => $slug,
            'name' => $name,
            'category' => 'Attraction',
            'description' => 'A destination used by the review summary test.',
        ]);
    }

    // Insert one real review row linked to the destination and its author.
    private function addReview(Destination $destination, User $user, int $rating): void
    {
        DestinationReview::create([
            'destination_slug' => $destination->slug,
            'user_id' => $user->id,
            'rating' => $rating,
            'comment' => 'Helpful visitor feedback.',
        ]);
    }
}
