<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
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

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            if (! Schema::hasColumn('personal_access_tokens', 'tokenable_type')) {
                $table->string('tokenable_type')->nullable();
            }

            if (! Schema::hasColumn('personal_access_tokens', 'tokenable_id')) {
                $table->unsignedBigInteger('tokenable_id')->nullable();
            }

            if (! Schema::hasColumn('personal_access_tokens', 'name')) {
                $table->string('name')->nullable();
            }

            if (! Schema::hasColumn('personal_access_tokens', 'token')) {
                $table->string('token', 64)->nullable()->unique();
            }

            if (! Schema::hasColumn('personal_access_tokens', 'abilities')) {
                $table->text('abilities')->nullable();
            }

            if (! Schema::hasColumn('personal_access_tokens', 'last_used_at')) {
                $table->timestamp('last_used_at')->nullable();
            }

            if (! Schema::hasColumn('personal_access_tokens', 'expires_at')) {
                $table->timestamp('expires_at')->nullable();
            }

            if (! Schema::hasColumn('personal_access_tokens', 'created_at')) {
                $table->timestamps();
            }
        });
    }
};
