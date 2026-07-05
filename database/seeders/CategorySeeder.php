<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    public const DEFAULT_CATEGORIES = [
        '食費',
        '電気代',
        '水道代',
        '日用品',
        '交通費',
        '通信費',
        '家ローン',
        'その他',
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (self::DEFAULT_CATEGORIES as $name) {
            DB::table('categories')->updateOrInsert(
                ['name' => $name],
                ['name' => $name],
            );
        }
    }
}
