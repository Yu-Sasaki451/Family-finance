<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Personal_expense extends Model
{
    use HasFactory;

    // 個人分は「共有計算から外し、指定ユーザー本人の負担に足す」ためのデータ。
    protected $fillable = ['expense_id','user_id','amount','note'];

    protected $casts = [
        'expense_id' => 'integer',
        'user_id' => 'integer',
        'amount' => 'integer',
    ];

    public function user(){
        return $this->belongsTo(User::class);
    }

    public function expense(){
        return $this->belongsTo(Expense::class);
    }
}
