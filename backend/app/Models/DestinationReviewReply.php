<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DestinationReviewReply extends Model
{
    protected $fillable = [
        'destination_review_id',
        'user_id',
        'reply',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function review()
    {
        return $this->belongsTo(DestinationReview::class, 'destination_review_id');
    }
}
