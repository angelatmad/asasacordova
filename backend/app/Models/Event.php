<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** An event posted by an admin or imported from the culture snapshot. */
class Event extends Model
{
    use HasFactory;

    // Only these fields can be filled from a request, protecting other columns.
    protected $fillable = [
        'title',
        'description',
        'date',
        'time',
        'location',
        'image',
        'category',
        'is_published',
        // source_key links an imported record back to its original snapshot row.
        'source_key',
        // date_label and details allow schedules without an exact calendar date.
        'date_label',
        'details',
    ];

    // Casts turn stored values into useful PHP types: bool, Carbon date, and array.
    protected $casts = [
        'is_published' => 'boolean',
        'date' => 'date:Y-m-d',
        'details' => 'array',
    ];
}
