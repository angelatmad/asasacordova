<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** An admin answer attached to one feedback message. */
class FeedbackReply extends Model
{
    use HasFactory;

    // Only these columns can be set when a reply is saved.
    protected $fillable = [
        'feedback_id',
        'user_id',
        'reply',
    ];

    /** Links the reply back to the feedback it answers. */
    public function feedback()
    {
        return $this->belongsTo(Feedback::class);
    }

    /** Links the reply to the user who wrote it. */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
