<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (['夫', '妻'] as $name) {
            if (! DB::table('users')->where('name', $name)->exists()) {
                DB::table('users')->insert(['name' => $name]);
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
}
