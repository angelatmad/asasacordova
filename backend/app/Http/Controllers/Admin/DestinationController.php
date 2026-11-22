<?php

namespace App\Http\Controllers\Admin;

use App\Models\Destination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

// Manage destinations from the admin panel: list, create, view, edit, delete.
// The routes check the admin role first; here we validate input, add defaults,
// and remove related records when a destination is deleted.
class DestinationController extends AdminController
{
    // List destinations with optional search/category filters and pagination.
    public function index(Request $request): JsonResponse
    {
        if ($error = $this->ensureTables(['destinations'])) {
            return $error;
        }

        // Validate filters before using them in the query.
        $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:255'],
        ]);

        $query = Destination::query();

        // LIKE with % on both sides finds matches anywhere in the field.
        if ($request->filled('search')) {
            $search = '%'.$request->string('search')->toString().'%';
            $query->where(function ($builder) use ($search): void {
                $builder->where('name', 'like', $search)
                    ->orWhere('slug', 'like', $search)
                    ->orWhere('description', 'like', $search);
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->string('category')->toString());
        }

        // Alphabetical order plus paginate() keeps the response small.
        $paginator = $query->orderBy('name')->paginate($this->perPage($request));

        return $this->paginated($paginator, 'Destinations retrieved successfully.');
    }

    // Create a destination after filling defaults and checking the rules.
    public function store(Request $request): JsonResponse
    {
        if ($error = $this->ensureTables(['destinations'])) {
            return $error;
        }

        // normalize() accepts front-end key names; prepareForStore() fills blanks.
        $data = $this->prepareForStore($this->normalize($request->all()));
        $validated = Validator::make($data, $this->rules(true))->validate();
        $destination = Destination::create($validated);

        // 201 means a new record was created.
        return $this->json('Destination created successfully.', ['destination' => $destination], 201);
    }

    // Show one destination by id or slug, plus related counts when available.
    public function show(string $destination): JsonResponse
    {
        if ($error = $this->ensureTables(['destinations'])) {
            return $error;
        }

        $model = $this->resolveDestination($destination);
        // Counts are loaded only for tables that exist, so no query fails.
        $flags = $this->tableFlags(['destination_reviews', 'favorites', 'visited_destinations']);

        if ($flags['destination_reviews']) {
            $model->loadCount('reviews');
        }

        if ($flags['favorites']) {
            $model->loadCount('favorites');
        }

        if ($flags['visited_destinations']) {
            $model->loadCount('visitedDestinations');
        }

        return $this->json('Destination retrieved successfully.', [
            'destination' => $model,
            'setup' => [
                'complete' => $this->missingTables($flags) === [],
                'tables' => $flags,
                'missing_tables' => $this->missingTables($flags),
            ],
        ]);
    }

    // Update one destination; its slug stays fixed to keep links valid.
    public function update(Request $request, string $destination): JsonResponse
    {
        if ($error = $this->ensureTables(['destinations'])) {
            return $error;
        }

        $model = $this->resolveDestination($destination);
        // Ignore this record's own slug when checking uniqueness.
        $validated = Validator::make($this->normalize($request->all()), $this->rules(false, $model->id))->validate();
        // Never rewrite the slug here: saved reviews and favorites use it.
        unset($validated['slug']);
        $model->update($validated);

        return $this->json('Destination updated successfully.', ['destination' => $model->fresh()]);
    }

    // Delete a destination and all records that point to its slug.
    public function destroy(string $destination): JsonResponse
    {
        if ($error = $this->ensureTables(['destinations'])) {
            return $error;
        }

        $model = $this->resolveDestination($destination);
        $slug = $model->slug;
        // Each check protects the delete from a missing optional table.
        $hasReviews = Schema::hasTable('destination_reviews');
        $hasReplies = Schema::hasTable('destination_review_replies');
        $hasFavorites = Schema::hasTable('favorites');
        $hasVisits = Schema::hasTable('visited_destinations');

        // A transaction removes children and parent together; if one delete
        // fails, none of them are kept half-finished.
        DB::transaction(function () use ($model, $slug, $hasReviews, $hasReplies, $hasFavorites, $hasVisits): void {
            if ($hasReviews) {
                // Replies must go first because they belong to these reviews.
                $reviewIds = DB::table('destination_reviews')->where('destination_slug', $slug)->pluck('id');

                if ($hasReplies && $reviewIds->isNotEmpty()) {
                    DB::table('destination_review_replies')->whereIn('destination_review_id', $reviewIds)->delete();
                }

                DB::table('destination_reviews')->where('destination_slug', $slug)->delete();
            }

            // Favorites and visits also reference the slug, not the id.
            if ($hasFavorites) {
                DB::table('favorites')->where('destination_slug', $slug)->delete();
            }

            if ($hasVisits) {
                DB::table('visited_destinations')->where('destination_slug', $slug)->delete();
            }

            $model->delete();
        });

        return $this->json('Destination deleted successfully.');
    }

    // Validation rules shared by create and update.
    // 'sometimes' means optional on update; 'nullable' allows an empty value.
    private function rules(bool $creating = false, ?int $ignoreId = null): array
    {
        // Slugs must be unique, except for the record being updated.
        $uniqueRule = Rule::unique('destinations', 'slug');

        if ($ignoreId !== null) {
            $uniqueRule->ignore($ignoreId);
        }

        return [
            'slug' => ['sometimes', 'string', 'max:255', $uniqueRule],
            'name' => $creating
                ? ['required', 'string', 'max:255']
                : ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:255'],
            'image' => ['nullable', 'string', 'max:2048'],
            'description' => ['sometimes', 'string'],
            'overview' => ['nullable', 'string'],
            'highlights' => ['nullable', 'array'],
            'highlights.*' => ['string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'municipality' => ['nullable', 'string', 'max:255'],
            'barangays' => ['nullable', 'array'],
            'barangays.*' => ['string', 'max:255'],
            'location_aliases' => ['nullable', 'array'],
            'location_aliases.*' => ['string', 'max:255'],
            'opening_hours' => ['nullable', 'string', 'max:255'],
            'closing_hours' => ['nullable', 'string', 'max:255'],
            'operating_days' => ['nullable', 'string', 'max:255'],
            'entrance_fee' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:255'],
            'website_url' => ['nullable', 'string', 'max:2048'],
            'social_url' => ['nullable', 'string', 'max:2048'],
            'facilities' => ['nullable', 'array'],
            'facilities.*' => ['string', 'max:255'],
            // Coordinates are limited to real-world latitude/longitude ranges.
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'location_note' => ['nullable', 'string'],
            'route_steps' => ['nullable', 'array'],
            'route_steps.*.step_number' => ['required', 'integer'],
            'route_steps.*.instruction' => ['required', 'string'],
            'route_steps.*.landmark' => ['required', 'string'],
            'route_steps.*.image' => ['nullable', 'string', 'max:2048'],
        ];
    }

    // Fill required defaults before validation so simple forms still work.
    private function prepareForStore(array $data): array
    {
        // Blank category becomes 'Attraction' and blank description becomes ''.
        if (! isset($data['category']) || ! is_string($data['category']) || trim($data['category']) === '') {
            $data['category'] = 'Attraction';
        }

        if (! array_key_exists('description', $data) || $data['description'] === null) {
            $data['description'] = '';
        }

        // No slug supplied: make one from the name, then add -2, -3 if needed.
        if (! isset($data['slug']) || ! is_string($data['slug']) || trim($data['slug']) === '') {
            $base = Str::slug((string) ($data['name'] ?? '')) ?: 'destination';
            $slug = $base;
            $suffix = 2;

            // Loop until a free slug is found to avoid a unique-key error.
            while (Destination::where('slug', $slug)->exists()) {
                $slug = $base.'-'.$suffix;
                $suffix++;
            }

            $data['slug'] = $slug;
        } else {
            $data['slug'] = trim((string) $data['slug']);
        }

        return $data;
    }

    // Accept either a numeric id or a slug from the URL.
    // firstOrFail() returns HTTP 404 when nothing matches.
    private function resolveDestination(string $identifier): Destination
    {
        $query = Destination::query();

        if (ctype_digit($identifier)) {
            $query->where('id', (int) $identifier)->orWhere('slug', $identifier);
        } else {
            $query->where('slug', $identifier);
        }

        return $query->firstOrFail();
    }

    // Translate camelCase keys from the front end into database column names.
    // Existing snake_case values always win so no data is overwritten.
    private function normalize(array $data): array
    {
        $aliases = [
            'openingHours' => 'opening_hours',
            'closingHours' => 'closing_hours',
            'operatingDays' => 'operating_days',
            'entranceFee' => 'entrance_fee',
            'contactNumber' => 'contact_number',
            'locationNote' => 'location_note',
            'municipality' => 'municipality',
            'barangays' => 'barangays',
            'locationAliases' => 'location_aliases',
            'websiteUrl' => 'website_url',
            'socialUrl' => 'social_url',
            'routeSteps' => 'route_steps',
        ];

        foreach ($aliases as $camelKey => $snakeKey) {
            if (! array_key_exists($snakeKey, $data) && array_key_exists($camelKey, $data)) {
                $data[$snakeKey] = $data[$camelKey];
            }
        }

        if (isset($data['route_steps']) && is_array($data['route_steps'])) {
            $data['route_steps'] = array_map(function ($step) {
                if (! is_array($step)) {
                    return $step;
                }

                if (! array_key_exists('step_number', $step) && array_key_exists('stepNumber', $step)) {
                    $step['step_number'] = $step['stepNumber'];
                }

                return $step;
            }, $data['route_steps']);
        }

        return $data;
    }
}
