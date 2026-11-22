<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use DateTimeInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Shared helpers for every admin API controller.
// The routes check the login and admin role first, so these methods only deal
// with table readiness, page size, and a consistent response shape.
abstract class AdminController extends Controller
{
    // Give every admin response the same shape: a message plus any extra keys.
    protected function json(string $message, array $payload = [], int $status = 200): JsonResponse
    {
        return response()->json(array_merge(['message' => $message], $payload), $status);
    }

    // Stop with HTTP 503 if migrations were not run yet.
    // The front end reads setup.missing_tables to explain what is not ready.
    protected function ensureTables(array $tables): ?JsonResponse
    {
        // Schema::hasTable checks the structure, not whether the table has data.
        $missing = array_values(array_filter(
            $tables,
            fn (string $table): bool => ! Schema::hasTable($table)
        ));

        if ($missing === []) {
            return null;
        }

        return $this->json('Required database tables are missing.', [
            'setup' => [
                'required' => true,
                'complete' => false,
                'missing_tables' => $missing,
            ],
        ], 503);
    }

    // Map each table name to true/false so callers can skip missing tables.
    protected function tableFlags(array $tables): array
    {
        $flags = [];

        foreach ($tables as $table) {
            $flags[$table] = Schema::hasTable($table);
        }

        return $flags;
    }

    // Convert the true/false map into a simple list of missing table names.
    protected function missingTables(array $flags): array
    {
        return array_keys(array_filter($flags, fn (bool $exists): bool => ! $exists));
    }

    // Keep page size between 1 and 100 so one request cannot load everything.
    // 'paginate' is an older alias for 'per_page'; 15 is the default.
    protected function perPage(Request $request): int
    {
        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'paginate' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        return (int) ($validated['per_page'] ?? $validated['paginate'] ?? 15);
    }

    // Wrap a page of rows with page numbers and totals for the front end.
    // 'meta' and 'pagination' repeat the same values because different screens
    // read different keys.
    protected function paginated(LengthAwarePaginator $paginator, string $message, array $extra = []): JsonResponse
    {
        $meta = [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];

        return $this->json($message, array_merge([
            'data' => $paginator->items(),
            'meta' => $meta,
            'pagination' => $meta,
        ], $extra));
    }

    // Return only safe user fields; passwords and tokens are never exposed.
    protected function sanitizeUser($user): array
    {
        return [
            'id' => (int) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'created_at' => $this->formatDate($user->created_at ?? null),
            'updated_at' => $this->formatDate($user->updated_at ?? null),
        ];
    }

    // Send all dates in one readable format (ISO 8601) or null when absent.
    protected function formatDate($value): ?string
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof DateTimeInterface) {
            return $value->format(DATE_ATOM);
        }

        return (string) $value;
    }

    // Count records for the last six months, including the current month.
    // Empty buckets are created first so charts still show every month label.
    protected function monthlyActivity(?string $table, string $column): array
    {
        $start = now()->startOfMonth()->subMonths(5);
        $buckets = [];

        for ($monthIndex = 0; $monthIndex < 6; $monthIndex++) {
            $month = $start->copy()->addMonths($monthIndex);
            $key = $month->format('Y-m');
            $buckets[$key] = [
                'month' => $key,
                'label' => $month->format('M Y'),
                'count' => 0,
            ];
        }

        // A null table means its feature is not installed yet, so counts stay zero.
        if ($table !== null && Schema::hasTable($table)) {
            DB::table($table)
                ->where($column, '>=', $start)
                ->get([$column])
                ->each(function ($row) use (&$buckets, $column): void {
                    $rawDate = $row->{$column} ?? null;

                    if ($rawDate === null || $rawDate === '') {
                        return;
                    }

                    // The 'YYYY-MM' prefix groups different days into one month.
                    $key = substr((string) $rawDate, 0, 7);

                    if (isset($buckets[$key])) {
                        $buckets[$key]['count']++;
                    }
                });
        }

        return array_values($buckets);
    }
}
