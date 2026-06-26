<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('families', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('family_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_id');
            $table->foreignId('user_id');
            $table->string('role')->default('member');
            $table->timestamps();

            $table->unique(['family_id', 'user_id']);
        });

        $now = now();
        $familyId = DB::table('families')->insertGetId([
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
