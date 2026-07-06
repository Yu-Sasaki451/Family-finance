<?php

namespace App\Http\Controllers;

use App\Http\Requests\CategoryRequest;
use App\Models\Category;
use App\Models\Ratio;

class CategoryController extends Controller
{
    public function index()
    {
        return Category::orderBy('id')->get();
    }

    public function store(CategoryRequest $request)
    {
        $category = Category::create($request->validated());
        $family = $request->user()->currentFamily();

        if ($family) {
            $this->createDefaultRatios($family, $category);
        }

        return $category;
    }

    public function update(CategoryRequest $request, Category $category)
    {
        $category->update($request->validated());

        return $category;
    }

    public function destroy(Category $category)
    {
        $category->delete();

        return response()->noContent();
    }

    private function createDefaultRatios($family, Category $category): void
    {
        $users = $family->users()->orderBy('users.id')->get(['users.id']);

        foreach ($users as $index => $user) {
            Ratio::firstOrCreate(
                [
                    'family_id' => $family->id,
                    'user_id' => $user->id,
                    'category_id' => $category->id,
                ],
                [
                    'ratio' => $this->defaultRatio($category->name, $index),
                ],
            );
        }
    }

    private function defaultRatio(string $categoryName, int $userIndex): float
    {
        if ($categoryName === '家ローン') {
            return $userIndex === 0 ? 0.45 : 0.55;
        }

        return 0.5;
    }
}
