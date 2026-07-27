<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Expense;
use App\Models\Family;
use App\Models\Ratio;
use Illuminate\Validation\ValidationException;
use Throwable;

class ExpenseService
{
    public function getOptions(Family $family): array
    {
        return [
            'users' => $family->users()->orderBy('users.id')->get(['users.id', 'users.name']),
            // 収入はカテゴリ共通で使えるため、電気代かどうかの判定フラグは返さない。
            'categories' => Category::orderBy('id')->get(['id', 'name']),
        ];
    }

    public function create(Family $family, array $data): Expense
    {
        $this->ensureFamilyUsers($family, $this->targetUserIds($data));
        $this->ensureCategoryRatios($family, (int) $data['category_id']);

        // 支出本体を先に作り、その後で個人分を子データとして登録する。
        $expense = Expense::create([
            'family_id' => $family->id,
            'user_id' => $data['user_id'],
            'category_id' => $data['category_id'],
            'amount' => $data['amount'],
            'income' => $data['income'] ?? null,
            'spent_at' => $data['spent_at'],
            'note' => $data['note'] ?? null,
        ]);

        try {
            $expense->personal_expenses()->createMany($this->personalExpenses($data));
        } catch (Throwable $exception) {
            // 個人分の登録だけ失敗した場合に、支出本体だけが残らないよう手動で戻す。
            $expense->personal_expenses()->delete();
            $expense->delete();

            throw $exception;
        }

        return $expense->refresh();
    }

    public function update(Family $family, Expense $expense, array $data): Expense
    {
        $this->ensureFamilyExpense($family->id, $expense);
        $this->ensureFamilyUsers($family, $this->targetUserIds($data));
        $this->ensureCategoryRatios($family, (int) $data['category_id']);

        // 編集時は支出本体を更新し、個人分は一度消して現在の入力内容で作り直す。
        $expense->update([
            'user_id' => $data['user_id'],
            'category_id' => $data['category_id'],
            'amount' => $data['amount'],
            'income' => $data['income'] ?? null,
            'spent_at' => $data['spent_at'],
            'note' => $data['note'] ?? null,
        ]);

        $expense->personal_expenses()->delete();
        $expense->personal_expenses()->createMany($this->personalExpenses($data));

        return $expense->refresh();
    }

    public function delete(Family $family, Expense $expense): void
    {
        $this->ensureFamilyExpense($family->id, $expense);

        $expense->personal_expenses()->delete();
        $expense->delete();
    }

    private function targetUserIds(array $data): array
    {
        // 支払った人と個人分の対象者をまとめ、全員が同じグループか確認するために使う。
        return collect($data['personal_expenses'] ?? [])
            ->pluck('user_id')
            ->push($data['user_id'])
            ->all();
    }

    private function personalExpenses(array $data): array
    {
        // 金額0または空欄の個人分は、登録する意味がないため保存しない。
        return collect($data['personal_expenses'] ?? [])
            ->filter(fn ($item) => ($item['amount'] ?? 0) > 0)
            ->map(fn ($item) => [
                'user_id' => $item['user_id'],
                'amount' => $item['amount'],
                'note' => $item['note'] ?? null,
            ])
            ->all();
    }

    private function ensureFamilyExpense(int $familyId, Expense $expense): void
    {
        // URLを直接書き換えて、別グループの支出を編集・削除できないようにする。
        if ((int) $expense->family_id !== $familyId) {
            abort(404);
        }
    }

    private function ensureFamilyUsers(Family $family, array $userIds): void
    {
        $familyUserIds = $family->users()->pluck('users.id')->all();

        // グループ外のユーザーIDが混ざっていたら、登録や編集を止める。
        if (collect($userIds)->filter()->diff($familyUserIds)->isNotEmpty()) {
            throw ValidationException::withMessages([
                'user_id' => 'グループのメンバーを選択してください。',
            ]);
        }
    }

    private function ensureCategoryRatios(Family $family, int $categoryId): void
    {
        $category = Category::find($categoryId);

        if (! $category) {
            return;
        }

        $users = $family->users()->orderBy('users.id')->get(['users.id']);

        $userCount = $users->count();

        foreach ($users as $index => $user) {
            // 精算に必要な割合がないカテゴリは、支出登録時点で自動作成しておく。
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
            // 1人グループでは、その人が100%負担する。
            return 1.0;
        }

        if ($userCount === 2 && $categoryName === '家ローン') {
            // 家ローンだけは初期値を45%/55%にする運用。
            return $userIndex === 0 ? 0.45 : 0.55;
        }

        $baseRatio = floor(100 / $userCount) / 100;

        // 端数は最後の人に寄せて、合計が必ず100%になるようにする。
        return $userIndex === $userCount - 1
            ? 1 - ($baseRatio * ($userCount - 1))
            : $baseRatio;
    }
}
