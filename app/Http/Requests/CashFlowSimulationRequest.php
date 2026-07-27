<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CashFlowSimulationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // 1ヶ月予測は月別配列を持たず、見出し名と金額だけを保存する。
        return [
            'scope' => ['required', 'in:personal,group'],
            'incomes' => ['present', 'array'],
            'incomes.*.title' => ['required', 'string', 'max:50'],
            'incomes.*.amount' => ['nullable', 'integer', 'min:0'],
            'fixed_expenses' => ['present', 'array'],
            'fixed_expenses.*.title' => ['required', 'string', 'max:50'],
            'fixed_expenses.*.amount' => ['nullable', 'integer', 'min:0'],
            'variable_expenses' => ['present', 'array'],
            'variable_expenses.*.title' => ['required', 'string', 'max:50'],
            'variable_expenses.*.amount' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'scope.required' => '計算方法を選択してください。',
            'scope.in' => '計算方法は個人またはグループを選択してください。',
            'incomes.*.title.required' => '収入の見出し名を入力してください。',
            'incomes.*.title.max' => '収入の見出し名は50文字以内で入力してください。',
            'incomes.*.amount.integer' => '収入の金額は整数で入力してください。',
            'incomes.*.amount.min' => '収入の金額は0円以上で入力してください。',
            'fixed_expenses.*.title.required' => '固定費の見出し名を入力してください。',
            'fixed_expenses.*.title.max' => '固定費の見出し名は50文字以内で入力してください。',
            'fixed_expenses.*.amount.integer' => '固定費の金額は整数で入力してください。',
            'fixed_expenses.*.amount.min' => '固定費の金額は0円以上で入力してください。',
            'variable_expenses.*.title.required' => '変動費の見出し名を入力してください。',
            'variable_expenses.*.title.max' => '変動費の見出し名は50文字以内で入力してください。',
            'variable_expenses.*.amount.integer' => '変動費の金額は整数で入力してください。',
            'variable_expenses.*.amount.min' => '変動費の金額は0円以上で入力してください。',
        ];
    }
}
