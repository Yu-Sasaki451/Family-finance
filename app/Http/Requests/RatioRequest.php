<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RatioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ratios' => ['required', 'array', 'size:' . User::count()],
            'ratios.*.user_id' => ['required', 'integer', 'distinct', 'exists:users,id'],
            'ratios.*.ratio' => ['required', 'numeric', 'between:0,100'],
        ];
    }

    public function messages(): array
    {
        return [
            'ratios.size' => 'すべての人の割合を入力してください。',
            'ratios.*.ratio.required' => '割合を入力してください。',
            'ratios.*.ratio.numeric' => '割合は数字で入力してください。',
            'ratios.*.ratio.between' => '割合は0から100の間で入力してください。',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $total = collect($this->input('ratios', []))->sum('ratio');

                if (abs($total - 100) > 0.001) {
                    $validator->errors()->add('ratios', '割合の合計を100%にしてください。');
                }
            },
        ];
    }
}
