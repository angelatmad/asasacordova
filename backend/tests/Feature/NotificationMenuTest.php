<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationMenuTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Every request in this test acts as this signed-in user.
        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    // The panel list must only contain notifications owned by the current user.
    public function test_notifications_index_returns_only_signed_in_users_records(): void
    {
        $mine = $this->createNotification($this->user);
        $other = $this->createNotification(User::factory()->create());

        $response = $this->getJson('/api/notifications');

        $response->assertOk()
            ->assertJsonFragment(['id' => $mine->id])
            ->assertJsonMissing(['id' => $other->id]);
    }

    // The header menu action marks this user's unread rows as read in the database.
    public function test_mark_all_read_updates_only_signed_in_users_notifications(): void
    {
        $mine = $this->createNotification($this->user);
        $other = $this->createNotification(User::factory()->create());

        $this->patchJson('/api/notifications/read-all')->assertOk();

        $this->assertNotNull(DB::table('notifications')->where('id', $mine->id)->value('read_at'));
        $this->assertNull(DB::table('notifications')->where('id', $other->id)->value('read_at'));
    }

    // The row menu action clears read_at so the unread count goes up again.
    public function test_mark_unread_clears_existing_read_at(): void
    {
        $notification = $this->createNotification($this->user, now());

        $this->patchJson("/api/notifications/{$notification->id}/unread")
            ->assertOk()
            ->assertJsonPath('notification.read_at', null);

        $this->assertNull(DB::table('notifications')->where('id', $notification->id)->value('read_at'));
    }

    // Deleting removes the chosen notification from storage permanently.
    public function test_delete_removes_selected_notification(): void
    {
        $notification = $this->createNotification($this->user);

        $this->deleteJson("/api/notifications/{$notification->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Notification deleted.');

        $this->assertDatabaseMissing('notifications', ['id' => $notification->id]);
    }

    // A guessed id must not let one user change or delete another user's notification.
    public function test_user_cannot_modify_or_delete_another_users_notification(): void
    {
        $otherNotification = $this->createNotification(User::factory()->create());

        $this->patchJson("/api/notifications/{$otherNotification->id}/unread")
            ->assertForbidden();
        $this->deleteJson("/api/notifications/{$otherNotification->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('notifications', ['id' => $otherNotification->id]);
    }

    // Build a notification row directly because this model has no factory yet.
    private function createNotification(User $user, mixed $readAt = null): Notification
    {
        return Notification::query()->create([
            'user_id' => $user->id,
            'title' => 'Event reminder',
            'message' => 'A new Cordova event was published.',
            'type' => 'event',
            'related_id' => 1,
            'read_at' => $readAt,
        ]);
    }
}
