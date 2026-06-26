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
        $categories = Category::with('ratios')->orderBy('id')->get()
            ->map(function (Category $category) use ($users, $family) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'ratios' => $users->map(function (User $user) use ($category, $family) {
                        $ratio = $category->ratios
                            ->where('family_id', $family->id)
                            ->firstWhere('user_id', $user->id);

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
