<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        if (! Schema::hasTable('cash_flow_forecasts')) {
            return;
        }

        Schema::table('cash_flow_forecasts', function (Blueprint $table) {
            if (! Schema::hasColumn('cash_flow_forecasts', 'simulation_incomes')) {
                $table->json('simulation_incomes')->nullable();
            }

            if (! Schema::hasColumn('cash_flow_forecasts', 'simulation_fixed_expenses')) {
                $table->json('simulation_fixed_expenses')->nullable();
            }

            if (! Schema::hasColumn('cash_flow_forecasts', 'simulation_variable_expenses')) {
                $table->json('simulation_variable_expenses')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('cash_flow_forecasts')) {
            return;
        }

        Schema::table('cash_flow_forecasts', function (Blueprint $table) {
            foreach ([
                'simulation_incomes',
                'simulation_fixed_expenses',
                'simulation_variable_expenses',
            ] as $column) {
                if (Schema::hasColumn('cash_flow_forecasts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
