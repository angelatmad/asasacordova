<?php

namespace App\Console\Commands;

use App\Models\Destination;
use App\Models\Event;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Throwable;

/** Imports saved JSON snapshots into the database so content can be restored or refreshed safely. */
class ImportAscContent extends Command
{
    // Options let an admin import one content type or refresh existing rows.
    protected $signature = 'asc:import-content
        {--update : Refresh imported records from the source snapshots (non-empty values only)}
        {--destinations-only : Import destinations only}
        {--events-only : Import Cordova culture and event records only}';

    protected $description = 'Idempotently import the existing Asa sa Cordova destination and culture records into the application database.';

    /** Reads the options, runs the chosen imports, and prints a short report. */
    public function handle(): int
    {
        // Read each option once so the rest of the command can branch on it.
        $update = (bool) $this->option('update');
        $destinationsOnly = (bool) $this->option('destinations-only');
        $eventsOnly = (bool) $this->option('events-only');

        // Both filters together would skip all work, so reject that combination.
        if ($destinationsOnly && $eventsOnly) {
            $this->error('Choose only one of --destinations-only or --events-only.');

            return self::FAILURE;
        }

        $summary = [];

        try {
            if (! $eventsOnly) {
                $summary['destinations'] = $this->importDestinations($update);
            }

            if (! $destinationsOnly) {
                $summary['events'] = $this->importCultureEvents($update);
            }
        } catch (Throwable $error) {
            // Show a clear command-line message instead of a raw stack trace.
            $this->error('Import failed: '.$error->getMessage());

            return self::FAILURE;
        }

        // Report created/updated/unchanged counts so the admin can verify the run.
        foreach ($summary as $label => $result) {
            $this->info(ucfirst($label).': '.collect($result)->map(
                fn (int $count, string $key): string => "{$key}={$count}"
            )->implode(' '));
        }

        // Final totals confirm what is now stored after the import.
        $this->info('Current database totals: destinations='.Destination::count().' events='.Event::count());

        return self::SUCCESS;
    }

    /** Imports destination records from the JSON snapshot, matching them by slug. */
    private function importDestinations(bool $update): array
    {
        // database_path() keeps the snapshot path correct on any machine.
        $records = $this->readJson(database_path('data/destinations.json'));
        $result = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        // A transaction rolls back all rows if one insert or update fails.
        DB::transaction(function () use ($records, $update, &$result): void {
            foreach ($records as $record) {
                $slug = trim((string) ($record['slug'] ?? ''));

                // A row without a slug cannot be matched on later runs.
                if ($slug === '') {
                    continue;
                }

                // Map source JSON names (camelCase) to database columns (snake_case).
                $attributes = [
                    'slug' => $slug,
                    'name' => $record['name'] ?? null,
                    'category' => $record['category'] ?? null,
                    'image' => $record['image'] ?? null,
                    'description' => $record['description'] ?? null,
                    'overview' => $record['overview'] ?? null,
                    'highlights' => $record['highlights'] ?? null,
                    'address' => $record['address'] ?? null,
                    'municipality' => $record['municipality'] ?? null,
                    'barangays' => $record['barangays'] ?? null,
                    'location_aliases' => $record['locationAliases'] ?? null,
                    'opening_hours' => $record['openingHours'] ?? null,
                    'closing_hours' => $record['closingHours'] ?? null,
                    'operating_days' => $record['operatingDays'] ?? null,
                    'entrance_fee' => $record['entranceFee'] ?? null,
                    'contact_number' => $record['contactNumber'] ?? null,
                    'website_url' => $record['websiteUrl'] ?? null,
                    'social_url' => $record['socialUrl'] ?? null,
                    'facilities' => $record['facilities'] ?? null,
                    'latitude' => $record['latitude'] ?? null,
                    'longitude' => $record['longitude'] ?? null,
                    'location_note' => $record['locationNote'] ?? null,
                    'route_steps' => $record['routeSteps'] ?? null,
                ];

                // Looking up by slug first makes repeated runs idempotent (no duplicates).
                $destination = Destination::query()->where('slug', $slug)->first();

                if (! $destination) {
                    Destination::query()->create($attributes);
                    $result['created'] += 1;
                    $this->line("  created destination: {$slug}");

                    continue;
                }

                // Without --update, existing rows are deliberately left untouched.
                if (! $update) {
                    $result['unchanged'] += 1;

                    continue;
                }

                // The helper drops blank values so a partial snapshot cannot erase data.
                $changes = $this->nonEmptyValues($attributes, ['slug']);

                if ($changes === []) {
                    $result['unchanged'] += 1;

                    continue;
                }

                $destination->update($changes);
                $result['updated'] += 1;
                $this->line("  updated destination: {$slug}");
            }
        });

        return $result;
    }

