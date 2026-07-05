<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('cash_flow_forecasts')) {
            return;
        }

        Schema::create('cash_flow_forecasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_id');
            $table->string('scope', 20);
            $table->unsignedBigInteger('owner_id');
            $table->string('start_month', 7);
            $table->integer('current_balance');
            $table->json('fixed_incomes');
            $table->json('variable_incomes');
            $table->json('fixed_expenses');
            $table->json('variable_expenses');
            $table->timestamps();

            $table->unique(['family_id', 'scope', 'owner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_flow_forecasts');
    }
};
