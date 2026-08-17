<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add difficulty to questions table
        Schema::table('questions', function (Blueprint $table) {
            $table->string('difficulty')->default('medium')->after('category_id');
        });

        // Add decisive phase columns to parties table
        Schema::table('parties', function (Blueprint $table) {
            $table->string('decisive_phase')->nullable()->after('question_started_at');
            $table->string('decisive_difficulty')->nullable()->after('decisive_phase');
            $table->unsignedBigInteger('decisive_question_id')->nullable()->after('decisive_difficulty');

            $table->foreign('decisive_question_id')->references('id')->on('questions')->onDelete('set null');
        });

        // Add decisive phase inputs to player_answers table
        Schema::table('player_answers', function (Blueprint $table) {
            $table->unsignedSmallInteger('decisive_bet')->nullable()->after('bet_points'); // [0, 5, 10, 15, 20]
            $table->string('decisive_vote')->nullable()->after('decisive_bet'); // [easy, medium, hard]
            $table->boolean('is_decisive')->default(false)->after('decisive_vote');
        });
    }

    public function down(): void
    {
        Schema::table('player_answers', function (Blueprint $table) {
            $table->dropColumn(['decisive_bet', 'decisive_vote', 'is_decisive']);
        });

        Schema::table('parties', function (Blueprint $table) {
            $table->dropForeign(['decisive_question_id']);
            $table->dropColumn(['decisive_phase', 'decisive_difficulty', 'decisive_question_id']);
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn(['difficulty']);
        });
    }
};
