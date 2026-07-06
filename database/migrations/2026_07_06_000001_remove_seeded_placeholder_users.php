<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'email')) {
            return;
        }

        $userIds = DB::table('users')
            ->whereNull('email')
            ->whereIn('name', ['夫', '妻'])
            ->pluck('id');

        if ($userIds->isEmpty()) {
            return;
        }

        foreach (['family_user', 'ratios', 'expenses', 'personal_expenses'] as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->whereIn('user_id', $userIds)->delete();
            }
        }

        DB::table('users')->whereIn('id', $userIds)->delete();
    }

    public function down(): void
    {
        //
    }
};
