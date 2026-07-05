<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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

        if (! Schema::hasTable('family_user')) {
            Schema::create('family_user', function (Blueprint $table) {
                $table->id();
                $table->foreignId('family_id');
                $table->foreignId('user_id');
                $table->string('role')->default('member');
                $table->timestamps();

                $table->unique(['family_id', 'user_id']);
            });
        } else {
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

        $now = now();
        $familyId = DB::table('families')->orderBy('id')->value('id')
            ?? DB::table('families')->insertGetId([
                'name' => 'グループ',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

        DB::table('users')
            ->orderBy('id')
            ->each(function ($user) use ($familyId, $now) {
                DB::table('family_user')->insertOrIgnore([
                    'family_id' => $familyId,
                    'user_id' => $user->id,
                    'role' => 'member',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_user');
        Schema::dropIfExists('families');
    }
};
