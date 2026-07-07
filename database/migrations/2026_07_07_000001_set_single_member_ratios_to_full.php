<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        foreach (['families', 'family_user', 'categories', 'ratios'] as $table) {
            if (! Schema::hasTable($table)) {
                return;
            }
        }

        $categories = DB::table('categories')->orderBy('id')->get(['id']);

        DB::table('families')
            ->orderBy('id')
            ->each(function ($family) use ($categories) {
                $userIds = DB::table('family_user')
                    ->where('family_id', $family->id)
                    ->orderBy('user_id')
                    ->pluck('user_id');

                if ($userIds->count() !== 1) {
                    return;
                }

                $userId = $userIds->first();

                foreach ($categories as $category) {
                    DB::table('ratios')->updateOrInsert(
                        [
                            'family_id' => $family->id,
                            'user_id' => $userId,
                            'category_id' => $category->id,
                        ],
                        [
                            'ratio' => 1.0,
                            'updated_at' => now(),
                        ],
                    );
                }
            });
    }

    public function down(): void
    {
        //
    }
};
