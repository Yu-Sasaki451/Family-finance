<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // ブラウザのinput値は文字列で届くため、金額やIDをバリデーション前に数値へ寄せる。
        $personalExpenses = collect($this->input('personal_expenses', []))
            ->map(fn ($item) => [
                'user_id' => $this->integerValue($item['user_id'] ?? null),
                'amount' => $this->integerValue($item['amount'] ?? null),
                'note' => $item['note'] ?? null,
            ])
            ->all();

        $this->merge([
            'user_id' => $this->integerValue($this->input('user_id')),
            'category_id' => $this->integerValue($this->input('category_id')),
            'amount' => $this->integerValue($this->input('amount')),
            'income' => $this->integerValue($this->input('income')),
            'personal_expenses' => $personalExpenses,
        ]);
    }

    public function rules(): array
    {
        $family = $this->user()->currentFamily();
        $familyUserIds = $family
            ? $family->users()->pluck('users.id')->all()
            : [];

        // 支払った人と個人分の人は、今のグループに所属している人だけ許可する。
        return [
            'user_id' => ['required', Rule::in($familyUserIds)],
            'category_id' => ['required', 'exists:categories,id'],
            'amount' => ['required', 'integer', 'min:1'],
            'income' => ['nullable', 'integer', 'min:0'],
            'spent_at' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
            'personal_expenses' => ['nullable', 'array'],
            'personal_expenses.*.user_id' => ['required', 'distinct', Rule::in($familyUserIds)],
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
            'income.integer' => '収入は整数で入力してください。',
            'income.min' => '収入は0円以上で入力してください。',
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
                $personalTotal = collect($this->input('personal_expenses', []))
                    ->sum('amount');

                // 個人分は「収入を引く前の合計金額」から指定するため、合計金額だけを上限にする。
                if ($personalTotal > $amount) {
                    $validator->errors()->add(
                        'personal_expenses',
                        '個人分の合計は合計金額以下にしてください。',
                    );
                }
            },
        ];
    }

    private function integerValue($value)
    {
        // 空欄は未入力として扱い、0とは区別する。
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value)) {
            return $value;
        }

        if (is_string($value) && preg_match('/^-?\d+$/', $value)) {
            return (int) $value;
        }

        // 数字以外の文字列はそのまま返し、integerルール側でエラーにする。
        return $value;
    }
}
