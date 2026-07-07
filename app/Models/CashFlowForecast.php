<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashFlowForecast extends Model
{
    use HasFactory;

    protected $fillable = [
        'family_id',
        'scope',
        'owner_id',
        'start_month',
        'current_balance',
        'fixed_incomes',
        'variable_incomes',
        'fixed_expenses',
        'variable_expenses',
        'simulation_incomes',
        'simulation_fixed_expenses',
        'simulation_variable_expenses',
    ];

    protected $casts = [
        'fixed_incomes' => 'array',
        'variable_incomes' => 'array',
        'fixed_expenses' => 'array',
        'variable_expenses' => 'array',
        'simulation_incomes' => 'array',
        'simulation_fixed_expenses' => 'array',
        'simulation_variable_expenses' => 'array',
    ];

    public function family()
    {
        return $this->belongsTo(Family::class);
    }
}
