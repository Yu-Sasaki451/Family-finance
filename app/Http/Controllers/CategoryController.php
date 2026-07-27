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
            // 新しいカテゴリを作ったら、割合設定画面で未設定にならないよう初期割合も作る。
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

        $userCount = $users->count();

        foreach ($users as $index => $user) {
            // 既に割合がある場合は上書きせず、足りない分だけ初期値を追加する。
            Ratio::firstOrCreate(
                [
                    'family_id' => $family->id,
                    'user_id' => $user->id,
                    'category_id' => $category->id,
                ],
                [
                    'ratio' => $this->defaultRatio($category->name, $index, $userCount),
                ],
            );
        }
    }

    private function defaultRatio(string $categoryName, int $userIndex, int $userCount): float
    {
        if ($userCount === 1) {
            // 1人だけのグループでは、その人が全額負担する。
            return 1.0;
        }

        if ($userCount === 2 && $categoryName === '家ローン') {
            // 家ローンの初期値だけ、夫45%・妻55%の想定にしている。
            return $userIndex === 0 ? 0.45 : 0.55;
        }

        $baseRatio = floor(100 / $userCount) / 100;

        // 人数で割り切れない端数は最後の人に寄せ、合計が100%になるようにする。
        return $userIndex === $userCount - 1
            ? 1 - ($baseRatio * ($userCount - 1))
            : $baseRatio;
    }
}
