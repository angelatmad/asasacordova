<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** An in-app notice for one user; read_at stays null until it is read. */
class Notification extends Model
{
    use HasFactory;

    // Only these columns can be filled when a notification is created.
    protected $fillable = [
        'user_id',
        'title',
        'message',
        'type',
        'related_id',
        'read_at',
    ];

    // A date cast lets the app treat read_at as a Carbon date object.
    protected $casts = [
        'read_at' => 'datetime',
    ];

    /** The owner of the notification; ownership is checked before changes. */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
