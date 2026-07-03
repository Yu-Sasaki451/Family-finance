<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Expense;
use App\Models\Family;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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

        return DB::transaction(function () use ($data, $family) {
            $expense = Expense::create([
                'family_id' => $family->id,
                'user_id' => $data['user_id'],
                'category_id' => $data['category_id'],
                'amount' => $data['amount'],
                'income' => $data['income'] ?? null,
                'spent_at' => $data['spent_at'],
                'note' => $data['note'] ?? null,
            ]);

            $expense->personal_expenses()->createMany($this->personalExpenses($data));

            return $expense;
        });
    }

    public function update(Family $family, Expense $expense, array $data): Expense
    {
        $this->ensureFamilyExpense($family->id, $expense);
        $this->ensureFamilyUsers($family, $this->targetUserIds($data));

        DB::transaction(function () use ($data, $expense) {
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
        });

        return $expense;
    }

    public function delete(Family $family, Expense $expense): void
    {
        $this->ensureFamilyExpense($family->id, $expense);

        DB::transaction(function () use ($expense) {
            $expense->personal_expenses()->delete();
            $expense->delete();
        });
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
}
