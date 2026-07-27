<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Family;

class MonthlyExpenseService
{
    public function buildMonthlyReport(Family $family, ?string $selectedMonth): array
    {
        $users = $family->users()->orderBy('users.id')->get(['users.id', 'users.name']);

        // 集計と精算に必要な関連データを先にまとめて読み込み、画面表示中の追加SQLを防ぐ。
        $expenses = Expense::with([
            'user:id,name',
            'category.ratios',
            'personal_expenses.user:id,name',
        ])->where('family_id', $family->id)
            ->orderByDesc('spent_at')
            ->get();

        // 月カードに表示する金額は、収入と個人分を除いた共有対象額で集計する。
        $months = $expenses->groupBy(fn ($expense) => substr($expense->spent_at, 0, 7))
            ->map(fn ($items, $month) => [
                'month' => $month,
                'expense_total' => $items->sum('amount'),
                'income_total' => $items->sum('income'),
                'personal_total' => $items->sum(fn ($expense) => $this->personalTotal($expense)),
                'shared_total' => $items->sum(fn ($expense) => $this->sharedAmount($expense)),
                'total' => $items->sum(fn ($expense) => $this->sharedAmount($expense)),
                'count' => $items->count(),
            ])
            ->values();

        $selectedExpenses = $expenses
            ->filter(fn ($expense) => substr($expense->spent_at, 0, 7) === $selectedMonth);

        return [
            'months' => $months,
            'selected_month' => $selectedMonth,
            'category_totals' => $this->buildCategoryTotals($selectedExpenses),
            'details' => $this->buildDetails($selectedExpenses),
            'settlement' => $selectedMonth
                ? $this->calculateSettlement($selectedExpenses, $users)
                : null,
        ];
    }

    private function buildCategoryTotals($expenses)
    {
        return $expenses
            ->groupBy('category_id')
            ->map(function ($items) {
                $category = $items->first()->category;

                // カテゴリごとの合計も、月合計と同じく共有対象額を使う。
                return [
                    'category_id' => $category->id,
                    'category' => $category->name,
                    'personal_total' => $items->sum(fn ($expense) => $this->personalTotal($expense)),
                    // 個人分は誰がいくら個別負担したかを、カテゴリ詳細の補足として出す。
                    'personal_totals' => $items
                        ->flatMap->personal_expenses
                        ->groupBy('user_id')
                        ->map(fn ($personalExpenses) => [
                            'user_id' => $personalExpenses->first()->user_id,
                            'user' => $personalExpenses->first()->user->name,
                            'amount' => $personalExpenses->sum('amount'),
                        ])
                        ->filter(fn ($personalTotal) => $personalTotal['amount'] > 0)
                        ->values(),
                    'shared_total' => $items->sum(fn ($expense) => $this->sharedAmount($expense)),
                    'total' => $items->sum(fn ($expense) => $this->sharedAmount($expense)),
                ];
            })
            ->sortByDesc('total')
            ->values();
    }

    private function buildDetails($expenses)
    {
        return $expenses
            ->map(function (Expense $expense) {
                $netAmount = $this->netAmount($expense);

                // 明細では元の合計、収入、差引後、共有対象額を分けて返し、画面側で確認しやすくする。
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
                    'shared_amount' => $this->sharedAmount($expense),
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
    }

    private function calculateSettlement($expenses, $users): array
    {
        if ($users->count() === 0) {
            return [
                'error' => '精算対象のメンバーがいません。',
                'users' => [],
                'transfer' => null,
            ];
        }

        if ($users->count() > 2) {
            return [
                'error' => '精算は2人の場合のみ計算できます。',
                'users' => [],
                'transfer' => null,
            ];
        }

        $paid = $users->mapWithKeys(fn ($user) => [$user->id => 0])->all();
        $burdens = $users->mapWithKeys(fn ($user) => [$user->id => 0])->all();

        foreach ($expenses as $expense) {
            // その支出カテゴリに設定された、今のグループ用の負担割合だけを使う。
            $ratios = $expense->category->ratios
                ->where('family_id', $expense->family_id)
                ->keyBy('user_id');

            if ($users->contains(fn ($user) => ! $ratios->has($user->id))) {
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

            $netAmount = $this->netAmount($expense);
            // 実際に立て替えた人の支払額には、収入を差し引いた後の金額を加える。
            $paid[$expense->user_id] += $netAmount;

            $personalAmounts = $expense->personal_expenses
                ->groupBy('user_id')
                ->map->sum('amount');
            $sharedAmount = $this->sharedAmount($expense);
            $remainingSharedAmount = $sharedAmount;

            foreach ($users as $index => $user) {
                // 丸め誤差で合計がずれないよう、最後の人に残額をそのまま割り当てる。
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

        // 差額がプラスの人は立て替え過多、マイナスの人は支払い不足として1件の送金にまとめる。
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

    private function netAmount(Expense $expense): int
    {
        // 精算で実際に支払った扱いにする金額。どのカテゴリでも収入を先に差し引く。
        return $expense->amount - ($expense->income ?? 0);
    }

    private function personalTotal(Expense $expense): int
    {
        return $expense->personal_expenses->sum('amount');
    }

    private function sharedAmount(Expense $expense): int
    {
        // 共有額は、差引金額から個人だけが負担する分をさらに外した金額。
        return $this->netAmount($expense) - $this->personalTotal($expense);
    }
}
