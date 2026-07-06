<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'email')) {
            return;
        }

        $userIds = DB::table('users')
            ->whereNull('email')
            ->whereIn('name', ['夫', '妻'])
            ->pluck('id')
            ->all();

        if ($userIds === []) {
            return;
        }

        foreach (['family_user', 'ratios', 'expenses', 'personal_expenses'] as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'user_id')) {
                try {
                    DB::table($table)->whereIn('user_id', $userIds)->delete();
                } catch (\Throwable $exception) {
                    Log::warning("Could not remove placeholder users from {$table}.", [
                        'error' => $exception->getMessage(),
                    ]);
                }
            }
        }

        if (Schema::hasTable('cash_flow_forecasts') && Schema::hasColumn('cash_flow_forecasts', 'owner_id')) {
            try {
                DB::table('cash_flow_forecasts')->whereIn('owner_id', $userIds)->delete();
            } catch (\Throwable $exception) {
                Log::warning('Could not remove placeholder user forecasts.', [
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        try {
            DB::table('users')->whereIn('id', $userIds)->delete();
        } catch (\Throwable $exception) {
            Log::warning('Could not remove placeholder users.', [
                'error' => $exception->getMessage(),
            ]);
        }
    }

    public function down(): void
    {
        //
    }
};
