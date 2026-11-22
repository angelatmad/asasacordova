<?php

namespace App\Http\Controllers\Admin;

use App\Models\Event;
use App\Models\Notification;
use App\Models\User;
use DateTimeInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// Manage events and tell users when one becomes public.
// Admin access is checked by middleware; this class handles validation,
// publish state, and cleanup of related notifications.
class EventController extends AdminController
{
    // List events with optional search, category, and publish-state filters.
    public function index(Request $request): JsonResponse
    {
        if ($error = $this->ensureTables(['events'])) {
            return $error;
        }

        // Validate all filter names and values before building the query.
        $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:255'],
            'published' => ['sometimes', 'boolean'],
            'is_published' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::in(['published', 'draft', 'all'])],
        ]);

        $query = Event::query();

        if ($request->filled('search')) {
            $search = '%'.$request->string('search')->toString().'%';
            $query->where(function ($builder) use ($search): void {
                $builder->where('title', 'like', $search)
                    ->orWhere('description', 'like', $search)
                    ->orWhere('location', 'like', $search);
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->string('category')->toString());
        }

        // Accept several filter styles; the first one present wins.
        // 'published'/'is_published' are booleans; status uses friendly words.
        if ($request->has('published')) {
            $query->where('is_published', $request->boolean('published'));
        } elseif ($request->has('is_published')) {
            $query->where('is_published', $request->boolean('is_published'));
        } elseif ($request->input('status') === 'published') {
            $query->where('is_published', true);
        } elseif ($request->input('status') === 'draft') {
            $query->where('is_published', false);
        }

        // Soonest dates first; newest event breaks ties within the same date.
        $paginator = $query->orderBy('date')->orderByDesc('id')->paginate($this->perPage($request));

        return $this->paginated($paginator, 'Events retrieved successfully.');
    }

    // Create an event and notify all users only if it is published.
    public function store(Request $request): JsonResponse
    {
        if ($error = $this->ensureTables(['events'])) {
            return $error;
        }

        $validated = $this->validateEvent($request);

        // Create and notify in one transaction so users are never told about
        // an event that failed to save.
        $event = DB::transaction(function () use ($validated): Event {
            $event = Event::create($validated);
            $this->notifyPublished($event);

            return $event;
        });

        // 201 means a new record was created.
        return $this->json('Event created successfully.', ['event' => $event], 201);
    }

    // Return a single event, or HTTP 404 when the id does not exist.
    public function show(string $event): JsonResponse
    {
        if ($error = $this->ensureTables(['events'])) {
            return $error;
        }

        return $this->json('Event retrieved successfully.', [
            'event' => Event::findOrFail($event),
        ]);
    }

    // Edit an event; notify users only when it changes from draft to published.
    public function update(Request $request, string $event): JsonResponse
    {
        if ($error = $this->ensureTables(['events'])) {
            return $error;
        }

        $model = Event::findOrFail($event);
        $validated = $this->validateEvent($request);
        // Remember the old state before saving to spot a draft -> published change.
        $wasPublished = (bool) $model->is_published;

        DB::transaction(function () use ($model, $validated, $wasPublished): void {
            $model->update($validated);

            // Avoid sending duplicate notifications on later edits.
            if (! $wasPublished && $model->is_published) {
                $this->notifyPublished($model);
            }
        });

        return $this->json('Event updated successfully.', ['event' => $model->fresh()]);
    }

    // Delete an event and its notifications so no dead links remain.
    public function destroy(string $event): JsonResponse
    {
        if ($error = $this->ensureTables(['events'])) {
            return $error;
        }

        $model = Event::findOrFail($event);

        DB::transaction(function () use ($model): void {
            // related_id links a notification to this event's id.
            if (Schema::hasTable('notifications')) {
                Notification::where('type', 'event')->where('related_id', $model->id)->delete();
            }

            $model->delete();
        });

        return $this->json('Event deleted successfully.');
    }

    // Validate fields, then require at least one way to show when the event happens.
    private function validateEvent(Request $request): array
    {
        $validated = Validator::make($this->normalize($request->all()), $this->rules())->validate();

        // A schedule label is allowed when a fixed calendar date is not known.
        if (empty($validated['date']) && empty($validated['date_label'])) {
            throw ValidationException::withMessages([
                'date' => 'Provide a calendar date or a schedule label.',
            ]);
        }

        return $validated;
    }

    // Validation rules for creating and updating an event.
    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'date' => ['nullable', 'date'],
            'date_label' => ['nullable', 'string', 'max:255'],
            'details' => ['nullable', 'array'],
            'details.*' => ['string', 'max:500'],
            'time' => ['nullable', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'image' => ['nullable', 'string', 'max:2048'],
            'category' => ['sometimes', 'string', 'max:255'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }

    // Map front-end names to database columns and supply a default category.
    private function normalize(array $data): array
    {
        if (! array_key_exists('is_published', $data) && array_key_exists('published', $data)) {
            $data['is_published'] = $data['published'];
        }

        if (! array_key_exists('date_label', $data) && array_key_exists('dateOrSchedule', $data)) {
            $data['date_label'] = $data['dateOrSchedule'];
        }

        if (! isset($data['category']) || ! is_string($data['category']) || trim($data['category']) === '') {
            $data['category'] = 'event';
        }

        return $data;
    }

    // Create one notification per user so everyone learns about a public event.
    // Drafts and missing tables are skipped to avoid useless database writes.
    private function notifyPublished(Event $event): void
    {
        if (! $event->is_published || ! Schema::hasTable('notifications') || ! Schema::hasTable('users')) {
            return;
        }

        $date = $event->date;

        // Use the date, the label, or a friendly fallback in the message.
        $formattedDate = $date instanceof DateTimeInterface
            ? $date->format('M d, Y')
            : ($date ? (string) $date : ($event->date_label ?: 'a date to be announced'));

        User::query()
            ->select('id')
            ->get()
            ->each(function (User $user) use ($event, $formattedDate): void {
                Notification::create([
                    'user_id' => $user->id,
                    'title' => 'New Event Published',
                    'message' => "{$event->title} scheduled for {$formattedDate} at {$event->location}.",
                    'type' => 'event',
                    'related_id' => $event->id,
                ]);
            });
    }
}
