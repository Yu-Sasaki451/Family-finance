<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('categories')->insert([
            ['name' => '食費'],
            ['name' => '電気代'],
            ['name' => '水道代'],
            ['name' => '日用品'],
            ['name' => '交通費'],
            ['name' => '通信費'],
            ['name' => '家ローン'],
            ['name' => 'その他'],
        ]);
    }
}
