<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Adds official website and social links so visitors can verify destination details. */
return new class extends Migration
{
    /** Adds the two link columns to the destinations table. */
    public function up(): void
    {
        // Skip the change when there is no destinations table to alter.
        if (! Schema::hasTable('destinations')) {
            return;
        }

        Schema::table('destinations', function (Blueprint $table): void {
            // Guards make rerunning this migration harmless.
            if (! Schema::hasColumn('destinations', 'website_url')) {
                // after() keeps contact details grouped together in the table.
                $table->string('website_url')->nullable()->after('contact_number');
            }

            if (! Schema::hasColumn('destinations', 'social_url')) {
                $table->string('social_url')->nullable()->after('website_url');
            }
        });
    }

    /** Removes the link columns if this migration is rolled back. */
    public function down(): void
    {
        if (! Schema::hasTable('destinations')) {
            return;
        }

        Schema::table('destinations', function (Blueprint $table): void {
            // Drop social_url first because it was placed after website_url.
            if (Schema::hasColumn('destinations', 'social_url')) {
                $table->dropColumn('social_url');
            }

            if (Schema::hasColumn('destinations', 'website_url')) {
                $table->dropColumn('website_url');
            }
        });
    }
};
