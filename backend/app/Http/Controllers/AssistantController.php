<?php

namespace App\Http\Controllers;

use App\Models\Destination;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/** Answers Cordova travel questions using local records plus the OpenRouter AI model. */
class AssistantController extends Controller
{
    // Official barangays are listed so place questions can be matched reliably.
    private const BARANGAYS = [
        'Alegria',
        'Bangbang',
        'Buagsong',
        'Catarman',
        'Cogon',
        'Dapitan',
        'Day-as',
        'Gabi',
        'Gilutongan',
        'Ibabao',
        'Pilipog',
        'Poblacion',
        'San Miguel',
    ];

    // Common words in a question are mapped to a broad category.
    private const CATEGORY_PATTERNS = [
        'food' => ['restaurant', 'restaurants', 'food', 'eat', 'dining', 'seafood', 'cafe', 'lunch', 'dinner', 'food park', 'bakasihan'],
        'stay' => ['resort', 'resorts', 'hotel', 'hotels', 'stay', 'accommodation', 'overnight'],
        'nature' => ['beach', 'beaches', 'island', 'islands', 'snorkel', 'snorkeling', 'dive', 'diving'],
    ];

    // These are the category values actually stored in the destinations table.
    private const CATEGORY_VALUES = [
        'food' => ['Restaurant', 'Food Park'],
        'stay' => ['Resort', 'Hotel'],
        'nature' => ['Beach', 'Island'],
    ];

    /** Validates the chat, finds local records, then asks the AI with a scoped prompt. */
    public function chat(Request $request): JsonResponse
    {
        // Limits keep requests safe, small, and predictable in AI cost.
        $validated = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:20'],
            'messages.*.role' => ['required', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string', 'max:2000'],
            'context' => ['nullable', 'string', 'max:15000'],
        ]);

        $messages = $validated['messages'];
        $currentMessage = $this->latestUserContent($messages);
        // These helpers decide the place/category before any paid AI call happens.
        $scope = $this->resolveScope($messages);
        $category = $this->detectCategory($currentMessage);
        $destinations = $this->destinationsForScope($scope, $category);

        // A specific place with no records gets an honest answer, not an AI guess.
        if ($scope['type'] !== 'municipality' && $scope['type'] !== 'general' && $destinations->isEmpty()) {
            return response()->json([
                'reply' => $this->noMatchReply($scope, $category),
                'destinations' => [],
                'scope' => $this->scopePayload($scope, $category),
            ]);
        }

        // Config comes from .env on the server; the browser never sees the key.
        $apiKey = config('services.openrouter.key');

        if (! $apiKey) {
            return response()->json(['message' => 'The AI assistant is not configured.'], 503);
        }

        // These helpers prepare the answer rules and local knowledge-base text.
        $system = $this->systemPrompt($scope);
        $context = $this->buildContext($destinations, $scope);

        try {
            // The token authenticates; headers identify this app to OpenRouter.
            $response = Http::withToken($apiKey)
                ->withHeaders([
                    'HTTP-Referer' => config('app.url'),
                    'X-Title' => 'Asa sa Cordova',
                ])
                ->timeout(30)
                ->post('https://openrouter.ai/api/v1/chat/completions', [
                    'model' => config('services.openrouter.model'),
                    'messages' => array_merge(
                        [['role' => 'system', 'content' => $system]],
                        $messages
                    ),
                    'max_tokens' => 500,
                    'temperature' => 0.4,
                ]);
        } catch (Throwable $e) {
            // Network errors return a friendly 502 instead of a broken page.
            Log::error('OpenRouter request failed: '.$e->getMessage());

            return response()->json(['message' => 'The AI assistant is unavailable right now.'], 502);
        }

        if ($response->failed()) {
            Log::warning('OpenRouter error '.$response->status().': '.$response->body());

            return response()->json(['message' => 'The AI assistant is unavailable right now.'], 502);
        }

        $reply = data_get($response->json(), 'choices.0.message.content');

