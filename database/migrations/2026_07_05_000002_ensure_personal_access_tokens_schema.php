<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;
    public function up(): void
    {
        if (! Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });

            return;
        }

        $needsTokenableType = ! Schema::hasColumn('personal_access_tokens', 'tokenable_type');
        $needsTokenableId = ! Schema::hasColumn('personal_access_tokens', 'tokenable_id');
        $needsName = ! Schema::hasColumn('personal_access_tokens', 'name');
        $needsToken = ! Schema::hasColumn('personal_access_tokens', 'token');
        $needsAbilities = ! Schema::hasColumn('personal_access_tokens', 'abilities');
        $needsLastUsedAt = ! Schema::hasColumn('personal_access_tokens', 'last_used_at');
        $needsExpiresAt = ! Schema::hasColumn('personal_access_tokens', 'expires_at');
        $needsCreatedAt = ! Schema::hasColumn('personal_access_tokens', 'created_at');
        $needsUpdatedAt = ! Schema::hasColumn('personal_access_tokens', 'updated_at');

        if (
            ! $needsTokenableType
            && ! $needsTokenableId
            && ! $needsName
            && ! $needsToken
            && ! $needsAbilities
            && ! $needsLastUsedAt
            && ! $needsExpiresAt
            && ! $needsCreatedAt
            && ! $needsUpdatedAt
        ) {
            return;
        }

        Schema::table('personal_access_tokens', function (Blueprint $table) use (
            $needsTokenableType,
            $needsTokenableId,
            $needsName,
            $needsToken,
            $needsAbilities,
            $needsLastUsedAt,
            $needsExpiresAt,
            $needsCreatedAt,
            $needsUpdatedAt,
        ) {
            if ($needsTokenableType) {
                $table->string('tokenable_type')->nullable();
            }

            if ($needsTokenableId) {
                $table->unsignedBigInteger('tokenable_id')->nullable();
            }

            if ($needsName) {
                $table->string('name')->nullable();
            }

            if ($needsToken) {
                $table->string('token', 64)->nullable()->unique();
            }

            if ($needsAbilities) {
                $table->text('abilities')->nullable();
            }

            if ($needsLastUsedAt) {
                $table->timestamp('last_used_at')->nullable();
            }

            if ($needsExpiresAt) {
                $table->timestamp('expires_at')->nullable();
            }

            if ($needsCreatedAt) {
                $table->timestamp('created_at')->nullable();
            }

            if ($needsUpdatedAt) {
                $table->timestamp('updated_at')->nullable();
            }
        });
    }
};
