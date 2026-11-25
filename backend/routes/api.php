<?php

use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DestinationController;
use App\Http\Controllers\Admin\EventController;
use App\Http\Controllers\Admin\ProfileController;
use App\Http\Controllers\Admin\ReviewController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AssistantController;
use App\Http\Controllers\NotificationController;
use App\Models\Destination;
use App\Models\DestinationReview;
use App\Models\DestinationReviewReply;
use App\Models\Event;
use App\Models\Favorite;
use App\Models\Feedback;
use App\Models\FeedbackReply;
use App\Models\Notification;
use App\Models\User;
use App\Models\VisitedDestination;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;

// Controllers keep related route logic in dedicated classes instead of this file.
Route::post('/auth/register', function (Request $request) {
    $validated = $request->validate([
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
        'password' => ['required', 'string', 'min:8'],
    ]);

    $user = User::create([
        'name' => $validated['name'],
        'email' => $validated['email'],
        'password' => Hash::make($validated['password']),
        'role' => 'user',
    ]);

    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'message' => 'Account created successfully.',
        'user' => $user,
        'token' => $token,
    ], 201);
});

Route::post('/auth/login', function (Request $request) {
    $credentials = $request->validate([
        'email' => ['required', 'email'],
        'password' => ['required'],
    ]);

    if (! Auth::attempt($credentials)) {
        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    $user = $request->user() ?? User::where('email', $credentials['email'])->first();
    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'message' => 'Signed in successfully.',
        'user' => $user,
        'token' => $token,
    ]);
});

Route::middleware('auth:sanctum')->post('/auth/logout', function (Request $request) {
    $request->user()->currentAccessToken()->delete();

    return response()->json([
        'message' => 'Logged out successfully.',
    ]);
});

Route::middleware('auth:sanctum')->get('/auth/user', function (Request $request) {
    return response()->json($request->user());
});

Route::post('/auth/forgot-password', function (Request $request) {
    $request->validate(['email' => ['required', 'email']]);

    return response()->json([
        'message' => 'If an account exists for this email, a verification code has been sent.',
        'reset_token' => 'demo_reset_token_12345',
    ]);
});

Route::post('/auth/verify-reset-code', function (Request $request) {
    $request->validate([
        'email' => ['required', 'email'],
        'code' => ['required', 'string', 'size:6'],
    ]);

    return response()->json([
        'message' => 'Code verified successfully.',
        'reset_token' => 'demo_reset_token_12345',
    ]);
});

Route::post('/auth/reset-password', function (Request $request) {
    $request->validate([
        'email' => ['required', 'email'],
        'reset_token' => ['required'],
        'password' => ['required', 'string', 'min:8'],
    ]);

    $user = User::where('email', $request->email)->first();

    if ($user) {
        $user->password = Hash::make($request->password);
        $user->save();
    }

    return response()->json([
        'message' => 'Password reset successfully.',
    ]);
});

// Public destination directory. Admin edits are reflected here immediately.
Route::get('/destinations', function (Request $request) {
    // Only allow known filters so unexpected query strings cannot reach the query.
    $request->validate([
        'search' => ['sometimes', 'string', 'max:255'],
        'category' => ['sometimes', 'string', 'max:255'],
        'barangay' => ['sometimes', 'string', 'max:255'],
        'municipality' => ['sometimes', 'string', 'max:255'],
    ]);

    // Review totals are calculated in SQL, so cards never show sample ratings.
    $query = Destination::query()
        ->withCount('reviews as reviews_count')
        ->withAvg('reviews as average_rating', 'rating');

    if ($request->filled('search')) {
        // % is a wildcard, so LIKE finds the word anywhere in these text columns.
        $search = '%'.$request->string('search')->toString().'%';
        $query->where(function ($builder) use ($search): void {
            $builder->where('name', 'like', $search)
                ->orWhere('slug', 'like', $search)
                ->orWhere('description', 'like', $search)
                ->orWhere('overview', 'like', $search)
                ->orWhere('address', 'like', $search)
                ->orWhere('location_note', 'like', $search)
                // Barangays and aliases are JSON lists, so they need a JSON search.
                ->orWhereJsonContains('barangays', $request->string('search')->toString())
                ->orWhereJsonContains('location_aliases', $request->string('search')->toString());
        });
    }

    // These are exact column matches, unlike the flexible search above.
    if ($request->filled('category')) {
        $query->where('category', $request->string('category')->toString());
    }

    if ($request->filled('barangay')) {
        $query->whereJsonContains('barangays', $request->string('barangay')->toString());
    }

    if ($request->filled('municipality')) {
        $query->where('municipality', $request->string('municipality')->toString());
    }

    return response()->json($query->orderBy('name')->get());
});

