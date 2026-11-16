<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('destination_reviews', function (Blueprint $table) {
            $table->id();
            $table->string('destination_slug');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('rating')->default(5);
            $table->text('comment');
            $table->timestamps();
        });

        Schema::create('destination_review_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('destination_review_id')->constrained('destination_reviews')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('reply');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('destination_review_replies');
        Schema::dropIfExists('destination_reviews');
    }
};
