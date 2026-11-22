<?php

namespace Tests\Feature;

use App\Models\Destination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Tests that the assistant only uses records from the location being asked about. */
class AssistantLocationTest extends TestCase
{
    use RefreshDatabase;

    /** Runs before each test with a fake logged-in user and fake AI settings. */
    protected function setUp(): void
    {
        parent::setUp();

        // The chat route needs a signed-in user, so create a fake one via factory.
        Sanctum::actingAs(User::factory()->create());
        // Fake settings avoid depending on real .env values during tests.
        Config::set('services.openrouter.key', 'test-key');
        Config::set('services.openrouter.model', 'openai/gpt-4o-mini');
    }

    // A place question returns only destinations whose barangays include Pilipog.
    public function test_tourist_spots_in_pilipog_return_only_pilipog_records(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'Here are the verified places in Pilipog.']]],
            ]),
        ]);

        $this->createDestination('alta-hotel', 'Alta Hotel', 'Hotel', ['Pilipog']);
        $this->createDestination('ccl-expressway', 'CCLEX', 'Landmark', ['Pilipog']);
        $this->createDestination('10000-roses', '10,000 Roses', 'Attraction', ['Day-as']);
        $this->createDestination('solea', 'Solea Mactan Resort', 'Resort', ['Alegria']);

        $response = $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What are the tourist spots of Pilipog?'],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('scope.type', 'barangay')
            ->assertJsonPath('scope.label', 'Pilipog')
            ->assertJsonPath('destinations.0.slug', 'alta-hotel')
            ->assertJsonPath('destinations.1.slug', 'ccl-expressway');

        $this->assertCount(2, $response->json('destinations'));
        $this->assertStringNotContainsString('10,000 Roses', json_encode($response->json()));

        Http::assertSent(function (ClientRequest $request): bool {
            $system = $request->data()['messages'][0]['content'];

            return str_contains($system, 'Pilipog')
                && ! str_contains($system, '10,000 Roses')
                && str_contains($system, 'Never substitute Cordova-wide recommendations');
        });
    }

    // With no local match, the reply admits it and no paid AI request is sent.
    public function test_restaurants_in_pilipog_return_honest_no_match(): void
    {
        Http::fake();

        $this->createDestination('alta-hotel', 'Alta Hotel', 'Hotel', ['Pilipog']);
        $this->createDestination('lantaw-restaurant', 'Lantaw Restaurant', 'Restaurant', ['Day-as']);

        $response = $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What restaurants are in Pilipog?'],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('scope.category', 'food')
            ->assertJsonPath('destinations', []);

        $this->assertStringContainsString(
            "I couldn't find verified restaurants or food parks specifically listed in Pilipog",
            $response->json('reply')
        );
        $this->assertStringContainsString('Cordova', $response->json('reply'));

        Http::assertNothingSent();
    }

    // Category words narrow the results even when the barangay is correct.
    public function test_resorts_in_pilipog_return_only_stay_records(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'Alta Hotel is listed in Pilipog.']]],
            ]),
        ]);

        $this->createDestination('alta-hotel', 'Alta Hotel', 'Hotel', ['Pilipog']);
        $this->createDestination('ccl-expressway', 'CCLEX', 'Landmark', ['Pilipog']);

        $response = $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'Are there resorts in Pilipog?'],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('scope.category', 'stay')
            ->assertJsonPath('destinations.0.slug', 'alta-hotel');

        $this->assertCount(1, $response->json('destinations'));
    }

    // Multi-barangay places are allowed, but the AI must be warned about them.
    public function test_poblacion_returns_only_poblacion_records(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'These places are listed around Poblacion.']]],
            ]),
        ]);

        $this->createDestination('cordova-bantayan-beach', 'Bantayan Beach', 'Beach', ['Catarman', 'Poblacion']);
        $this->createDestination('cordova-reef', 'Cordova Reef Village Resort', 'Resort', ['Poblacion']);
        $this->createDestination('solea', 'Solea Mactan Resort', 'Resort', ['Alegria']);

        $response = $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What can I visit in Poblacion?'],
            ],
        ]);

        $response->assertOk()->assertJsonPath('scope.label', 'Poblacion');

        $slugs = array_column($response->json('destinations'), 'slug');
        $this->assertContains('cordova-bantayan-beach', $slugs);
        $this->assertContains('cordova-reef', $slugs);
        $this->assertNotContains('solea', $slugs);

        Http::assertSent(function (ClientRequest $request): bool {
            return str_contains($request->data()['messages'][0]['content'], 'address lists multiple barangays');
        });
    }

    // A Cordova-wide question may use every seeded destination.
    public function test_cordova_wide_question_uses_all_destinations(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'Cordova has several destinations.']]],
            ]),
        ]);

        $this->createDestination('alta-hotel', 'Alta Hotel', 'Hotel', ['Pilipog']);
        $this->createDestination('lantaw-restaurant', 'Lantaw Restaurant', 'Restaurant', ['Day-as']);
        $this->createDestination('solea', 'Solea Mactan Resort', 'Resort', ['Alegria']);

        $response = $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What are the tourist spots in Cordova?'],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('scope.type', 'municipality')
            ->assertJsonPath('scope.label', 'Cordova');

        $this->assertCount(3, $response->json('destinations'));
    }

    // Words like "there" reuse the last place mentioned in the conversation.
    public function test_follow_up_keeps_previous_location_context(): void
    {
        Http::fake();

        $this->createDestination('alta-hotel', 'Alta Hotel', 'Hotel', ['Pilipog']);
        $this->createDestination('lantaw-restaurant', 'Lantaw Restaurant', 'Restaurant', ['Day-as']);

        $response = $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What are the tourist spots of Pilipog?'],
                ['role' => 'assistant', 'content' => 'Alta Hotel and CCLEX are listed in Pilipog.'],
                ['role' => 'user', 'content' => 'What about restaurants there?'],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('scope.type', 'barangay')
            ->assertJsonPath('scope.label', 'Pilipog')
            ->assertJsonPath('scope.follow_up', true)
            ->assertJsonPath('destinations', []);

        $this->assertStringContainsString('in Pilipog', $response->json('reply'));
        Http::assertNothingSent();
    }

    // When history has several places, the newest one wins, not the first.
    public function test_follow_up_uses_most_recent_location_when_history_has_multiple_locations(): void
    {
        Http::fake();

        $this->createDestination('alta-hotel', 'Alta Hotel', 'Hotel', ['Pilipog']);
        $this->createDestination('roro-port-food-park', 'Roro Port Food Park', 'Food Park', ['Poblacion']);

        $response = $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What can I visit in Poblacion?'],
                ['role' => 'assistant', 'content' => 'Roro Port Food Park is listed in Poblacion.'],
                ['role' => 'user', 'content' => 'What are the tourist spots of Pilipog?'],
                ['role' => 'assistant', 'content' => 'Alta Hotel is listed in Pilipog.'],
                ['role' => 'user', 'content' => 'What about restaurants there?'],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('scope.type', 'barangay')
            ->assertJsonPath('scope.label', 'Pilipog')
            ->assertJsonPath('scope.follow_up', true)
            ->assertJsonPath('destinations', []);

        $this->assertStringContainsString('in Pilipog', $response->json('reply'));
        Http::assertNothingSent();
    }

    // A known barangay with no data still gets a clear, honest no-match answer.
    public function test_ibabao_without_records_returns_honest_no_match(): void
    {
        Http::fake();

        $this->createDestination('alta-hotel', 'Alta Hotel', 'Hotel', ['Pilipog']);

        $response = $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What restaurants are in Ibabao?'],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('scope.label', 'Ibabao')
            ->assertJsonPath('destinations', []);

        $this->assertStringContainsString('in Ibabao', $response->json('reply'));
    }

    /** Creates a destination row with realistic fields for the chat tests. */
    private function createDestination(
        string $slug,
        string $name,
        string $category,
        array $barangays
    ): Destination {
        // Coordinates are the same for every row; these tests check location scope, not distance.
        return Destination::query()->create([
            'slug' => $slug,
            'name' => $name,
            'category' => $category,
            'description' => "{$name} in Cordova.",
            'overview' => "{$name} is a destination in Cordova.",
            'address' => implode(', ', $barangays).', Cordova, Cebu',
            'municipality' => 'Cordova',
            'barangays' => $barangays,
            'location_aliases' => [],
            'opening_hours' => '8:00 AM',
            'closing_hours' => '5:00 PM',
            'operating_days' => 'Monday - Sunday',
            'entrance_fee' => 'Free',
            'contact_number' => 'Not yet available',
            'latitude' => 10.25,
            'longitude' => 123.95,
        ]);
    }
}
