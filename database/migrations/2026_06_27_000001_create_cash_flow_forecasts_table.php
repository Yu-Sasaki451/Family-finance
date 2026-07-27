<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;
    public function up(): void
    {
        if (Schema::hasTable('cash_flow_forecasts')) {
            return;
        }

        Schema::create('cash_flow_forecasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_id');
            // scopeはpersonal/group。個人予測とグループ予測を同じテーブルで分ける。
            $table->string('scope', 20);
            // グループ予測はowner_id=0、個人予測はユーザーIDを入れる。
            $table->unsignedBigInteger('owner_id');
            $table->string('start_month', 7);
            $table->integer('current_balance');
            // 各項目は「見出し名」と「月ごとの金額」をJSON配列で保存する。
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
