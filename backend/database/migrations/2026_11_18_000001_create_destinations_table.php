<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Creates the main table that stores every visitor-facing destination. */
return new class extends Migration
{
    /** Adds the destinations table when migrations run. */
    public function up(): void
    {
        // Skip if another migration already made it, so reruns stay safe.
        if (Schema::hasTable('destinations')) {
            return;
        }

        Schema::create('destinations', function (Blueprint $table) {
            $table->id();
            // slug is the URL-friendly unique key used by favorites, reviews and visits.
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('category');
            $table->string('image')->nullable();
            $table->text('description');
            $table->text('overview')->nullable();
            // JSON columns hold lists that Eloquent turns back into PHP arrays.
            $table->json('highlights')->nullable();
            $table->string('address')->nullable();
            $table->string('opening_hours')->nullable();
            $table->string('closing_hours')->nullable();
            $table->string('operating_days')->nullable();
            $table->string('entrance_fee')->nullable();
            $table->string('contact_number')->nullable();
            $table->json('facilities')->nullable();
            // Decimal coordinates keep map positions precise.
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->text('location_note')->nullable();
            $table->json('route_steps')->nullable();
            $table->timestamps();
        });
    }

    /** Removes the table if this migration is rolled back. */
    public function down(): void
    {
        Schema::dropIfExists('destinations');
    }
};
