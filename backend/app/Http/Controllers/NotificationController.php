<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Handles every notification action for the signed-in user.
// Keeping these actions together makes it easier to see how ownership is checked
// before anything is changed in the database.
class NotificationController extends Controller
{
    // Return the signed-in user's newest notifications.
    // The relationship already limits the result to this user, so another
    // person's notifications can never be listed here.
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->get();

        return response()->json($notifications);
    }

    // Mark one notification as read.
    // A user may only change notifications that belong to their own account.
    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        $ownershipError = $this->ownershipError($request, $notification);

        if ($ownershipError !== null) {
            return $ownershipError;
        }

        $notification->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Notification marked as read.',
            'notification' => $notification,
        ]);
    }

    // Mark one notification as unread.
    // Clearing read_at makes the notification count as new again in the UI.
    public function markUnread(Request $request, Notification $notification): JsonResponse
    {
        $ownershipError = $this->ownershipError($request, $notification);

        if ($ownershipError !== null) {
            return $ownershipError;
        }

        $notification->update(['read_at' => null]);

        return response()->json([
            'message' => 'Notification marked as unread.',
            'notification' => $notification,
        ]);
    }

    // Mark every unread notification for this user as read.
    // The update starts from the user's relationship, so it cannot affect
    // notifications that belong to other accounts.
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()
            ->notifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'All notifications marked as read.',
        ]);
    }

    // Permanently delete one notification.
    // The same ownership check is used here so users cannot delete someone
    // else's notification by changing the id in the request.
    public function destroy(Request $request, Notification $notification): JsonResponse
    {
        $ownershipError = $this->ownershipError($request, $notification);

        if ($ownershipError !== null) {
            return $ownershipError;
        }

        $notification->delete();

        return response()->json([
            'message' => 'Notification deleted.',
        ]);
    }

    // Return a 403 response when the notification belongs to a different user.
    // Returning null means the ownership check passed and the action may continue.
    private function ownershipError(Request $request, Notification $notification): ?JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return null;
    }
}
