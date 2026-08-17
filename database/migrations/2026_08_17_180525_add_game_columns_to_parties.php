<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parties', function (Blueprint $table) {
            $table->unsignedSmallInteger('current_question_index')->default(0)->after('status');
            $table->timestamp('question_started_at')->nullable()->after('current_question_index');
        });
    }

    public function down(): void
    {
        Schema::table('parties', function (Blueprint $table) {
            $table->dropColumn(['current_question_index', 'question_started_at']);
        });
    }
};
