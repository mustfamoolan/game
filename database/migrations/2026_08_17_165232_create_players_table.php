<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->string('nickname');
            $table->string('avatar_type')->default('emoji'); // 'emoji' or 'upload'
            $table->longText('avatar_value'); // stores emoji or compressed base64 image data
            $table->string('session_token', 80)->unique();
            $table->timestamps();
        });

        // Set starting auto-increment ID to 10000
        DB::statement("ALTER TABLE players AUTO_INCREMENT = 10000;");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};
