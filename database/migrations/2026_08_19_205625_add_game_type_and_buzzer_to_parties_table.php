<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('parties', function (Blueprint $table) {
            $table->string('game_type')->default('traditional')->after('status');
            $table->unsignedBigInteger('buzzed_player_id')->nullable()->after('game_type');

            $table->foreign('buzzed_player_id')->references('id')->on('players')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('parties', function (Blueprint $table) {
            $table->dropForeign(['buzzed_player_id']);
            $table->dropColumn(['game_type', 'buzzed_player_id']);
        });
    }
};
