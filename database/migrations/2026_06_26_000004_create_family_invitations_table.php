<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;
    public function up(): void
    {
        if (Schema::hasTable('family_invitations')) {
            return;
        }

        Schema::create('family_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_id');
            $table->foreignId('invited_by_user_id');
            $table->string('email')->nullable();
            $table->string('token')->unique();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_invitations');
    }
};
