<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A place in the Cordova directory, identified by slug for friendly URLs. */
class Destination extends Model
{
    // Only these columns can be mass-assigned when an admin saves a destination.
    protected $fillable = [
        'slug',
        'name',
        'category',
        'image',
        'description',
        'overview',
        'highlights',
        'address',
        'municipality',
        'barangays',
        'location_aliases',
        'opening_hours',
        'closing_hours',
        'operating_days',
        'entrance_fee',
        'contact_number',
        'website_url',
        'social_url',
        'facilities',
        'latitude',
        'longitude',
        'location_note',
        'route_steps',
    ];

    // JSON columns store lists and are cast back to PHP arrays; coordinates become floats.
    protected $casts = [
        'highlights' => 'array',
        'facilities' => 'array',
        'barangays' => 'array',
        'location_aliases' => 'array',
        'route_steps' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
        // These two values are added by withCount()/withAvg() in the public API.
        'reviews_count' => 'integer',
        'average_rating' => 'float',
    ];

    // Reviews, favorites and visits link by slug, not by the numeric id.
    /** All reviews written about this destination. */
    public function reviews()
    {
        return $this->hasMany(DestinationReview::class, 'destination_slug', 'slug');
    }

    /** Users who saved this destination to their favorites. */
    public function favorites()
    {
        return $this->hasMany(Favorite::class, 'destination_slug', 'slug');
    }

    /** Visit logs that record how often users opened this destination. */
    public function visitedDestinations()
    {
        return $this->hasMany(VisitedDestination::class, 'destination_slug', 'slug');
    }
}