    /** Imports culture events, using source_key so they stay distinct from admin events. */
    private function importCultureEvents(bool $update): array
    {
        $records = $this->readJson(database_path('data/culture-events.json'));
        $result = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        // Keep the whole import atomic so an error does not leave partial culture rows.
        DB::transaction(function () use ($records, $update, &$result): void {
            foreach ($records as $record) {
                // The prefix prevents a source id like "5" clashing with another source.
                $sourceKey = 'culture:'.trim((string) ($record['id'] ?? ''));

                if ($sourceKey === 'culture:') {
                    continue;
                }

                // Culture schedules may be text, so they use date_label instead of date.
                $attributes = [
                    'source_key' => $sourceKey,
                    'title' => $record['title'] ?? null,
                    'description' => $record['description'] ?? null,
                    'location' => $record['venueOrLocation'] ?? null,
                    'date_label' => $record['dateOrSchedule'] ?? null,
                    'details' => $record['details'] ?? null,
                    'category' => $record['category'] ?? 'event',
                    'is_published' => true,
                ];

                // Matching by source_key avoids duplicate imports of the same event.
                $event = Event::query()->where('source_key', $sourceKey)->first();

                if (! $event) {
                    Event::query()->create($attributes);
                    $result['created'] += 1;
                    $this->line('  created culture event: '.$sourceKey);

                    continue;
                }

                // Existing events stay as they are unless --update was requested.
                if (! $update) {
                    $result['unchanged'] += 1;

                    continue;
                }

                // Identity and publish flag are excluded from the refreshable fields.
                $changes = $this->nonEmptyValues($attributes, ['source_key', 'is_published']);

                if ($changes === []) {
                    $result['unchanged'] += 1;

                    continue;
                }

                $event->update($changes);
                $result['updated'] += 1;
                $this->line('  updated culture event: '.$sourceKey);
            }
        });

        return $result;
    }

    /** Keeps only meaningful values so blank snapshot fields cannot erase saved content. */
    private function nonEmptyValues(array $attributes, array $identityKeys): array
    {
        $values = [];

        foreach ($attributes as $key => $value) {
            // Identity keys are used for matching records, not for overwriting them.
            if (in_array($key, $identityKeys, true)) {
                continue;
            }

            // Null, empty text and empty arrays mean "no new value" here.
            if ($value === null || $value === '' || $value === []) {
                continue;
            }

            $values[$key] = $value;
        }

        return $values;
    }

    /** Reads and validates a snapshot before any database changes are made. */
    private function readJson(string $path): array
    {
        // Fail early with a clear message if the snapshot file is missing.
        if (! File::exists($path)) {
            throw new \RuntimeException("Missing source snapshot: {$path}");
        }

        // "true" decodes JSON into arrays, which the import loops can read easily.
        $records = json_decode(File::get($path), true);

        // A bad file would cause confusing errors later, so reject it here.
        if (! is_array($records)) {
            throw new \RuntimeException("Invalid source snapshot: {$path}");
        }

        return $records;
    }
}
