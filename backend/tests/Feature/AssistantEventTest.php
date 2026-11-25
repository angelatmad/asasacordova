<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssistantEventTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::create(2026, 11, 25, 12, 0, 0, 'Asia/Manila'));
        Sanctum::actingAs(User::factory()->create());
        Config::set('services.openrouter.key', 'test-key');
        Config::set('services.openrouter.model', 'openai/gpt-4o-mini');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_this_december_uses_current_year_and_excludes_august_events(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'The December event is listed below.']]],
            ]),
        ]);

        $this->createEvent('December Festival', '2026-12-20', 'December 20, 2026');
        $this->createEvent('San Roque Parish Fiesta', '2026-08-16', 'August 16');
        $this->createEvent('Next Year August Festival', '2027-08-16', 'August 16, 2027');

        $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What events are coming up this December?'],
            ],
        ])->assertOk();

        Http::assertSent(function (ClientRequest $request): bool {
            $system = $request->data()['messages'][0]['content'];

            return str_contains($system, 'December Festival')
                && ! str_contains($system, 'San Roque Parish Fiesta')
                && ! str_contains($system, 'Next Year August Festival');
        });
    }

    public function test_this_month_uses_current_calendar_month_and_year(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'The November event is listed below.']]],
            ]),
        ]);

        $this->createEvent('November Festival', '2026-11-26', 'November 26, 2026');
        $this->createEvent('December Festival', '2026-12-20', 'December 20, 2026');

        $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What events are happening this month?'],
            ],
        ])->assertOk();

        Http::assertSent(function (ClientRequest $request): bool {
            $system = $request->data()['messages'][0]['content'];

            return str_contains($system, 'November Festival')
                && ! str_contains($system, 'December Festival');
        });
    }

    public function test_next_month_rolls_over_to_december(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'The December event is listed below.']]],
            ]),
        ]);

        $this->createEvent('December Festival', '2026-12-20', 'December 20, 2026');
        $this->createEvent('January Festival', '2027-01-10', 'January 10, 2027');

        $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What events are happening next month?'],
            ],
        ])->assertOk();

        Http::assertSent(function (ClientRequest $request): bool {
            $system = $request->data()['messages'][0]['content'];

            return str_contains($system, 'December Festival')
                && ! str_contains($system, 'January Festival');
        });
    }

    public function test_next_december_uses_next_calendar_year(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'The December 2027 event is listed below.']]],
            ]),
        ]);

        $this->createEvent('This December Festival', '2026-12-20', 'December 20, 2026');
        $this->createEvent('Next December Festival', '2027-12-20', 'December 20, 2027');

        $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What events are happening next December?'],
            ],
        ])->assertOk();

        Http::assertSent(function (ClientRequest $request): bool {
            $system = $request->data()['messages'][0]['content'];

            return str_contains($system, 'Next December Festival')
                && ! str_contains($system, 'This December Festival');
        });
    }

    public function test_bare_month_uses_current_year(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'The August event is listed below.']]],
            ]),
        ]);

        $this->createEvent('August Festival', '2026-08-16', 'August 16, 2026');
        $this->createEvent('Next August Festival', '2027-08-16', 'August 16, 2027');

        $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What events are happening in August?'],
            ],
        ])->assertOk();

        Http::assertSent(function (ClientRequest $request): bool {
            $system = $request->data()['messages'][0]['content'];

            return str_contains($system, 'August Festival')
                && ! str_contains($system, 'Next August Festival');
        });
    }

    public function test_month_without_events_returns_exact_no_match_reply(): void
    {
        Http::fake();

        $this->createEvent('August Festival', '2026-08-16', 'August 16, 2026');

        $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What events are happening in July?'],
            ],
        ])->assertOk()
            ->assertJsonPath('reply', 'There are currently no events listed in Asa Sa Cordova for July 2026.')
            ->assertJsonPath('destinations', []);

        Http::assertNothingSent();
    }

    public function test_exact_date_question_sends_only_events_on_that_date(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'The matching festival is listed below.']]],
            ]),
        ]);

        $this->createEvent('Matching Festival', '2026-12-15', 'December 15, 2026');
        $this->createEvent('Other Festival', '2026-12-16', 'December 16, 2026');
        $this->createEvent('Undated Celebration', null, 'Every Saturday');

        $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What events are happening on December 15, 2026?'],
            ],
        ])->assertOk();

        Http::assertSent(function (ClientRequest $request): bool {
            $system = $request->data()['messages'][0]['content'];

            return str_contains($system, 'EVENT RECORDS (filtered by the backend using database dates)')
                && str_contains($system, 'Matching Festival')
                && ! str_contains($system, 'Other Festival')
                && ! str_contains($system, 'Undated Celebration');
        });
    }

    public function test_date_range_question_sends_only_events_inside_the_range(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'Two events are listed for that range.']]],
            ]),
        ]);

        $this->createEvent('Opening Festival', '2026-12-15', 'December 15, 2026');
        $this->createEvent('Closing Festival', '2026-12-20', 'December 20, 2026');
        $this->createEvent('Too Early Festival', '2026-12-14', 'December 14, 2026');
        $this->createEvent('Too Late Festival', '2026-12-21', 'December 21, 2026');

        $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What events are happening from December 15, 2026 to December 20, 2026?'],
            ],
        ])->assertOk();

        Http::assertSent(function (ClientRequest $request): bool {
            $system = $request->data()['messages'][0]['content'];

            return str_contains($system, 'Opening Festival')
                && str_contains($system, 'Closing Festival')
                && ! str_contains($system, 'Too Early Festival')
                && ! str_contains($system, 'Too Late Festival');
        });
    }

    public function test_date_without_matching_event_returns_honest_reply_without_ai_request(): void
    {
        Http::fake();

        $this->createEvent('Other Festival', '2026-12-16', 'December 16, 2026');

        $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What events are happening on December 15, 2026?'],
            ],
        ])->assertOk()
            ->assertJsonPath('reply', 'There are currently no events listed in Asa Sa Cordova for December 15, 2026.')
            ->assertJsonPath('destinations', []);

        Http::assertNothingSent();
    }

    public function test_upcoming_events_exclude_past_and_undated_records(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'One upcoming event is listed.']]],
            ]),
        ]);

        $futureDate = Carbon::now('Asia/Manila')->addDay()->toDateString();
        $pastDate = Carbon::now('Asia/Manila')->subDay()->toDateString();

        $this->createEvent('Future Festival', $futureDate, $futureDate);
        $this->createEvent('Past Festival', $pastDate, $pastDate);
        $this->createEvent('Undated Celebration', null, 'Every Saturday');

        $this->postJson('/api/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'What upcoming events are available?'],
            ],
        ])->assertOk();

        Http::assertSent(function (ClientRequest $request): bool {
            $system = $request->data()['messages'][0]['content'];

            return str_contains($system, 'Future Festival')
                && ! str_contains($system, 'Past Festival')
                && ! str_contains($system, 'Undated Celebration');
        });
    }

    private function createEvent(string $title, ?string $date, string $dateLabel): Event
    {
        return Event::query()->create([
            'title' => $title,
            'description' => "{$title} is a published event in Cordova.",
            'date' => $date,
            'date_label' => $dateLabel,
            'details' => ['Verified schedule from the ASC directory.'],
            'time' => '10:00 AM',
            'location' => 'Cordova, Cebu',
            'category' => 'festival',
            'is_published' => true,
        ]);
    }
}
