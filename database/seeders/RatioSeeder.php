<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RatioSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $familyId = DB::table('families')->orderBy('id')->value('id');

        DB::table('ratios')->insert([
            ['family_id' => $familyId, 'user_id' => 1, 'category_id' => 1, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 1, 'category_id' => 2, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 1, 'category_id' => 3, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 1, 'category_id' => 4, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 1, 'category_id' => 5, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 1, 'category_id' => 6, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 1, 'category_id' => 7, 'ratio' => 0.45],
            ['family_id' => $familyId, 'user_id' => 1, 'category_id' => 8, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 2, 'category_id' => 1, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 2, 'category_id' => 2, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 2, 'category_id' => 3, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 2, 'category_id' => 4, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 2, 'category_id' => 5, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 2, 'category_id' => 6, 'ratio' => 0.5],
            ['family_id' => $familyId, 'user_id' => 2, 'category_id' => 7, 'ratio' => 0.55],
            ['family_id' => $familyId, 'user_id' => 2, 'category_id' => 8, 'ratio' => 0.5],
        ]);
    }
}
