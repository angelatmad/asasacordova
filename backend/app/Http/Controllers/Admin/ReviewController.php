<?php

namespace App\Http\Controllers\Admin;

use App\Models\DestinationReview;
use App\Models\DestinationReviewReply;
use App\Models\Feedback;
use App\Models\FeedbackReply;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

// Moderates destination reviews and user feedback in one place.
// Admins can list and delete them, reply to feedback, and change its status;
// child records are removed together with their parent.
class ReviewController extends AdminController
{
    // Combine reviews and feedback into one searchable, paginated list.
    public function index(Request $request): JsonResponse
    {
        // Skip either source when its table is not installed yet.
        $flags = $this->tableFlags(['destination_reviews', 'feedback', 'users', 'destination_review_replies']);
        $missing = $this->missingTables($flags);

        // Rule::in() blocks unknown filter values before they reach the query.
        $request->validate([
            'type' => ['sometimes', Rule::in(['review', 'feedback', 'all'])],
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['pending', 'resolved'])],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        // Defaults: show both types, page 1, and no search/status filter.
        $type = $request->input('type', 'all');
        $perPage = $this->perPage($request);
        $page = max(1, (int) $request->input('page', 1));
        $search = $request->filled('search')
            ? mb_strtolower($request->string('search')->toString())
            : null;
        $status = $request->input('status');

        $items = collect();

        // Reviews are loaded with their author and replies in advance.
        if ($type !== 'feedback' && $flags['destination_reviews']) {
            $reviewsQuery = DestinationReview::with('user:id,name,email');

            if ($flags['destination_review_replies']) {
                $reviewsQuery->with('replies.user:id,name,email');
            }

            foreach ($reviewsQuery->latest()->get() as $review) {
                // Lowercase text lets the search ignore letter case.
                $haystack = mb_strtolower(
                    $review->comment.' '.$review->destination_slug.' '.($review->user?->name ?? '')
                );

                // Skip rows that do not contain the typed keyword.
                if ($search !== null && ! str_contains($haystack, $search)) {
                    continue;
                }

                $replies = $review->relationLoaded('replies')
                    ? $review->replies->map(fn (DestinationReviewReply $reply): array => $this->formatReviewReply($reply))->values()->all()
                    : [];

                $items->push([
                    'id' => (int) $review->id,
                    'type' => 'review',
                    'rating' => (int) $review->rating,
                    'comment' => $review->comment,
                    'destination' => $review->destination_slug,
                    'destination_slug' => $review->destination_slug,
                    'user_id' => (int) $review->user_id,
                    'replies' => $replies,
                    'user_name' => $review->user?->name,
                    'user' => $review->user ? [
                        'id' => (int) $review->user->id,
                        'name' => $review->user->name,
                    ] : null,
                    'created_at' => $this->formatDate($review->created_at),
                ]);
            }
        }

        // Feedback is added to the same list; status filtering applies here only.
        if ($type !== 'review' && $flags['feedback']) {
            $feedbackRecords = Feedback::with('user:id,name,email')->latest()->get();

            foreach ($feedbackRecords as $feedback) {
                $haystack = mb_strtolower(
                    $feedback->subject.' '.$feedback->message.' '.($feedback->user?->name ?? '')
                );

                if ($search !== null && ! str_contains($haystack, $search)) {
                    continue;
                }

                // Reviews have no status column, so only feedback is filtered.
                if ($status !== null && $feedback->status !== $status) {
                    continue;
                }

                $items->push([
                    'id' => (int) $feedback->id,
                    'type' => 'feedback',
                    'rating' => null,
                    'subject' => $feedback->subject,
                    'message' => $feedback->message,
                    'comment' => $feedback->message,
                    'status' => $feedback->status,
                    'user_id' => (int) $feedback->user_id,
                    'user_name' => $feedback->user?->name,
                    'user' => $feedback->user ? [
                        'id' => (int) $feedback->user->id,
                        'name' => $feedback->user->name,
                    ] : null,
                    'created_at' => $this->formatDate($feedback->created_at),
                ]);
            }
        }

        // Two different tables were merged, so we paginate the collection
        // manually instead of using Eloquent's paginate().
        $items = $items->sortByDesc('created_at')->values();
        $paginator = new Paginator(
            $items->forPage($page, $perPage)->values(),
            $items->count(),
            $perPage,
            $page,
            ['path' => $request->url()]
        );

        return $this->paginated($paginator, 'Reviews retrieved successfully.', [
            'setup' => [
                'complete' => $missing === [],
                'tables' => $flags,
                'missing_tables' => $missing,
            ],
        ]);
    }

