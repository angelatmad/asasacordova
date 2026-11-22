<?php

namespace App\Http\Controllers\Admin;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

// Lists users and changes their role from the admin panel.
// Role changes are guarded so an admin cannot accidentally remove all admins.
class UserController extends AdminController
{
    // List users with optional search/role filters and paginated safe fields.
    public function index(Request $request): JsonResponse
    {
        if ($error = $this->ensureTables(['users'])) {
            return $error;
        }

        // Rule::in() allows only the two known roles, blocking arbitrary values.
        $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', Rule::in(['user', 'admin'])],
        ]);

        // Select only columns that are safe to send to the front end.
        $query = User::query()->select('id', 'name', 'email', 'role', 'created_at', 'updated_at');

        // Match part of a name or email, not just an exact value.
        if ($request->filled('search')) {
            $search = '%'.$request->string('search')->toString().'%';
            $query->where(function ($builder) use ($search): void {
                $builder->where('name', 'like', $search)
                    ->orWhere('email', 'like', $search);
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->string('role')->toString());
        }

        // through() replaces each model with a safe array before JSON output.
        $paginator = $query->orderBy('name')->paginate($this->perPage($request))
            ->through(fn (User $user): array => $this->sanitizeUser($user));

        return $this->paginated($paginator, 'Users retrieved successfully.');
    }

    // Return one user's safe fields, or HTTP 404 if the id is unknown.
    public function show(string $user): JsonResponse
    {
        if ($error = $this->ensureTables(['users'])) {
            return $error;
        }

        $model = User::query()
            ->select('id', 'name', 'email', 'role', 'created_at', 'updated_at')
            ->findOrFail($user);

        return $this->json('User retrieved successfully.', ['user' => $this->sanitizeUser($model)]);
    }

    // Promote or demote a user, with checks that protect the admin group.
    public function updateRole(Request $request, string $user): JsonResponse
    {
        if ($error = $this->ensureTables(['users'])) {
            return $error;
        }

        $validated = $request->validate([
            'role' => ['required', Rule::in(['user', 'admin'])],
        ]);

        $targetId = (int) $user;
        $adminId = (int) auth()->id();

        // Safety check: the current admin cannot remove their own access.
        if ($targetId === $adminId && $validated['role'] === 'user') {
            return $this->json('You cannot demote yourself.', [], 422);
        }

        // Confirm the target exists before starting the transaction.
        User::query()->select('id', 'role')->findOrFail($targetId);

        // These variables carry the result out of the transaction closure.
        $error = null;
        $updated = null;

        DB::transaction(function () use (&$error, &$updated, $targetId, $validated): void {
            // lockForUpdate() prevents two admins editing this role at once.
            $target = User::whereKey($targetId)->lockForUpdate()->firstOrFail();

            if ($target->role === 'admin' && $validated['role'] === 'user') {
                // Keep at least one admin so the panel stays reachable.
                $adminCount = User::where('role', 'admin')->lockForUpdate()->count();

                if ($adminCount <= 1) {
                    $error = 'Cannot demote the last administrator.';

                    return;
                }
            }

            $target->update(['role' => $validated['role']]);
            $updated = $target->fresh();
        });

        // HTTP 422 means the request was understood but rejected by a rule.
        if ($error !== null) {
            return $this->json($error, [], 422);
        }

        return $this->json('User role updated successfully.', [
            'user' => $this->sanitizeUser($updated),
        ]);
    }
}