Route::get('/destinations/{slug}', function (string $slug) {
    // firstOrFail() automatically returns 404 when the slug is not found.
    // The same review aggregates as the list keep detail ratings consistent.
    $destination = Destination::query()
        ->where('slug', $slug)
        ->withCount('reviews as reviews_count')
        ->withAvg('reviews as average_rating', 'rating')
        ->firstOrFail();

    return response()->json($destination);
});

// Events Routes
Route::get('/events', function (Request $request) {
    $query = Event::query();

    // Guests only see published events; admins can also see drafts.
    if (! Auth::check() || Auth::user()->role !== 'admin') {
        $query->where('is_published', true);
    }

    // Dated events come first, then undated ones that only have a text label.
    return response()->json(
        $query
            ->orderByRaw('date IS NULL')
            ->orderBy('date', 'asc')
            ->orderBy('date_label', 'asc')
            ->get()
    );
});

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/events', function (Request $request) {
        // A text label (for example "Every Saturday") may replace an exact date.
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'date' => ['nullable', 'date'],
            'date_label' => ['nullable', 'string', 'max:255'],
            // details is a list of short strings shown on the event page.
            'details' => ['nullable', 'array'],
            'details.*' => ['string', 'max:500'],
            'time' => ['nullable', 'string'],
            'location' => ['required', 'string'],
            'image' => ['nullable', 'string'],
            'category' => ['required', 'string'],
            'is_published' => ['boolean'],
        ]);

        // At least one schedule field is required so the event card is not blank.
        if (empty($validated['date']) && empty($validated['date_label'])) {
            throw ValidationException::withMessages([
                'date' => 'Provide a calendar date or a schedule label.',
            ]);
        }

        $event = Event::create($validated);

        // Notify registered users about published events (if published)
        if ($event->is_published) {
            $users = User::all();
            foreach ($users as $user) {
                Notification::create([
                    'user_id' => $user->id,
                    'title' => 'New Event Published',
                    // Use the exact date first, then the label, then a safe fallback.
                    'message' => "{$event->title} scheduled for ".($event->date?->format('M d, Y') ?? $event->date_label ?? 'a date to be announced')." at {$event->location}.",
                    'type' => 'event',
                    'related_id' => $event->id,
                ]);
            }
        }

        return response()->json([
            'message' => 'Event created successfully.',
            'event' => $event,
        ], 201);
    });

    Route::put('/events/{event}', function (Request $request, Event $event) {
        // Keep the same flexible schedule rules used when creating an event.
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'date' => ['nullable', 'date'],
            'date_label' => ['nullable', 'string', 'max:255'],
            'details' => ['nullable', 'array'],
            'details.*' => ['string', 'max:500'],
            'time' => ['nullable', 'string'],
            'location' => ['required', 'string'],
            'image' => ['nullable', 'string'],
            'category' => ['required', 'string'],
            'is_published' => ['boolean'],
        ]);

        // Neither schedule field may be empty after the update.
        if (empty($validated['date']) && empty($validated['date_label'])) {
            throw ValidationException::withMessages([
                'date' => 'Provide a calendar date or a schedule label.',
            ]);
        }

        // Remember the old status so notifications fire only on first publish.
        $wasPublished = $event->is_published;
        $event->update($validated);

        // If newly published or details updated while published, notify users
        if ($event->is_published && ! $wasPublished) {
            $users = User::all();
            foreach ($users as $user) {
                Notification::create([
                    'user_id' => $user->id,
                    'title' => 'New Event Published',
                    // Prefer the date, then the label, then a readable fallback.
                    'message' => "{$event->title} scheduled for ".($event->date?->format('M d, Y') ?? $event->date_label ?? 'a date to be announced')." at {$event->location}.",
                    'type' => 'event',
                    'related_id' => $event->id,
                ]);
            }
        }

        return response()->json([
            'message' => 'Event updated successfully.',
            'event' => $event,
        ]);
    });

    Route::delete('/events/{event}', function (Event $event) {
        $event->delete();

        return response()->json([
            'message' => 'Event deleted successfully.',
        ]);
    });
});

