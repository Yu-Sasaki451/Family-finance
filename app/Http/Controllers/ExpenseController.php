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

        return $this->monthlyExpenseService->buildMonthlyReport(
            $family,
            $request->validated('month'),
        );
    }

    public function options(Request $request): array
    {
        $family = $request->user()->currentFamily();

        return $this->expenseService->getOptions($family);
    }

    public function store(ExpenseRequest $request)
    {
        $data = $request->validated();
        $family = $request->user()->currentFamily();

        $expense = $this->expenseService->create($family, $data);

        return $expense->load('personal_expenses');
    }

    public function update(ExpenseRequest $request, Expense $expense)
    {
        $data = $request->validated();
        $family = $request->user()->currentFamily();

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
