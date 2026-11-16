<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DestinationReview extends Model
{
    protected $fillable = [
        'destination_slug',
        'user_id',
        'rating',
        'comment',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function replies()
    {
        return $this->hasMany(DestinationReviewReply::class)->with('user')->latest();
    }
}
