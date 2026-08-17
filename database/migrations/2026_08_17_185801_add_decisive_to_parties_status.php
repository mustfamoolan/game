<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Extend the status ENUM to include 'decisive'
        DB::statement("ALTER TABLE `parties` MODIFY `status` ENUM('waiting','playing','decisive','finished') NOT NULL DEFAULT 'waiting'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `parties` MODIFY `status` ENUM('waiting','playing','finished') NOT NULL DEFAULT 'waiting'");
    }
};
