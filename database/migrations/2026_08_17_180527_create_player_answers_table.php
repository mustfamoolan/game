<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_answers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('party_id');
            $table->unsignedBigInteger('player_id');
            $table->unsignedBigInteger('question_id');
            $table->text('answer_text')->nullable();
            $table->unsignedSmallInteger('bet_points')->nullable(); // 1–20
            $table->boolean('is_correct')->default(false);
            $table->timestamps();

            $table->foreign('party_id')->references('id')->on('parties')->onDelete('cascade');
            $table->foreign('player_id')->references('id')->on('players')->onDelete('cascade');
            $table->foreign('question_id')->references('id')->on('questions')->onDelete('cascade');
            $table->unique(['party_id', 'player_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_answers');
    }
};
