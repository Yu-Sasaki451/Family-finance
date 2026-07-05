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

        $connection = DB::getDefaultConnection();
        $driver = DB::connection($connection)->getDriverName();

        $wipeOptions = [
            '--database' => $connection,
            '--drop-views' => true,
            '--force' => true,
        ];

        if ($driver === 'pgsql') {
            $wipeOptions['--drop-types'] = true;
        }

        $this->info('Wiping database...');
        $wipeResult = $this->call('db:wipe', $wipeOptions);

        if ($wipeResult !== self::SUCCESS) {
            return $wipeResult;
        }

        DB::purge($connection);
        DB::reconnect($connection);

        $this->info('Running migrations...');
        $migrateResult = $this->call('migrate', [
            '--database' => $connection,
            '--force' => true,
        ]);

        if ($migrateResult !== self::SUCCESS) {
            return $migrateResult;
        }

        $this->info('Seeding default data...');

        return $this->call('db:seed', [
            '--database' => $connection,
            '--force' => true,
        ]);
    }
}
