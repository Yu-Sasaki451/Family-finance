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
            if (! Schema::hasColumn('cash_flow_forecasts', 'forecast_months')) {
                $table->unsignedTinyInteger('forecast_months')->default(3)->after('owner_id');
            }
        });

        Schema::table('cash_flow_forecasts', function (Blueprint $table) {
            $table->dropUnique('cash_flow_forecasts_family_id_scope_owner_id_unique');
            $table->unique(
                ['family_id', 'scope', 'owner_id', 'forecast_months'],
                'cash_flow_forecasts_lookup_unique',
            );
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('cash_flow_forecasts')) {
            return;
        }

        Schema::table('cash_flow_forecasts', function (Blueprint $table) {
            $table->dropUnique('cash_flow_forecasts_lookup_unique');
            $table->unique(
                ['family_id', 'scope', 'owner_id'],
                'cash_flow_forecasts_family_id_scope_owner_id_unique',
            );
        });

        Schema::table('cash_flow_forecasts', function (Blueprint $table) {
            if (Schema::hasColumn('cash_flow_forecasts', 'forecast_months')) {
                $table->dropColumn('forecast_months');
            }
        });
    }
};
