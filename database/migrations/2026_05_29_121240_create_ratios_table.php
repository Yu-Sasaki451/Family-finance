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
        if (Schema::hasTable('ratios')) {
            return;
        }

        Schema::create('ratios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id');
            $table->foreignId('category_id');
            // 画面では50%と表示するが、DBでは0.50のような小数で保存する。
            $table->decimal('ratio',3,2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ratios');
    }
};
