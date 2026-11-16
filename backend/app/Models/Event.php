<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'date',
        'time',
        'location',
        'image',
        'category',
        'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'date' => 'date:Y-m-d',
    ];
}
