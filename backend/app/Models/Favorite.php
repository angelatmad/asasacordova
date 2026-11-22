<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A user's saved destination; the slug points to the public destination record. */
class Favorite extends Model
{
    // The table name is stated explicitly to match the migration.
    protected $table = 'favorites';

    // A favorite only needs to know who saved it and which slug was saved.
    protected $fillable = [
        'user_id',
        'destination_slug',
    ];

    protected $casts = [
        'user_id' => 'integer',
    ];

    /** The user who saved this favorite. */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** Joins to Destination by slug because public URLs use slugs. */
    public function destination()
    {
        return $this->belongsTo(Destination::class, 'destination_slug', 'slug');
    }
}
