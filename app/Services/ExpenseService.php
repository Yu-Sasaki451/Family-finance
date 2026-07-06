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
            'categories' => Category::orderBy('id')->get(['id', 'name'])
                ->map(fn ($category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'is_electricity' => $category->name === '電気代',
                ]),
        ];
    }

    public function create(Family $family, array $data): Expense
    {
        $this->ensureFamilyUsers($family, $this->targetUserIds($data));
        $this->ensureCategoryRatios($family, (int) $data['category_id']);

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
        return collect($data['personal_expenses'] ?? [])
            ->pluck('user_id')
            ->push($data['user_id'])
            ->all();
    }

    private function personalExpenses(array $data): array
    {
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
        if ((int) $expense->family_id !== $familyId) {
            abort(404);
        }
    }

    private function ensureFamilyUsers(Family $family, array $userIds): void
    {
        $familyUserIds = $family->users()->pluck('users.id')->all();

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
