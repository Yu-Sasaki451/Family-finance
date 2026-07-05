<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;
    public function up(): void
    {
        $needsEmail = ! Schema::hasColumn('users', 'email');
        $needsPassword = ! Schema::hasColumn('users', 'password');
        $needsRememberToken = ! Schema::hasColumn('users', 'remember_token');

        if (! $needsEmail && ! $needsPassword && ! $needsRememberToken) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($needsEmail, $needsPassword, $needsRememberToken) {
            if ($needsEmail) {
                $table->string('email')->nullable()->unique();
            }

            if ($needsPassword) {
                $table->string('password')->nullable();
            }

            if ($needsRememberToken) {
                $table->rememberToken();
            }
        });
    }

    public function down(): void
    {
        $columns = array_values(array_filter(
            ['email', 'password', 'remember_token'],
            fn (string $column) => Schema::hasColumn('users', $column),
        ));

        if ($columns === []) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($columns) {
            $table->dropColumn($columns);
        });
    }
};
