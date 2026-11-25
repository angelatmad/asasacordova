<?php

namespace Tests\Feature;

use App\Models\Destination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DestinationReviewCreateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->create());
    }

    public function test_review_is_saved_and_included_in_destination_aggregates(): void
    {
        $destination = $this->createDestination('reviewed-place', 'Reviewed Place');

        $response = $this->postJson('/api/destinations/reviewed-place/reviews', [
            'rating' => 5,
            'comment' => 'A verified visitor review.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Review submitted successfully.')
            ->assertJsonPath('review.destination_slug', 'reviewed-place')
            ->assertJsonPath('review.rating', 5);

        $this->assertDatabaseHas('destination_reviews', [
            'destination_slug' => 'reviewed-place',
            'rating' => 5,
            'comment' => 'A verified visitor review.',
        ]);

        $this->getJson('/api/destinations/reviewed-place')
            ->assertOk()
            ->assertJsonPath('reviews_count', 1)
            ->assertJsonPath('average_rating', 5);
    }

    public function test_review_cannot_be_created_for_unknown_destination(): void
    {
        $response = $this->postJson('/api/destinations/missing-place/reviews', [
            'rating' => 5,
            'comment' => 'This destination does not exist.',
        ]);

        $response->assertNotFound();

        $this->assertDatabaseMissing('destination_reviews', [
            'destination_slug' => 'missing-place',
        ]);
    }

    private function createDestination(string $slug, string $name): Destination
    {
        return Destination::query()->create([
            'slug' => $slug,
            'name' => $name,
            'category' => 'Attraction',
            'description' => "{$name} is used by the review creation test.",
        ]);
    }
}
