<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    // amountは合計金額、incomeはそこから差し引く収入、personal_expensesは個人負担分。
    protected $fillable = ['family_id', 'user_id', 'category_id', 'amount', 'income', 'spent_at', 'note'];

    protected $casts = [
        'family_id' => 'integer',
        'user_id' => 'integer',
        'category_id' => 'integer',
        'amount' => 'integer',
        'income' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function personal_expenses()
    {
        // 1つの支出に、複数人分の個人負担を紐づけられる。
        return $this->hasMany(Personal_expense::class);
    }
}