// Feedback & Replies Routes
Route::middleware('auth:sanctum')->get('/feedback', function (Request $request) {
    // Admins see everything; regular users only see their own feedback.
    if ($request->user()->role === 'admin') {
        return response()->json(Feedback::with(['user', 'replies.user'])->latest()->get());
    }

    // The user_id filter stops one visitor reading another visitor's messages.
    return response()->json(Feedback::where('user_id', $request->user()->id)->with(['replies.user'])->latest()->get());
});

Route::middleware('auth:sanctum')->post('/feedback', function (Request $request) {
    $validated = $request->validate([
        'subject' => ['required', 'string', 'max:255'],
        'message' => ['required', 'string'],
    ]);

    $feedback = Feedback::create([
        'user_id' => $request->user()->id,
        'subject' => $validated['subject'],
        'message' => $validated['message'],
        'status' => 'pending',
    ]);

    return response()->json([
        'message' => 'Feedback submitted successfully.',
        'feedback' => $feedback,
    ], 201);
});

Route::middleware(['auth:sanctum', 'admin'])->post('/feedback/{feedback}/reply', function (Request $request, Feedback $feedback) {
    $validated = $request->validate([
        'reply' => ['required', 'string'],
    ]);

    $reply = FeedbackReply::create([
        'feedback_id' => $feedback->id,
        'user_id' => $request->user()->id,
        'reply' => $validated['reply'],
    ]);

    $feedback->update(['status' => 'resolved']);

    // Notify original feedback author only
    Notification::create([
        'user_id' => $feedback->user_id,
        'title' => 'Admin Replied to Feedback',
        'message' => "An administrator has replied to your feedback: \"{$feedback->subject}\".",
        'type' => 'feedback_reply',
        'related_id' => $feedback->id,
    ]);

    return response()->json([
        'message' => 'Reply sent successfully.',
        'reply' => $reply->load('user'),
        'feedback' => $feedback->fresh(['user', 'replies.user']),
    ], 201);
});

// Destination Reviews & Replies Routes
// Reviews are public to read, but only the author or an admin may change them.
Route::get('/destinations/{slug}/reviews', function ($slug) {
    $reviews = DestinationReview::where('destination_slug', $slug)
        ->with(['user', 'replies.user'])
        ->latest()
        ->get();

    return response()->json($reviews);
});

Route::middleware('auth:sanctum')->post('/destinations/{slug}/reviews', function (Request $request, $slug) {
    Destination::query()->where('slug', $slug)->firstOrFail();

    $validated = $request->validate([
        'rating' => ['required', 'integer', 'min:1', 'max:5'],
        'comment' => ['required', 'string'],
    ]);

    $review = DestinationReview::create([
        'destination_slug' => $slug,
        'user_id' => $request->user()->id,
        'rating' => $validated['rating'],
        'comment' => $validated['comment'],
    ]);

    return response()->json([
        'message' => 'Review submitted successfully.',
        'review' => $review->load(['user', 'replies.user']),
    ], 201);
});

