<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** A message sent by a visitor; admin answers are stored as FeedbackReply rows. */
class Feedback extends Model
{
    use HasFactory;

    // Laravel would guess "feedbacks", so the real table name is set here.
    protected $table = 'feedback';

    // Only these columns may be filled when a feedback item is created.
    protected $fillable = [
        'user_id',
        'subject',
        'message',
        'status',
    ];

    /** The visitor who wrote the feedback. */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** One feedback message can receive many admin replies. */
    public function replies()
    {
        return $this->hasMany(FeedbackReply::class);
    }
}
