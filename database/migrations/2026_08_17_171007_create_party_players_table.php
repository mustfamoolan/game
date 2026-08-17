<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('party_players', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('party_id');
            $table->unsignedBigInteger('player_id');
            $table->integer('score')->default(0);
            $table->timestamps();

            $table->foreign('party_id')->references('id')->on('parties')->onDelete('cascade');
            $table->foreign('player_id')->references('id')->on('players')->onDelete('cascade');
            $table->unique(['party_id', 'player_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('party_players');
    }
};