Route::middleware('auth:sanctum')->put('/destination-reviews/{review}', function (Request $request, DestinationReview $review) {
    $user = $request->user();
    // Ownership check: only the author or an admin may edit this review.
    if ($review->user_id !== $user->id && $user->role !== 'admin') {
        return response()->json(['message' => 'Forbidden. You can only edit your own reviews.'], 403);
    }

    $validated = $request->validate([
        'rating' => ['required', 'integer', 'min:1', 'max:5'],
        'comment' => ['required', 'string'],
    ]);

    $review->update($validated);

    return response()->json([
        'message' => 'Review updated successfully.',
        'review' => $review->fresh(['user', 'replies.user']),
    ]);
});

Route::middleware('auth:sanctum')->delete('/destination-reviews/{review}', function (Request $request, DestinationReview $review) {
    $user = $request->user();
    if ($review->user_id !== $user->id && $user->role !== 'admin') {
        return response()->json(['message' => 'Forbidden. You can only delete your own reviews.'], 403);
    }

    $review->delete();

    return response()->json([
        'message' => 'Review deleted successfully.',
    ]);
});

Route::middleware('auth:sanctum')->post('/destination-reviews/{review}/replies', function (Request $request, DestinationReview $review) {
    $validated = $request->validate([
        'reply' => ['required', 'string'],
    ]);

    $reply = DestinationReviewReply::create([
        'destination_review_id' => $review->id,
        'user_id' => $request->user()->id,
        'reply' => $validated['reply'],
    ]);

    return response()->json([
        'message' => 'Reply posted successfully.',
        'reply' => $reply->load('user'),
    ], 201);
});

Route::middleware('auth:sanctum')->put('/destination-review-replies/{reply}', function (Request $request, DestinationReviewReply $reply) {
    $user = $request->user();
    if ($reply->user_id !== $user->id && $user->role !== 'admin') {
        return response()->json(['message' => 'Forbidden. You can only edit your own replies.'], 403);
    }

    $validated = $request->validate([
        'reply' => ['required', 'string'],
    ]);

    $reply->update($validated);

    return response()->json([
        'message' => 'Reply updated successfully.',
        'reply' => $reply->load('user'),
    ]);
});

Route::middleware('auth:sanctum')->delete('/destination-review-replies/{reply}', function (Request $request, DestinationReviewReply $reply) {
    $user = $request->user();
    if ($reply->user_id !== $user->id && $user->role !== 'admin') {
        return response()->json(['message' => 'Forbidden. You can only delete your own replies.'], 403);
    }

    $reply->delete();

    return response()->json([
        'message' => 'Reply deleted successfully.',
    ]);
});

// AI Chatbot Route (OpenRouter). The API key stays on the server.
// throttle:20,1 allows 20 chat requests per minute per user to control AI cost.
Route::middleware(['auth:sanctum', 'throttle:20,1'])->post('/chat', [AssistantController::class, 'chat']);

// Notification routes all require a Sanctum token.
// The controller checks that a notification belongs to the signed-in user before
// changing or deleting it, and both visitor and admin panels share these routes.
Route::middleware('auth:sanctum')->prefix('notifications')->group(function () {
    // Load the notification list for the current user, newest first.
    Route::get('/', [NotificationController::class, 'index']);

    // Mark every unread notification for the current user as read.
    Route::patch('/read-all', [NotificationController::class, 'markAllRead']);

    // Change one notification to read or unread, or remove it completely.
    Route::patch('/{notification}/read', [NotificationController::class, 'markRead']);
    Route::patch('/{notification}/unread', [NotificationController::class, 'markUnread']);
    Route::delete('/{notification}', [NotificationController::class, 'destroy']);
});

// Personal favorites and visited log. Stored per user so admin statistics reflect real activity.
Route::middleware('auth:sanctum')->get('/favorites', function (Request $request) {
    // pluck() returns only slugs because the frontend just needs saved/unsaved state.
    return response()->json(
        Favorite::where('user_id', $request->user()->id)->pluck('destination_slug')
    );
});

