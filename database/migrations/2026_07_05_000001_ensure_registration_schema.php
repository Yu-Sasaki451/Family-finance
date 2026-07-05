<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('families')) {
            Schema::create('families', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->timestamps();
            });
        }

        $needsEmail = ! Schema::hasColumn('users', 'email');
        $needsPassword = ! Schema::hasColumn('users', 'password');
        $needsRememberToken = ! Schema::hasColumn('users', 'remember_token');

        if ($needsEmail || $needsPassword || $needsRememberToken) {
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

        if (! Schema::hasTable('family_user')) {
            Schema::create('family_user', function (Blueprint $table) {
                $table->id();
                $table->foreignId('family_id');
                $table->foreignId('user_id');
                $table->string('role')->default('member');
                $table->timestamps();

                $table->unique(['family_id', 'user_id']);
            });

            return;
        }

        $needsRole = ! Schema::hasColumn('family_user', 'role');
        $needsCreatedAt = ! Schema::hasColumn('family_user', 'created_at');
        $needsUpdatedAt = ! Schema::hasColumn('family_user', 'updated_at');

        if ($needsRole || $needsCreatedAt || $needsUpdatedAt) {
            Schema::table('family_user', function (Blueprint $table) use ($needsRole, $needsCreatedAt, $needsUpdatedAt) {
                if ($needsRole) {
                    $table->string('role')->default('member');
                }

                if ($needsCreatedAt) {
                    $table->timestamp('created_at')->nullable();
                }

                if ($needsUpdatedAt) {
                    $table->timestamp('updated_at')->nullable();
                }
            });
        }
    }
};
