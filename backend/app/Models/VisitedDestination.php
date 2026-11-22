<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One row per user and destination, storing how many times it was visited. */
class VisitedDestination extends Model
{
    // The table name is stated explicitly to match the migration.
    protected $table = 'visited_destinations';

    // visit_count is increased on repeat visits; the timestamp tracks the latest one.
    protected $fillable = [
        'user_id',
        'destination_slug',
        'visit_count',
        'last_visited_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'visit_count' => 'integer',
        'last_visited_at' => 'datetime',
    ];

    /** The user whose visit history this row belongs to. */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** The destination is found by slug, matching how visitors open it online. */
    public function destination()
    {
        return $this->belongsTo(Destination::class, 'destination_slug', 'slug');
    }
}
