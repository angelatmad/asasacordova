<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Lets events store imported culture records that may have no exact calendar date. */
return new class extends Migration
{
    /** Adds the new culture fields to an existing events table. */
    public function up(): void
    {
        // Nothing to change if the events table does not exist yet.
        if (! Schema::hasTable('events')) {
            return;
        }

        Schema::table('events', function (Blueprint $table): void {
            // Culture schedules can be text like "Every Saturday", so date is optional.
            $table->date('date')->nullable()->change();

            // hasColumn checks keep this safe if some fields were already added.
            if (! Schema::hasColumn('events', 'source_key')) {
                // source_key prevents importing the same culture row twice.
                $table->string('source_key')->nullable()->unique();
            }

            if (! Schema::hasColumn('events', 'date_label')) {
                $table->string('date_label')->nullable();
            }

            if (! Schema::hasColumn('events', 'details')) {
                // details stores the bullet points from the source snapshot.
                $table->json('details')->nullable();
            }
        });
    }

    /** Reverses the culture-field changes if this migration is rolled back. */
    public function down(): void
    {
        if (! Schema::hasTable('events')) {
            return;
        }

        Schema::table('events', function (Blueprint $table): void {
            // Drop each field only when present so rollback works on partial databases.
            if (Schema::hasColumn('events', 'details')) {
                $table->dropColumn('details');
            }

            if (Schema::hasColumn('events', 'date_label')) {
                $table->dropColumn('date_label');
            }

            if (Schema::hasColumn('events', 'source_key')) {
                $table->dropColumn('source_key');
            }

            // Restore the original rule that every event must have a date.
            $table->date('date')->nullable(false)->change();
        });
    }
};
