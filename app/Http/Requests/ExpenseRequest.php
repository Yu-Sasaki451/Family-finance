<?php

namespace App\Http\Requests;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'exists:users,id'],
            'category_id' => ['required', 'exists:categories,id'],
            'amount' => ['required', 'integer', 'min:1'],
            'income' => ['nullable', 'integer', 'min:0'],
            'spent_at' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
            'personal_expenses' => ['nullable', 'array'],
            'personal_expenses.*.user_id' => ['required', 'distinct', 'exists:users,id'],
            'personal_expenses.*.amount' => ['nullable', 'integer', 'min:0'],
            'personal_expenses.*.note' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required' => '支払った人を選択してください。',
            'category_id.required' => 'カテゴリを選択してください。',
            'amount.required' => '合計金額を入力してください。',
            'amount.integer' => '合計金額は整数で入力してください。',
            'amount.min' => '合計金額は1円以上で入力してください。',
            'income.integer' => '売電収入は整数で入力してください。',
            'income.min' => '売電収入は0円以上で入力してください。',
            'spent_at.required' => '支払日を入力してください。',
            'personal_expenses.*.amount.integer' => '個人分は整数で入力してください。',
            'personal_expenses.*.amount.min' => '個人分は0円以上で入力してください。',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $amount = (int) $this->input('amount');
                $income = (int) $this->input('income');
                $personalTotal = collect($this->input('personal_expenses', []))
                    ->sum('amount');
                $category = Category::find($this->input('category_id'));

                if ($income > 0 && $category?->name !== '電気代') {
                    $validator->errors()->add(
                        'income',
                        '売電収入は電気代の場合のみ入力できます。',
                    );
                }

                if ($personalTotal > $amount) {
                    $validator->errors()->add(
                        'personal_expenses',
                        '個人分の合計は電気代以下にしてください。',
                    );
                }
            },
        ];
    }
}
