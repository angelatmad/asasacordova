<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Creates the per-user log of how often each destination was visited. */
return new class extends Migration
{
    /** Adds the visited_destinations table when migrations run. */
    public function up(): void
    {
        // Keep reruns safe by checking whether the table is already present.
        if (Schema::hasTable('visited_destinations')) {
            return;
        }

        Schema::create('visited_destinations', function (Blueprint $table) {
            $table->id();
            // A deleted user's visit history is removed with them.
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('destination_slug');
            // Start at one visit; repeat opens increase this same counter.
            $table->unsignedInteger('visit_count')->default(1);
            $table->timestamp('last_visited_at')->nullable();
            $table->timestamps();

            // One row per user/destination pair avoids duplicate counters.
            $table->unique(['user_id', 'destination_slug']);
        });
    }

    /** Removes the table if this migration is rolled back. */
    public function down(): void
    {
        Schema::dropIfExists('visited_destinations');
    }
};
