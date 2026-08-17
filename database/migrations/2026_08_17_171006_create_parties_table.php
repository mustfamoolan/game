<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parties', function (Blueprint $table) {
            $table->id();
            $table->string('code', 6)->unique();
            $table->string('name')->nullable();
            $table->unsignedBigInteger('leader_id');
            $table->boolean('is_public')->default(true);
            $table->enum('status', ['waiting', 'playing', 'finished'])->default('waiting');
            $table->timestamps();

            $table->foreign('leader_id')->references('id')->on('players')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parties');
    }
};
