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

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'email')) {
                $table->string('email')->nullable()->unique();
            }

            if (! Schema::hasColumn('users', 'password')) {
                $table->string('password')->nullable();
            }

            if (! Schema::hasColumn('users', 'remember_token')) {
                $table->rememberToken();
            }
        });

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

        Schema::table('family_user', function (Blueprint $table) {
            if (! Schema::hasColumn('family_user', 'role')) {
                $table->string('role')->default('member');
            }

            if (! Schema::hasColumn('family_user', 'created_at')) {
                $table->timestamps();
            }
        });
    }
};
