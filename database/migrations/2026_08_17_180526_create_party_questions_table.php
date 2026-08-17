<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('party_questions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('party_id');
            $table->unsignedBigInteger('question_id');
            $table->unsignedSmallInteger('order'); // 1–20
            $table->timestamps();

            $table->foreign('party_id')->references('id')->on('parties')->onDelete('cascade');
            $table->foreign('question_id')->references('id')->on('questions')->onDelete('cascade');
            $table->unique(['party_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('party_questions');
    }
};
