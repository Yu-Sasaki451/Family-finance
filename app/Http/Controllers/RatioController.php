<?php

namespace App\Http\Controllers;

use App\Http\Requests\RatioRequest;
use App\Models\Category;
use App\Models\Ratio;
use App\Models\User;

class RatioController extends Controller
{
    public function index()
    {
        $family = request()->user()->currentFamily();
        $users = $family->users()->orderBy('users.id')->get(['users.id', 'users.name']);

        // 画面ではカテゴリごとに全メンバーの割合を横並びで出すため、ここで表示用の形に整える。
        $categories = Category::with('ratios')->orderBy('id')->get()
            ->map(function (Category $category) use ($users, $family) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'ratios' => $users->map(function (User $user) use ($category, $family) {
                        $ratio = $category->ratios
                            ->where('family_id', $family->id)
                            ->firstWhere('user_id', $user->id);

                        // DBは0.5のような小数で保存し、画面では50のような%表示に変換する。
                        return [
                            'user_id' => $user->id,
                            'ratio' => $ratio ? (float) $ratio->ratio * 100 : '',
                        ];
                    }),
                ];
            });

        return compact('users', 'categories');
    }

    public function update(RatioRequest $request, Category $category)
    {
        $family = $request->user()->currentFamily();

        foreach ($request->validated('ratios') as $ratio) {
            // 画面からは%で届くので、DBへ保存するときは0.5のような小数に戻す。
            Ratio::updateOrCreate(
                [
                    'family_id' => $family->id,
                    'user_id' => $ratio['user_id'],
                    'category_id' => $category->id,
                ],
                ['ratio' => $ratio['ratio'] / 100],
            );
        }

        return response()->noContent();
    }
}