Route::middleware('auth:sanctum')->post('/favorites', function (Request $request) {
    $validated = $request->validate(['slug' => ['required', 'string', 'max:255']]);

    // firstOrCreate prevents duplicates if the save button is clicked twice.
    Favorite::firstOrCreate([
        'user_id' => $request->user()->id,
        'destination_slug' => $validated['slug'],
    ]);

    return response()->json(['message' => 'Saved to favorites.']);
});

Route::middleware('auth:sanctum')->delete('/favorites/{slug}', function (Request $request, string $slug) {
    // user_id scoping means a visitor can only remove their own favorite.
    Favorite::where('user_id', $request->user()->id)
        ->where('destination_slug', $slug)
        ->delete();

    return response()->json(['message' => 'Removed from favorites.']);
});

Route::middleware('auth:sanctum')->get('/visited', function (Request $request) {
    // Rename database columns to the shorter field names used by the frontend.
    return response()->json(
        VisitedDestination::where('user_id', $request->user()->id)
            ->get()
            ->map(fn (VisitedDestination $record): array => [
                'destination_slug' => $record->destination_slug,
                'count' => $record->visit_count,
                'last_visited_at' => $record->last_visited_at?->toDateString(),
            ])
            ->values()
    );
});

Route::middleware('auth:sanctum')->post('/visited/{slug}', function (Request $request, string $slug) {
    // First visit creates a row starting at 1; later visits update that same row.
    $record = VisitedDestination::firstOrCreate([
        'user_id' => $request->user()->id,
        'destination_slug' => $slug,
    ], [
        'visit_count' => 1,
        'last_visited_at' => now(),
    ]);

    // wasRecentlyCreated tells us whether this was a new row or an existing one.
    if (! $record->wasRecentlyCreated) {
        $record->increment('visit_count');
        $record->update(['last_visited_at' => now()]);
    }

    return response()->json([
        'message' => 'Visit recorded.',
        'count' => $record->visit_count,
    ]);
});

Route::middleware('auth:sanctum')->delete('/visited/{slug}', function (Request $request, string $slug) {
    // The same user scoping protects other visitors' history from deletion.
    VisitedDestination::where('user_id', $request->user()->id)
        ->where('destination_slug', $slug)
        ->delete();

    return response()->json(['message' => 'Visit log removed.']);
});

// Both middleware checks are required here: a valid token AND an admin role.
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Admin create/read/update/delete for destinations (the public list reads the same table).
    Route::get('/destinations', [DestinationController::class, 'index']);
    Route::post('/destinations', [DestinationController::class, 'store']);
    Route::get('/destinations/{destination}', [DestinationController::class, 'show']);
    Route::put('/destinations/{destination}', [DestinationController::class, 'update']);
    Route::delete('/destinations/{destination}', [DestinationController::class, 'destroy']);

    // Admins manage draft and published events here.
    Route::get('/events', [EventController::class, 'index']);
    Route::post('/events', [EventController::class, 'store']);
    Route::get('/events/{event}', [EventController::class, 'show']);
    Route::put('/events/{event}', [EventController::class, 'update']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);

    // User management and role changes are admin-only.
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::put('/users/{user}/role', [UserController::class, 'updateRole']);

    // Moderation tools for reviews and feedback.
    Route::get('/reviews', [ReviewController::class, 'index']);
    Route::delete('/reviews/{review}', [ReviewController::class, 'destroyReview']);
    Route::delete('/reviews/{review}/replies/{reply}', [ReviewController::class, 'destroyReply']);

    Route::get('/feedback', [ReviewController::class, 'feedbackIndex']);
    Route::put('/feedback/{feedback}/status', [ReviewController::class, 'updateFeedbackStatus']);
    Route::post('/feedback/{feedback}/reply', [ReviewController::class, 'replyToFeedback']);
    Route::delete('/feedback/{feedback}', [ReviewController::class, 'destroyFeedback']);

    // Dashboard numbers and the admin's own profile settings.
    Route::get('/analytics', [AnalyticsController::class, 'index']);
    Route::get('/profile', [ProfileController::class, 'show']);
});
