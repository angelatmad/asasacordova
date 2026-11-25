<?php

namespace Tests\Feature;

use App\Models\Destination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DestinationReviewAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_token_submits_review_and_saved_review_is_returned(): void
    {
        $user = User::factory()->create([
            'name' => 'Verified Reviewer',
            'email' => 'reviewer@example.com',
            'password' => Hash::make('password123'),
        ]);
        $destination = $this->createDestination('auth-review-place', 'Auth Review Place');

        $login = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $login->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonStructure(['token']);

        $token = $login->json('token');
        $this->assertIsString($token);

        $this->withToken($token)
            ->postJson("/api/destinations/{$destination->slug}/reviews", [
                'rating' => 4,
                'comment' => 'Submitted with the token returned by login.',
            ])
            ->assertCreated()
            ->assertJsonPath('review.destination_slug', $destination->slug)
            ->assertJsonPath('review.user_id', $user->id)
            ->assertJsonPath('review.user.name', 'Verified Reviewer');

        $this->getJson("/api/destinations/{$destination->slug}/reviews")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.rating', 4)
            ->assertJsonPath('0.comment', 'Submitted with the token returned by login.');

        $this->getJson("/api/destinations/{$destination->slug}")
            ->assertOk()
            ->assertJsonPath('reviews_count', 1)
            ->assertJsonPath('average_rating', 4)
            ->assertJsonPath('featured_review.rating', 4)
            ->assertJsonPath('featured_review.comment', 'Submitted with the token returned by login.');
    }

    public function test_unauthenticated_review_submission_is_blocked(): void
    {
        $destination = $this->createDestination('protected-place', 'Protected Place');

        $this->postJson("/api/destinations/{$destination->slug}/reviews", [
            'rating' => 5,
            'comment' => 'This should not be saved.',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');

        $this->assertDatabaseCount('destination_reviews', 0);
    }

    public function test_fake_token_cannot_submit_review(): void
    {
        $destination = $this->createDestination('fake-token-place', 'Fake Token Place');

        $this->withToken('demo_token_active')
            ->postJson("/api/destinations/{$destination->slug}/reviews", [
                'rating' => 5,
                'comment' => 'A fake token must not create a review.',
            ])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');

        $this->assertDatabaseCount('destination_reviews', 0);
    }

    private function createDestination(string $slug, string $name): Destination
    {
        return Destination::query()->create([
            'slug' => $slug,
            'name' => $name,
            'category' => 'Attraction',
            'description' => "{$name} is used by the review authentication test.",
        ]);
    }
}
