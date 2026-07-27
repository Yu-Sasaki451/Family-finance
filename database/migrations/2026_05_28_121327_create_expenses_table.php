<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('expenses')) {
            return;
        }

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id');
            $table->foreignId('category_id');
            // amountはレシートや請求書の合計金額。収入や個人分を引く前の金額。
            $table->integer('amount');
            // incomeは返金・補助・売上など、その支出から差し引く収入。カテゴリ共通で使う。
            $table->integer('income')->nullable();
            $table->date('spent_at');
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
