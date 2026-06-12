<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class Personal_expenseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('personal_expenses')->insert([
            [
                'expense_id' => 1,
                'user_id' => 1,
                'amount' => 700,
            ],

            [
                'expense_id' => 1,
                'user_id' => 2,
                'amount' => 300,
            ],
        ]);
    }
}
