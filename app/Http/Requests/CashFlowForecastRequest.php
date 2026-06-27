<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CashFlowForecastRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'scope' => ['required', 'in:personal,group'],
            'start_month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'current_balance' => ['required', 'integer', 'min:0'],
            'fixed_incomes' => ['present', 'array'],
            'fixed_incomes.*.title' => ['required', 'string', 'max:50'],
            'fixed_incomes.*.same_amount' => ['required', 'boolean'],
            'fixed_incomes.*.amounts' => ['required', 'array', 'size:3'],
            'fixed_incomes.*.amounts.*.month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'fixed_incomes.*.amounts.*.amount' => ['nullable', 'integer', 'min:0'],
            'variable_incomes' => ['present', 'array'],
            'variable_incomes.*.title' => ['required', 'string', 'max:50'],
            'variable_incomes.*.same_amount' => ['required', 'boolean'],
            'variable_incomes.*.amounts' => ['required', 'array', 'size:3'],
            'variable_incomes.*.amounts.*.month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'variable_incomes.*.amounts.*.amount' => ['nullable', 'integer', 'min:0'],
            'fixed_expenses' => ['present', 'array'],
            'fixed_expenses.*.title' => ['required', 'string', 'max:50'],
            'fixed_expenses.*.same_amount' => ['required', 'boolean'],
            'fixed_expenses.*.amounts' => ['required', 'array', 'size:3'],
            'fixed_expenses.*.amounts.*.month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'fixed_expenses.*.amounts.*.amount' => ['nullable', 'integer', 'min:0'],
            'variable_expenses' => ['present', 'array'],
            'variable_expenses.*.title' => ['required', 'string', 'max:50'],
            'variable_expenses.*.same_amount' => ['required', 'boolean'],
            'variable_expenses.*.amounts' => ['required', 'array', 'size:3'],
            'variable_expenses.*.amounts.*.month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'variable_expenses.*.amounts.*.amount' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'scope.required' => '計算方法を選択してください。',
            'scope.in' => '計算方法は個人またはグループを選択してください。',
            'start_month.required' => '開始月を入力してください。',
            'current_balance.required' => '現在残高を入力してください。',
            'current_balance.integer' => '現在残高は整数で入力してください。',
            'current_balance.min' => '現在残高は0円以上で入力してください。',
            'fixed_incomes.*.title.required' => '固定収入の見出し名を入力してください。',
            'fixed_incomes.*.title.max' => '固定収入の見出し名は50文字以内で入力してください。',
            'fixed_incomes.*.amounts.size' => '固定収入は3ヶ月分入力してください。',
            'fixed_incomes.*.amounts.*.amount.integer' => '固定収入の金額は整数で入力してください。',
            'fixed_incomes.*.amounts.*.amount.min' => '固定収入の金額は0円以上で入力してください。',
            'variable_incomes.*.title.required' => '変動収入の見出し名を入力してください。',
            'variable_incomes.*.title.max' => '変動収入の見出し名は50文字以内で入力してください。',
            'variable_incomes.*.amounts.size' => '変動収入は3ヶ月分入力してください。',
            'variable_incomes.*.amounts.*.amount.integer' => '変動収入の金額は整数で入力してください。',
            'variable_incomes.*.amounts.*.amount.min' => '変動収入の金額は0円以上で入力してください。',
            'fixed_expenses.*.title.required' => '固定支出の見出し名を入力してください。',
            'fixed_expenses.*.title.max' => '固定支出の見出し名は50文字以内で入力してください。',
            'fixed_expenses.*.amounts.size' => '固定支出は3ヶ月分入力してください。',
            'fixed_expenses.*.amounts.*.amount.integer' => '固定支出の金額は整数で入力してください。',
            'fixed_expenses.*.amounts.*.amount.min' => '固定支出の金額は0円以上で入力してください。',
            'variable_expenses.*.title.required' => '変動支出の見出し名を入力してください。',
            'variable_expenses.*.title.max' => '変動支出の見出し名は50文字以内で入力してください。',
            'variable_expenses.*.amounts.size' => '変動支出は3ヶ月分入力してください。',
            'variable_expenses.*.amounts.*.amount.integer' => '変動支出の金額は整数で入力してください。',
            'variable_expenses.*.amounts.*.amount.min' => '変動支出の金額は0円以上で入力してください。',
        ];
    }
}