    // Delete a review and its replies together so no orphan rows remain.
    public function destroyReview(string $review): JsonResponse
    {
        if ($error = $this->ensureTables(['destination_reviews'])) {
            return $error;
        }

        $model = DestinationReview::findOrFail($review);
        $hasReplies = Schema::hasTable('destination_review_replies');

        DB::transaction(function () use ($model, $hasReplies): void {
            // The replies table is optional, so check it before deleting.
            if ($hasReplies) {
                DestinationReviewReply::where('destination_review_id', $model->id)->delete();
            }

            $model->delete();
        });

        return $this->json('Review deleted successfully.');
    }

    // Delete one reply only when it really belongs to the given review.
    public function destroyReply(string $review, string $reply): JsonResponse
    {
        if ($error = $this->ensureTables(['destination_reviews', 'destination_review_replies'])) {
            return $error;
        }

        $reviewModel = DestinationReview::findOrFail($review);
        // The second where() is an ownership check: a reply from another
        // review must not be deletable through this URL.
        $replyModel = DestinationReviewReply::whereKey($reply)
            ->where('destination_review_id', $reviewModel->id)
            ->firstOrFail();

        $replyModel->delete();

        return $this->json('Review reply deleted successfully.');
    }

    // List feedback separately, with search/status filters and pagination.
    public function feedbackIndex(Request $request): JsonResponse
    {
        if ($error = $this->ensureTables(['feedback', 'feedback_replies'])) {
            return $error;
        }

        $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['pending', 'resolved'])],
        ]);

        // Eager loading the user and replies avoids many small queries.
        $query = Feedback::with(['user:id,name,email', 'replies.user:id,name,email']);

        if ($request->filled('search')) {
            $search = '%'.$request->string('search')->toString().'%';
            $query->where(function ($builder) use ($search): void {
                $builder->where('subject', 'like', $search)
                    ->orWhere('message', 'like', $search);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        // through() turns each model into the JSON shape expected by the UI.
        $paginator = $query->latest()->paginate($this->perPage($request))
            ->through(fn (Feedback $feedback): array => $this->formatFeedback($feedback));

        return $this->paginated($paginator, 'Feedback retrieved successfully.');
    }

    // Mark feedback as pending or resolved after validating the new status.
    public function updateFeedbackStatus(Request $request, string $feedback): JsonResponse
    {
        if ($error = $this->ensureTables(['feedback', 'feedback_replies'])) {
            return $error;
        }

        // Only the two known statuses are allowed; the field is required.
        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'resolved'])],
        ]);

        $model = Feedback::findOrFail($feedback);
        $model->update(['status' => $validated['status']]);

        return $this->json('Feedback status updated successfully.', [
            'feedback' => $this->formatFeedback($model->fresh(['user:id,name,email', 'replies.user:id,name,email'])),
        ]);
    }

    // Save an admin reply, close the feedback, and notify the original sender.
    public function replyToFeedback(Request $request, string $feedback): JsonResponse
    {
        if ($error = $this->ensureTables(['feedback', 'feedback_replies'])) {
            return $error;
        }

        $validated = Validator::make($request->all(), [
            'reply' => ['required', 'string'],
        ])->validate();

        $model = Feedback::findOrFail($feedback);
        $reply = null;

        // All three writes happen together; auth()->id() is the admin replying.
        DB::transaction(function () use (&$reply, $model, $validated): void {
            $reply = FeedbackReply::create([
                'feedback_id' => $model->id,
                'user_id' => auth()->id(),
                'reply' => $validated['reply'],
            ]);

            // Replying automatically means the issue is resolved.
            $model->update(['status' => 'resolved']);

            // Tell the feedback owner; related_id points back to the feedback.
            if (Schema::hasTable('notifications')) {
                Notification::create([
                    'user_id' => $model->user_id,
                    'title' => 'Admin Replied to Feedback',
                    'message' => "An administrator has replied to your feedback: \"{$model->subject}\".",
                    'type' => 'feedback_reply',
                    'related_id' => $model->id,
                ]);
            }
        });

        return $this->json('Reply sent successfully.', [
            'reply' => $this->formatFeedbackReply($reply->load('user:id,name,email')),
            'feedback' => $this->formatFeedback($model->fresh(['user:id,name,email', 'replies.user:id,name,email'])),
        ], 201);
    }

    // Delete feedback with its replies and notifications to avoid leftovers.
    public function destroyFeedback(string $feedback): JsonResponse
    {
        if ($error = $this->ensureTables(['feedback'])) {
            return $error;
        }

        $model = Feedback::findOrFail($feedback);

        DB::transaction(function () use ($model): void {
            // Replies reference feedback_id; notifications use type + related_id.
            if (Schema::hasTable('feedback_replies')) {
                FeedbackReply::where('feedback_id', $model->id)->delete();
            }

            if (Schema::hasTable('notifications')) {
                Notification::where('type', 'feedback_reply')->where('related_id', $model->id)->delete();
            }

            $model->delete();
        });

        return $this->json('Feedback deleted successfully.');
    }

    // Build the feedback JSON shape: fields, author, and formatted replies.
    private function formatFeedback(Feedback $feedback): array
    {
        $replies = $feedback->relationLoaded('replies')
            ? $feedback->replies->map(fn (FeedbackReply $reply): array => $this->formatFeedbackReply($reply))->values()->all()
            : [];

        return [
            'id' => (int) $feedback->id,
            'subject' => $feedback->subject,
            'message' => $feedback->message,
            'status' => $feedback->status,
            'user_id' => (int) $feedback->user_id,
            'user' => $feedback->user ? [
                'id' => (int) $feedback->user->id,
                'name' => $feedback->user->name,
                'email' => $feedback->user->email,
            ] : null,
            'user_name' => $feedback->user?->name,
            'replies' => $replies,
            'created_at' => $this->formatDate($feedback->created_at),
            'updated_at' => $this->formatDate($feedback->updated_at),
        ];
    }

    // Format one feedback reply for the API response.
    private function formatFeedbackReply(FeedbackReply $reply): array
    {
        return [
            'id' => (int) $reply->id,
            'reply' => $reply->reply,
            'user_id' => (int) $reply->user_id,
            'user' => $reply->user ? [
                'id' => (int) $reply->user->id,
                'name' => $reply->user->name,
            ] : null,
            'user_name' => $reply->user?->name,
            'created_at' => $this->formatDate($reply->created_at),
        ];
    }

    // Format a review reply; 'reply' is also copied to 'comment' for the UI.
    private function formatReviewReply(DestinationReviewReply $reply): array
    {
        return [
            'id' => (int) $reply->id,
            'reply' => $reply->reply,
            'comment' => $reply->reply,
            'user_id' => (int) $reply->user_id,
            'user' => $reply->user ? [
                'id' => (int) $reply->user->id,
                'name' => $reply->user->name,
            ] : null,
            'user_name' => $reply->user?->name,
            'created_at' => $this->formatDate($reply->created_at),
        ];
    }
}
