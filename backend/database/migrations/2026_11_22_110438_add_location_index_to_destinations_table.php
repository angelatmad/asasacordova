<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Adds location fields used for barangay filtering and near searches in the AI assistant. */
return new class extends Migration
{
    /** Adds municipality, barangays and alias columns to destinations. */
    public function up(): void
    {
        // Do nothing if the destinations table is not present.
        if (! Schema::hasTable('destinations')) {
            return;
        }

        Schema::table('destinations', function (Blueprint $table): void {
            // Guards keep this migration safe if the columns already exist.
            if (! Schema::hasColumn('destinations', 'municipality')) {
                $table->string('municipality')->nullable()->after('address');
            }

            // One place may span several barangays, so this is a JSON list.
            if (! Schema::hasColumn('destinations', 'barangays')) {
                $table->json('barangays')->nullable()->after('municipality');
            }

            // Aliases are other names people might use when asking the assistant.
            if (! Schema::hasColumn('destinations', 'location_aliases')) {
                $table->json('location_aliases')->nullable()->after('barangays');
            }
        });
    }

    /** Removes the location fields if this migration is rolled back. */
    public function down(): void
    {
        if (! Schema::hasTable('destinations')) {
            return;
        }

        Schema::table('destinations', function (Blueprint $table): void {
            // Drop in reverse order because each column was placed after the previous one.
            if (Schema::hasColumn('destinations', 'location_aliases')) {
                $table->dropColumn('location_aliases');
            }

            if (Schema::hasColumn('destinations', 'barangays')) {
                $table->dropColumn('barangays');
            }

            if (Schema::hasColumn('destinations', 'municipality')) {
                $table->dropColumn('municipality');
            }
        });
    }
};
