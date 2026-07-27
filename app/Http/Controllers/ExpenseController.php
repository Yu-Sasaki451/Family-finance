<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExpenseRequest;
use App\Http\Requests\MonthlyExpenseRequest;
use App\Models\Expense;
use App\Services\ExpenseService;
use App\Services\MonthlyExpenseService;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(
        private ExpenseService $expenseService,
        private MonthlyExpenseService $monthlyExpenseService,
    ) {}

    public function monthly(MonthlyExpenseRequest $request): array
    {
        $family = $request->user()->currentFamily();

        // 月別集計、カテゴリ別集計、明細、精算結果はサービス側でまとめて作る。
        return $this->monthlyExpenseService->buildMonthlyReport(
            $family,
            $request->validated('month'),
        );
    }

    public function options(Request $request): array
    {
        $family = $request->user()->currentFamily();

        // 支出登録と編集で使う「支払った人」と「カテゴリ」の選択肢を返す。
        return $this->expenseService->getOptions($family);
    }

    public function store(ExpenseRequest $request)
    {
        $data = $request->validated();
        $family = $request->user()->currentFamily();

        // 登録処理では、グループ外の人や割合未設定カテゴリをサービス側で防ぐ。
        $expense = $this->expenseService->create($family, $data);

        return $expense->load('personal_expenses');
    }

    public function update(ExpenseRequest $request, Expense $expense)
    {
        $data = $request->validated();
        $family = $request->user()->currentFamily();

        // URLの支出IDが別グループのものではないかも、サービス側で確認する。
        $expense = $this->expenseService->update($family, $expense, $data);

        return $expense->load('personal_expenses');
    }

    public function destroy(Request $request, Expense $expense)
    {
        $family = $request->user()->currentFamily();

        $this->expenseService->delete($family, $expense);

        return response()->noContent();
    }
}
