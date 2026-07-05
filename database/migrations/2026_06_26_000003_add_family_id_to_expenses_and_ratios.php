<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('expenses') && ! Schema::hasColumn('expenses', 'family_id')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->foreignId('family_id')->nullable();
            });
        }

        if (Schema::hasTable('ratios') && ! Schema::hasColumn('ratios', 'family_id')) {
            Schema::table('ratios', function (Blueprint $table) {
                $table->foreignId('family_id')->nullable();
            });
        }

        $familyId = DB::table('families')->orderBy('id')->value('id');

        if ($familyId) {
            DB::table('expenses')->whereNull('family_id')->update(['family_id' => $familyId]);
            DB::table('ratios')->whereNull('family_id')->update(['family_id' => $familyId]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('expenses') && Schema::hasColumn('expenses', 'family_id')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->dropColumn('family_id');
            });
        }

        if (Schema::hasTable('ratios') && Schema::hasColumn('ratios', 'family_id')) {
            Schema::table('ratios', function (Blueprint $table) {
                $table->dropColumn('family_id');
            });
        }
    }
};