        if (! is_string($reply) || trim($reply) === '') {
            return response()->json(['message' => 'The AI assistant returned an empty reply.'], 502);
        }

        // Send the reply plus local slugs so the UI can show matching place cards.
        return response()->json([
            'reply' => trim($reply),
            'destinations' => $this->linkRecords($destinations),
            'scope' => $this->scopePayload($scope, $category),
        ]);
    }

    /** Finds the newest user message so follow-ups use the right question. */
    private function latestUserContent(array $messages): string
    {
        $latest = '';

        foreach (array_reverse($messages) as $message) {
            if (($message['role'] ?? null) === 'user') {
                $latest = (string) ($message['content'] ?? '');
                break;
            }
        }

        return $latest;
    }

    /** Works out whether the question is about a barangay, landmark, or all of Cordova. */
    private function resolveScope(array $messages): array
    {
        $currentMessage = $this->latestUserContent($messages);
        // Earlier user messages are kept so words like "there" can refer to a place.
        $previousMessages = collect($messages)
            ->where('role', 'user')
            ->slice(0, -1)
            ->pluck('content')
            ->implode(' ');

        $locations = $this->knownLocations();
        $match = $this->findLocation($currentMessage, $locations);
        $followUp = false;

        // Prefer the current message; only use history when the text is a follow-up.
        if (! $match && $this->isContextFollowUp($currentMessage) && trim($previousMessages) !== '') {
            $match = $this->findLocation((string) $previousMessages, $locations);
            $followUp = $match !== null;
        }

        // Words like "near" change the search from exact place to distance.
        $near = $match !== null && preg_match('/\b(near|nearby|around|close to|close by|vicinity of)\b/i', $currentMessage) === 1;

        if (! $match) {
            // Naming Cordova alone allows every destination in the directory.
            if ($this->containsTerm($this->normalize($currentMessage), 'cordova')) {
                return [
                    'type' => 'municipality',
                    'label' => 'Cordova',
                    'barangays' => [],
                    'anchor' => null,
                    'follow_up' => false,
                    'near' => false,
                ];
            }

            return [
                'type' => 'general',
                'label' => 'Cordova',
                'barangays' => [],
                'anchor' => null,
                'follow_up' => false,
                'near' => false,
            ];
        }

        return [
            'type' => $near ? 'near' : $match['type'],
            'label' => $match['label'],
            'barangays' => $match['barangays'],
            'anchor' => $match['anchor'],
            'follow_up' => $followUp,
            'near' => $near,
        ];
    }

    /** Builds searchable names from barangays, destination names, and aliases. */
    private function knownLocations(): array
    {
        $locations = [];

        // Add barangays first so they match even before any destination is loaded.
        foreach (self::BARANGAYS as $barangay) {
            $key = $this->normalize($barangay);
            $locations[$key] = [
                'term' => $barangay,
                'type' => 'barangay',
                'label' => $barangay,
                'barangays' => [$barangay],
                'anchor' => null,
            ];
        }

        // Destinations add landmarks and nicknames people might type in chat.
        foreach (Destination::query()->get() as $destination) {
            // Keep only clean barangay strings before building the alias list.
            $barangays = array_values(array_filter(
                is_array($destination->barangays) ? $destination->barangays : [],
                fn ($value): bool => is_string($value) && $value !== ''
            ));

            $aliases = array_merge(
                $barangays,
                is_array($destination->location_aliases) ? $destination->location_aliases : [],
                [$destination->name]
            );

            foreach ($aliases as $alias) {
                if (! is_string($alias) || trim($alias) === '') {
                    continue;
                }

                $key = $this->normalize($alias);

                if ($key === '') {
                    continue;
                }

                if (! isset($locations[$key])) {
                    $locations[$key] = [
                        'term' => $alias,
                        'type' => 'landmark',
                        'label' => $alias,
                        'barangays' => $barangays,
                        'anchor' => $this->anchor($destination),
                    ];

                    continue;
                }

                // A place name can duplicate a barangay; keep the stronger barangay match.
                if ($locations[$key]['type'] === 'barangay') {
                    continue;
                }

                // Shared aliases combine their barangays and keep one map anchor.
                $locations[$key]['barangays'] = array_values(array_unique(array_merge(
                    $locations[$key]['barangays'],
                    $barangays
                )));

                if ($locations[$key]['anchor'] === null) {
                    $locations[$key]['anchor'] = $this->anchor($destination);
                }
            }
        }

        // Longer names are checked first so "10,000 Roses" beats just "Roses".
        uasort($locations, fn (array $left, array $right): int => mb_strlen($right['term']) <=> mb_strlen($left['term']));

        return array_values($locations);
    }

    /** Picks the location whose name appears latest in the user's message. */
    private function findLocation(string $text, array $locations): ?array
    {
        $normalized = $this->normalize($text);
        $best = null;
        $bestPosition = -1;

        foreach ($locations as $location) {
            $position = $this->termPosition($normalized, $this->normalize($location['term']));

            // The last mentioned place wins when a message names several places.
            if ($position !== false && $position > $bestPosition) {
                $bestPosition = $position;
                $best = $location;
            }
        }

        return $best;
    }

    /** Turns words like "seafood" or "hotel" into a category filter. */
    private function detectCategory(string $text): ?string
    {
        $normalized = $this->normalize($text);

        foreach (self::CATEGORY_PATTERNS as $category => $terms) {
            foreach ($terms as $term) {
                if ($this->containsTerm($normalized, $term)) {
                    return $category;
                }
            }
        }

        return null;
    }

    /** Filters local destinations by place, distance, then category before the AI call. */
    private function destinationsForScope(array $scope, ?string $category): Collection
    {
        $query = Destination::query();

        // Barangays are stored as JSON, so they need a JSON-aware database check.
        if ($scope['type'] === 'barangay' && $scope['barangays'] !== []) {
            $query->whereJsonContains('barangays', $scope['barangays'][0]);
        }

        // A landmark may list several barangays, so any one of them is accepted.
        if ($scope['type'] === 'landmark' && $scope['barangays'] !== []) {
            $query->where(function ($builder) use ($scope): void {
                foreach ($scope['barangays'] as $index => $barangay) {
                    if ($index === 0) {
                        $builder->whereJsonContains('barangays', $barangay);
                    } else {
                        $builder->orWhereJsonContains('barangays', $barangay);
                    }
                }
            });
        }

        $destinations = $query->orderBy('name')->get();

        if ($scope['type'] === 'near') {
            // If the landmark has no coordinates, use the average of its barangays.
            $anchor = $scope['anchor'] ?? $this->anchorForBarangays($scope['barangays']);

            if ($anchor === null) {
                return collect();
            }

            // "Near" is defined here as within 5 km of that centre point.
            $destinations = $destinations
                ->filter(fn (Destination $destination): bool => $this->distanceKm($anchor, $this->anchor($destination)) <= 5.0)
                ->values();
        }

        if ($category !== null) {
            // Match stored category values, not the words the visitor typed.
            $destinations = $destinations
                ->filter(fn (Destination $destination): bool => in_array($destination->category, self::CATEGORY_VALUES[$category], true))
                ->values();
        }

        return $destinations;
    }

    /** Returns map coordinates for distance checks, or null if none are saved. */
    private function anchor(Destination $destination): ?array
    {
        if ($destination->latitude === null || $destination->longitude === null) {
            return null;
        }

        return ['latitude' => (float) $destination->latitude, 'longitude' => (float) $destination->longitude];
    }

    /** Averages coordinates in a barangay to make a centre point for near searches. */
    private function anchorForBarangays(array $barangays): ?array
    {
        if ($barangays === []) {
            return null;
        }

        $query = Destination::query();

        // Match any of the given barangays before averaging their map points.
        foreach ($barangays as $index => $barangay) {
            if ($index === 0) {
                $query->whereJsonContains('barangays', $barangay);
            } else {
                $query->orWhereJsonContains('barangays', $barangay);
            }
        }

        $anchors = $query->get()->map(fn (Destination $destination): ?array => $this->anchor($destination))->filter()->values();

        if ($anchors->isEmpty()) {
            return null;
        }

        return [
            'latitude' => $anchors->avg('latitude'),
            'longitude' => $anchors->avg('longitude'),
        ];
    }

    /** Haversine formula: estimates straight-line distance between two coordinates. */
    private function distanceKm(?array $from, ?array $to): float
    {
        // Missing coordinates are treated as infinitely far away.
        if ($from === null || $to === null) {
            return PHP_FLOAT_MAX;
        }

        // Earth's radius is in km; deg2rad converts degrees into radians.
        $earthRadius = 6371.0;
        $latitudeDelta = deg2rad((float) $to['latitude'] - (float) $from['latitude']);
        $longitudeDelta = deg2rad((float) $to['longitude'] - (float) $from['longitude']);
        $fromLatitude = deg2rad((float) $from['latitude']);
        $toLatitude = deg2rad((float) $to['latitude']);

        $haversine = sin($latitudeDelta / 2) ** 2
            + cos($fromLatitude) * cos($toLatitude) * sin($longitudeDelta / 2) ** 2;

        // Clamp rounding errors so asin() always receives a value of 1 or less.
        return $earthRadius * 2 * asin(min(1.0, sqrt($haversine)));
    }

    /** Gives an honest answer when no verified local record matches the question. */
    private function noMatchReply(array $scope, ?string $category): string
    {
        $noun = match ($category) {
            'food' => 'restaurants or food parks',
            'stay' => 'resorts or hotels',
            'nature' => 'beaches or islands',
            default => 'tourist destinations',
        };

        $preposition = $scope['type'] === 'near' ? 'near' : 'in';

        return "I couldn't find verified {$noun} specifically listed {$preposition} {$scope['label']} in the ASC directory yet. Would you like to explore other destinations in Cordova?";
    }

    /** Sets AI rules: scoped questions must not borrow places from elsewhere. */
    private function systemPrompt(array $scope): string
    {
        $system = "You are the ASC Tourism Assistant for 'Asa sa Cordova', a tourism website about Cordova, Cebu, Philippines. "
            .'Help visitors with attractions, resorts, restaurants, festivals, itineraries, getting around, and how to use the website '
            .'(interactive map, favorites, visited list, reviews). Be friendly, concise (under 150 words), and accurate. '
            .'Use ONLY the knowledge base below for specific facts such as hours, fees, addresses and contact numbers. '
            .'If something is not in the knowledge base, say you are not sure instead of guessing. '
            .'If the question is unrelated to Cordova travel, politely steer back to Cordova.';

        // Cordova-wide questions may use every record in the knowledge base.
        if ($scope['type'] === 'municipality' || $scope['type'] === 'general') {
            return $system.' The question is Cordova-wide; you may use all destination records in the knowledge base.';
        }

        $preposition = $scope['type'] === 'near' ? 'near' : 'in';

        // Place-specific answers are limited to records whose scope was resolved above.
        return $system
            ." The current question is about {$preposition} {$scope['label']}. Answer strictly from the scoped records in the knowledge base. "
            .'Never substitute Cordova-wide recommendations or claim a place is in this location unless its scoped record says so. '
            .'If a record lists more than one barangay, say the address lists multiple barangays and should be confirmed locally. '
            .'If the scoped records do not answer the question, say what is missing and offer Cordova-wide options only as a clearly separate alternative.';
    }

    /** Builds a compact knowledge-base string from destinations and published events. */
    private function buildContext(Collection $destinations, array $scope): string
    {
        $scopeLabel = $scope['type'] === 'general' ? 'all Cordova destinations' : $scope['label'];
        // The first lines tell the AI which records it is allowed to rely on.
        $lines = [
            'CURRENT ANSWER SCOPE: '.$scopeLabel,
            'Use only the destination records in this scope for place-specific facts. Do not recommend places outside this scope.',
        ];

        foreach ($destinations as $destination) {
            $barangays = implode(', ', is_array($destination->barangays) ? $destination->barangays : []);
            $line = sprintf(
                '- %s (%s), slug: %s. Barangay: %s. Address: %s. %s Hours: %s - %s (%s). Entrance fee: %s. Contact: %s.',
                $destination->name,
                $destination->category,
                $destination->slug,
                $barangays !== '' ? $barangays : 'Not specified',
                $destination->address,
                $destination->location_note !== null && $destination->location_note !== '' ? 'Location note: '.$destination->location_note : '',
                $destination->opening_hours,
                $destination->closing_hours,
                $destination->operating_days,
                $destination->entrance_fee,
                $destination->contact_number
            );

            // Trim long lines so one place cannot fill the whole prompt.
            $lines[] = mb_substr(preg_replace('/\s+/u', ' ', $line) ?? $line, 0, 900);
        }

        $lines[] = '';
        $lines[] = 'CULTURE AND EVENTS:';

        // Only published events are included; dated ones come before text schedules.
        $events = Event::query()
            ->where('is_published', true)
            ->limit(6)
            ->orderByRaw('date IS NULL')
            ->orderBy('date', 'asc')
            ->orderBy('date_label', 'asc')
            ->get();

        foreach ($events as $event) {
            $lines[] = sprintf(
                '- %s (%s): %s',
                $event->title,
                $event->date_label ?: ($event->date?->toDateString() ?? 'Schedule not set'),
                mb_substr((string) $event->description, 0, 300)
            );
        }

        // The final cap matches the 15,000-character limit used in validation.
        return mb_substr(implode("\n", $lines), 0, 15000);
    }

    /** Sends only the fields the frontend needs to show matching place cards. */
    private function linkRecords(Collection $destinations): array
    {
        return $destinations
            ->map(fn (Destination $destination): array => [
                'slug' => $destination->slug,
                'name' => $destination->name,
                'category' => $destination->category,
                'barangays' => is_array($destination->barangays) ? $destination->barangays : [],
            ])
            ->values()
            ->all();
    }

    /** Returns scope details the UI uses for labels like "in Pilipog". */
    private function scopePayload(array $scope, ?string $category): array
    {
        return [
            'type' => $scope['type'],
            'label' => $scope['label'],
            'category' => $category,
            'follow_up' => $scope['follow_up'],
        ];
    }

    /** Detects words like "there" that point back to an earlier message. */
    private function isContextFollowUp(string $text): bool
    {
        return preg_match('/\b(what about|how about|there|here|same place|same barangay|that area|this area)\b/i', $text) === 1;
    }

    /** Lowercases text and standardises dashes/spaces so matching stays consistent. */
    private function normalize(string $value): string
    {
        $value = str_replace(['-', '‑', '–'], ' ', mb_strtolower(trim($value)));

        return preg_replace('/\s+/u', ' ', $value) ?? $value;
    }

    /** Small wrapper shared by place and category word checks. */
    private function containsTerm(string $normalizedText, string $normalizedTerm): bool
    {
        return $this->termPosition($normalizedText, $normalizedTerm) !== false;
    }

    /** Finds a whole word/phrase so "pilipog" will not match inside another word. */
    private function termPosition(string $normalizedText, string $normalizedTerm): int|false
    {
        if ($normalizedTerm === '') {
            return false;
        }

        // Unicode boundaries support names with accents and non-ASCII characters.
        $pattern = '/(?<![\p{L}\p{N}])'.preg_quote($normalizedTerm, '/').'(?![\p{L}\p{N}])/u';

        if (preg_match($pattern, $normalizedText, $matches, PREG_OFFSET_CAPTURE) !== 1) {
            return false;
        }

        return $matches[0][1];
    }
}
