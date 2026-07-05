<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetProductionDatabase extends Command
{
    protected $signature = 'production:reset-database {--force : Run without confirmation}';

    protected $description = 'Drop all production database objects, then run migrations and seeders.';

    public function handle(): int
    {
        if (! $this->option('force') && ! $this->confirm('This will delete all database data. Continue?')) {
            $this->warn('Cancelled.');

            return self::FAILURE;
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $this->info('Recreating PostgreSQL public schema...');
            DB::statement('DROP SCHEMA IF EXISTS public CASCADE');
            DB::statement('CREATE SCHEMA public');
            DB::statement('GRANT ALL ON SCHEMA public TO CURRENT_USER');
        } else {
            $this->info('Wiping database...');
            $this->call('db:wipe', ['--force' => true]);
        }

        $this->info('Running migrations...');
        $migrateResult = $this->call('migrate', ['--force' => true]);

        if ($migrateResult !== self::SUCCESS) {
            return $migrateResult;
        }

        $this->info('Seeding default data...');

        return $this->call('db:seed', ['--force' => true]);
    }
}
