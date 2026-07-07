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
        $categories = DB::table('categories')->orderBy('id')->get(['id', 'name']);

        DB::table('families')
            ->orderBy('id')
            ->each(function ($family) use ($categories) {
                $users = DB::table('family_user')
                    ->where('family_id', $family->id)
                    ->orderBy('user_id')
                    ->pluck('user_id');

                $userCount = $users->count();

                foreach ($categories as $category) {
                    foreach ($users as $index => $userId) {
                        DB::table('ratios')->updateOrInsert(
                            [
                                'family_id' => $family->id,
                                'user_id' => $userId,
                                'category_id' => $category->id,
                            ],
                            [
                                'ratio' => $this->defaultRatio($category->name, $index, $userCount),
                                'updated_at' => now(),
                            ],
                        );
                    }
                }
            });
    }

    private function defaultRatio(string $categoryName, int $userIndex, int $userCount): float
    {
        if ($userCount === 1) {
            return 1.0;
        }

        if ($userCount === 2 && $categoryName === '家ローン') {
            return $userIndex === 0 ? 0.45 : 0.55;
        }

        $baseRatio = floor(100 / $userCount) / 100;

        return $userIndex === $userCount - 1
            ? 1 - ($baseRatio * ($userCount - 1))
            : $baseRatio;
    }
}
