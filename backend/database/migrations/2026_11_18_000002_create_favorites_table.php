<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Creates the table that stores each user's saved destinations. */
return new class extends Migration
{
    /** Adds the favorites table when migrations run. */
    public function up(): void
    {
        // The guard prevents an error if the table already exists.
        if (Schema::hasTable('favorites')) {
            return;
        }

        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            // Deleting a user also removes their favorites, avoiding orphan rows.
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('destination_slug');
            $table->timestamps();

            // One user can save the same destination only once.
            $table->unique(['user_id', 'destination_slug']);
        });
    }

    /** Removes the table if this migration is rolled back. */
    public function down(): void
    {
        Schema::dropIfExists('favorites');
    }
};
