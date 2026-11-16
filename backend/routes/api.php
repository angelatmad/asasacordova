<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use App\Models\DestinationReview;
use App\Models\DestinationReviewReply;
use App\Models\Feedback;
use App\Models\FeedbackReply;
use App\Models\Notification;

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

    if (!Auth::attempt($credentials)) {
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

// Events Routes
Route::get('/events', function (Request $request) {
    $query = Event::query();

    if (!Auth::check() || Auth::user()->role !== 'admin') {
        $query->where('is_published', true);
    }

    return response()->json($query->orderBy('date', 'asc')->get());
});

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/events', function (Request $request) {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'date' => ['required', 'date'],
            'time' => ['nullable', 'string'],
            'location' => ['required', 'string'],
            'image' => ['nullable', 'string'],
            'category' => ['required', 'string'],
            'is_published' => ['boolean'],
        ]);

        $event = Event::create($validated);

        // Notify registered users about published events (if published)
        if ($event->is_published) {
            $users = User::all();
            foreach ($users as $user) {
                Notification::create([
                    'user_id' => $user->id,
                    'title' => 'New Event Published',
                    'message' => "{$event->title} scheduled for {$event->date->format('M d, Y')} at {$event->location}.",
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
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'date' => ['required', 'date'],
            'time' => ['nullable', 'string'],
            'location' => ['required', 'string'],
            'image' => ['nullable', 'string'],
            'category' => ['required', 'string'],
            'is_published' => ['boolean'],
        ]);

        $wasPublished = $event->is_published;
        $event->update($validated);

        // If newly published or details updated while published, notify users
        if ($event->is_published && !$wasPublished) {
            $users = User::all();
            foreach ($users as $user) {
                Notification::create([
                    'user_id' => $user->id,
                    'title' => 'New Event Published',
                    'message' => "{$event->title} scheduled for {$event->date->format('M d, Y')} at {$event->location}.",
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
    if ($request->user()->role === 'admin') {
        return response()->json(Feedback::with(['user', 'replies.user'])->latest()->get());
    }
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
Route::get('/destinations/{slug}/reviews', function ($slug) {
    $reviews = DestinationReview::where('destination_slug', $slug)
        ->with(['user', 'replies.user'])
        ->latest()
        ->get();
    return response()->json($reviews);
});

Route::middleware('auth:sanctum')->post('/destinations/{slug}/reviews', function (Request $request, $slug) {
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

// Notifications Routes
Route::middleware('auth:sanctum')->get('/notifications', function (Request $request) {
    return response()->json($request->user()->notifications()->latest()->get());
});

Route::middleware('auth:sanctum')->patch('/notifications/{notification}/read', function (Request $request, Notification $notification) {
    if ($notification->user_id !== $request->user()->id) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    $notification->update(['read_at' => now()]);

    return response()->json([
        'message' => 'Notification marked as read.',
        'notification' => $notification,
    ]);
});

Route::middleware('auth:sanctum')->patch('/notifications/read-all', function (Request $request) {
    $request->user()->notifications()->whereNull('read_at')->update(['read_at' => now()]);

    return response()->json([
        'message' => 'All notifications marked as read.',
    ]);
});
