<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Personal_expense extends Model
{
    use HasFactory;

    protected $fillable = ['expense_id','user_id','amount','note'];

    public function user(){
        return $this->belongsTo(User::class);
    }

    public function expense(){
        return $this->belongsTo(Expense::class);
    }
}
