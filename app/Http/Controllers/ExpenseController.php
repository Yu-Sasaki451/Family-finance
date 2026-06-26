<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExpenseRequest;
use App\Http\Requests\MonthlyExpenseRequest;
use App\Models\Category;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ExpenseController extends Controller
{
    public function monthly(MonthlyExpenseRequest $request)
    {
        $users = User::orderBy('id')->get(['id', 'name']);
        $expenses = Expense::with([
            'user:id,name',
            'category.ratios',
            'personal_expenses.user:id,name',
        ])->orderByDesc('spent_at')->get();

        $months = $expenses->groupBy(fn ($expense) => substr($expense->spent_at, 0, 7))
            ->map(fn ($items, $month) => [
                'month' => $month,
                'expense_total' => $items->sum('amount'),
                'income_total' => $items->sum('income'),
                'total' => $items->sum(fn ($expense) => $expense->amount - ($expense->income ?? 0)),
                'count' => $items->count(),
            ])
            ->values();

        $selectedMonth = $request->validated('month');

        $selectedExpenses = $expenses
            ->filter(fn ($expense) => substr($expense->spent_at, 0, 7) === $selectedMonth);

        $categoryTotals = $selectedExpenses
            ->groupBy('category_id')
            ->map(function ($items) {
                $category = $items->first()->category;

                return [
                    'category_id' => $category->id,
                    'category' => $category->name,
                    'total' => $items->sum(fn ($expense) => $expense->amount - ($expense->income ?? 0)),
                ];
            })
            ->sortByDesc('total')
            ->values();

        $details = $selectedExpenses
            ->map(function (Expense $expense) {
                $personalTotal = $expense->personal_expenses->sum('amount');
                $netAmount = $expense->amount - ($expense->income ?? 0);

                return [
                    'id' => $expense->id,
                    'spent_at' => $expense->spent_at,
                    'user_id' => $expense->user_id,
                    'user' => $expense->user->name,
                    'category_id' => $expense->category_id,
                    'category' => $expense->category->name,
                    'amount' => $expense->amount,
                    'income' => $expense->income,
                    'net_amount' => $netAmount,
                    'shared_amount' => $netAmount - $personalTotal,
                    'note' => $expense->note,
                    'personal_expenses' => $expense->personal_expenses->map(fn ($item) => [
                        'user_id' => $item->user_id,
                        'user' => $item->user->name,
                        'amount' => $item->amount,
                        'note' => $item->note,
                    ])->values(),
                ];
            })
            ->values();

        return [
            'months' => $months,
            'selected_month' => $selectedMonth,
            'category_totals' => $categoryTotals,
            'details' => $details,
            'settlement' => $selectedMonth
                ? $this->calculateSettlement($selectedExpenses, $users)
                : null,
        ];
    }

    private function calculateSettlement($expenses, $users)
    {
        if ($users->count() !== 2) {
            return [
                'error' => '精算は2人の場合のみ計算できます。',
                'users' => [],
                'transfer' => null,
            ];
        }

        $paid = $users->mapWithKeys(fn ($user) => [$user->id => 0])->all();
        $burdens = $users->mapWithKeys(fn ($user) => [$user->id => 0])->all();

        foreach ($expenses as $expense) {
            $ratios = $expense->category->ratios->keyBy('user_id');

            if ($users->contains(fn ($user) => !$ratios->has($user->id))) {
                return [
                    'error' => "カテゴリ「{$expense->category->name}」の割合が未設定です。",
                    'users' => [],
                    'transfer' => null,
                ];
            }

            if (abs($ratios->sum('ratio') - 1) > 0.001) {
                return [
                    'error' => "カテゴリ「{$expense->category->name}」の割合の合計が100%ではありません。",
                    'users' => [],
                    'transfer' => null,
                ];
            }

            $netAmount = $expense->amount - ($expense->income ?? 0);
            $paid[$expense->user_id] += $netAmount;

            $personalAmounts = $expense->personal_expenses
                ->groupBy('user_id')
                ->map->sum('amount');
            $sharedAmount = $netAmount - $expense->personal_expenses->sum('amount');
            $remainingSharedAmount = $sharedAmount;

            foreach ($users as $index => $user) {
                $sharedBurden = $index === $users->count() - 1
                    ? $remainingSharedAmount
                    : (int) round($sharedAmount * $ratios[$user->id]->ratio);

                $remainingSharedAmount -= $sharedBurden;
                $burdens[$user->id] += $sharedBurden + ($personalAmounts[$user->id] ?? 0);
            }
        }

        $results = $users->map(fn ($user) => [
            'id' => $user->id,
            'name' => $user->name,
            'paid' => $paid[$user->id],
            'burden' => $burdens[$user->id],
            'difference' => $paid[$user->id] - $burdens[$user->id],
        ])->values();

        $receiver = $results->firstWhere('difference', '>', 0);
        $payer = $results->firstWhere('difference', '<', 0);

        return [
            'error' => null,
            'users' => $results,
            'transfer' => $receiver && $payer
                ? [
                    'from' => $payer['name'],
                    'to' => $receiver['name'],
                    'amount' => $receiver['difference'],
                ]
                : null,
        ];
    }

    public function options()
    {
        return [
            'users' => User::orderBy('id')->get(['id', 'name']),
            'categories' => Category::orderBy('id')->get(['id', 'name'])
                ->map(fn ($category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'is_electricity' => $category->name === '電気代',
                ]),
        ];
    }

    public function store(ExpenseRequest $request)
    {
        $data = $request->validated();

        $expense = DB::transaction(function () use ($data) {
            $expense = Expense::create([
                'user_id' => $data['user_id'],
                'category_id' => $data['category_id'],
                'amount' => $data['amount'],
                'income' => $data['income'] ?? null,
                'spent_at' => $data['spent_at'],
                'note' => $data['note'] ?? null,
            ]);

            $personalExpenses = collect($data['personal_expenses'] ?? [])
                ->filter(fn ($item) => ($item['amount'] ?? 0) > 0)
                ->map(fn ($item) => [
                    'user_id' => $item['user_id'],
                    'amount' => $item['amount'],
                    'note' => $item['note'] ?? null,
                ])
                ->all();

            $expense->personal_expenses()->createMany($personalExpenses);

            return $expense;
        });

        return $expense->load('personal_expenses');
    }

    public function update(ExpenseRequest $request, Expense $expense)
    {
        $data = $request->validated();

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
            $expense->personal_expenses()->createMany(
                collect($data['personal_expenses'] ?? [])
                    ->filter(fn ($item) => ($item['amount'] ?? 0) > 0)
                    ->map(fn ($item) => [
                        'user_id' => $item['user_id'],
                        'amount' => $item['amount'],
                        'note' => $item['note'] ?? null,
                    ])
                    ->all(),
            );
        });

        return $expense->load('personal_expenses');
    }

    public function destroy(Expense $expense)
    {
        DB::transaction(function () use ($expense) {
            $expense->personal_expenses()->delete();
            $expense->delete();
        });

        return response()->noContent();
    }
}
