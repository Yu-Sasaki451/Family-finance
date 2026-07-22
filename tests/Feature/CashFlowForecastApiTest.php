<?php

namespace Tests\Feature;

use App\Models\CashFlowForecast;
use App\Models\Family;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CashFlowForecastApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_cash_flow_forecast_can_be_saved_for_signed_in_user(): void
    {
        [$family, $user] = $this->createFamilyUsers(['夫']);

        $this->putJson('/api/cash-flow-forecast', [
            'scope' => 'personal',
            'start_month' => '2026-07',
            'current_balance' => 200000,
            'fixed_incomes' => [
                [
                    'title' => '給料',
                    'same_amount' => true,
                    'amounts' => [
                        ['month' => '2026-07', 'amount' => 250000],
                        ['month' => '2026-08', 'amount' => 250000],
                        ['month' => '2026-09', 'amount' => 250000],
                    ],
                ],
            ],
            'variable_incomes' => [
                [
                    'title' => '臨時収入',
                    'same_amount' => false,
                    'amounts' => [
                        ['month' => '2026-07', 'amount' => null],
                        ['month' => '2026-08', 'amount' => 30000],
                        ['month' => '2026-09', 'amount' => null],
                    ],
                ],
            ],
            'fixed_expenses' => [
                [
                    'title' => '家賃',
                    'same_amount' => true,
                    'amounts' => [
                        ['month' => '2026-07', 'amount' => 80000],
                        ['month' => '2026-08', 'amount' => 80000],
                        ['month' => '2026-09', 'amount' => 80000],
                    ],
                ],
            ],
            'variable_expenses' => [
                [
                    'title' => '食費',
                    'same_amount' => false,
                    'amounts' => [
                        ['month' => '2026-07', 'amount' => 35000],
                        ['month' => '2026-08', 'amount' => 40000],
                        ['month' => '2026-09', 'amount' => 30000],
                    ],
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('family_id', $family->id)
            ->assertJsonPath('scope', 'personal')
            ->assertJsonPath('owner_id', $user->id)
            ->assertJsonPath('start_month', '2026-07')
            ->assertJsonPath('current_balance', 200000)
            ->assertJsonPath('fixed_incomes.0.title', '給料')
            ->assertJsonPath('variable_incomes.0.amounts.1.amount', 30000)
            ->assertJsonPath('fixed_expenses.0.title', '家賃')
            ->assertJsonPath('fixed_expenses.0.same_amount', true);

        $this->assertDatabaseHas('cash_flow_forecasts', [
            'family_id' => $family->id,
            'scope' => 'personal',
            'owner_id' => $user->id,
            'start_month' => '2026-07',
            'current_balance' => 200000,
        ]);

        $this->getJson('/api/cash-flow-forecast')
            ->assertOk()
            ->assertJsonPath('current_balance', 200000)
            ->assertJsonPath('variable_expenses.0.amounts.1.amount', 40000);
    }

    public function test_six_month_forecast_can_be_saved_separately_from_three_month_forecast(): void
    {
        [$family, $user] = $this->createFamilyUsers(['夫']);

        $this->putJson('/api/cash-flow-forecast', [
            'scope' => 'personal',
            'forecast_months' => 3,
            'start_month' => '2026-07',
            'current_balance' => 100000,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ])->assertOk()
            ->assertJsonPath('forecast_months', 3)
            ->assertJsonPath('current_balance', 100000);

        $this->putJson('/api/cash-flow-forecast', [
            'scope' => 'personal',
            'forecast_months' => 6,
            'start_month' => '2026-07',
            'current_balance' => 200000,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [],
            'variable_expenses' => [
                [
                    'title' => '食費',
                    'same_amount' => false,
                    'amounts' => [
                        ['month' => '2026-07', 'amount' => 30000],
                        ['month' => '2026-08', 'amount' => 31000],
                        ['month' => '2026-09', 'amount' => 32000],
                        ['month' => '2026-10', 'amount' => 33000],
                        ['month' => '2026-11', 'amount' => 34000],
                        ['month' => '2026-12', 'amount' => 35000],
                    ],
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('forecast_months', 6)
            ->assertJsonPath('current_balance', 200000)
            ->assertJsonPath('variable_expenses.0.amounts.5.amount', 35000);

        $this->getJson('/api/cash-flow-forecast?scope=personal&forecast_months=3')
            ->assertOk()
            ->assertJsonPath('forecast_months', 3)
            ->assertJsonPath('current_balance', 100000);

        $this->getJson('/api/cash-flow-forecast?scope=personal&forecast_months=6')
            ->assertOk()
            ->assertJsonPath('forecast_months', 6)
            ->assertJsonPath('current_balance', 200000)
            ->assertJsonPath('variable_expenses.0.amounts.5.month', '2026-12');

        $this->assertDatabaseHas('cash_flow_forecasts', [
            'family_id' => $family->id,
            'scope' => 'personal',
            'owner_id' => $user->id,
            'forecast_months' => 3,
            'current_balance' => 100000,
        ]);
        $this->assertDatabaseHas('cash_flow_forecasts', [
            'family_id' => $family->id,
            'scope' => 'personal',
            'owner_id' => $user->id,
            'forecast_months' => 6,
            'current_balance' => 200000,
        ]);
    }

    public function test_cash_flow_forecast_is_saved_per_user(): void
    {
        [$family, $husband, $wife] = $this->createFamilyUsers();

        CashFlowForecast::create([
            'family_id' => $family->id,
            'scope' => 'personal',
            'owner_id' => $wife->id,
            'start_month' => '2026-07',
            'current_balance' => 999999,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ]);

        Sanctum::actingAs($husband);

        $this->getJson('/api/cash-flow-forecast')
            ->assertOk()
            ->assertJsonMissing(['current_balance' => 999999]);
    }

    public function test_cash_flow_forecast_is_saved_per_family_and_user(): void
    {
        [$firstFamily, $user] = $this->createFamilyUsers(['夫']);

        $this->putJson('/api/cash-flow-forecast', [
            'scope' => 'personal',
            'start_month' => '2026-07',
            'current_balance' => 200000,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ])->assertOk();

        $secondFamily = Family::create(['name' => '別グループ']);
        $secondFamily->users()->attach($user->id, ['role' => 'member']);
        $user->families()->detach($firstFamily->id);

        $this->getJson('/api/cash-flow-forecast')
            ->assertOk()
            ->assertJsonPath('current_balance', 0);
    }

    public function test_personal_and_group_forecasts_are_saved_separately(): void
    {
        [$family, $user] = $this->createFamilyUsers(['夫']);

        $this->putJson('/api/cash-flow-forecast', [
            'scope' => 'personal',
            'start_month' => '2026-07',
            'current_balance' => 200000,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ])->assertOk()
            ->assertJsonPath('scope', 'personal')
            ->assertJsonPath('owner_id', $user->id);

        $this->putJson('/api/cash-flow-forecast', [
            'scope' => 'group',
            'start_month' => '2026-07',
            'current_balance' => 500000,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ])->assertOk()
            ->assertJsonPath('scope', 'group')
            ->assertJsonPath('owner_id', 0);

        $this->getJson('/api/cash-flow-forecast?scope=personal')
            ->assertOk()
            ->assertJsonPath('current_balance', 200000);

        $this->getJson('/api/cash-flow-forecast?scope=group')
            ->assertOk()
            ->assertJsonPath('current_balance', 500000);

        $this->assertDatabaseHas('cash_flow_forecasts', [
            'family_id' => $family->id,
            'scope' => 'personal',
            'owner_id' => $user->id,
            'current_balance' => 200000,
        ]);
        $this->assertDatabaseHas('cash_flow_forecasts', [
            'family_id' => $family->id,
            'scope' => 'group',
            'owner_id' => 0,
            'current_balance' => 500000,
        ]);
    }

    public function test_cash_flow_simulation_can_be_saved(): void
    {
        [$family, $user] = $this->createFamilyUsers(['夫']);

        $this->putJson('/api/cash-flow-forecast/simulation', [
            'scope' => 'personal',
            'incomes' => [
                ['title' => '給料', 'amount' => 300000],
            ],
            'fixed_expenses' => [
                ['title' => '家賃', 'amount' => 90000],
            ],
            'variable_expenses' => [
                ['title' => '生活費', 'amount' => 70000],
            ],
        ])->assertOk()
            ->assertJsonPath('family_id', $family->id)
            ->assertJsonPath('scope', 'personal')
            ->assertJsonPath('owner_id', $user->id)
            ->assertJsonPath('simulation_incomes.0.title', '給料')
            ->assertJsonPath('simulation_fixed_expenses.0.amount', 90000)
            ->assertJsonPath('simulation_variable_expenses.0.title', '生活費');

        $this->getJson('/api/cash-flow-forecast?scope=personal')
            ->assertOk()
            ->assertJsonPath('simulation_incomes.0.amount', 300000)
            ->assertJsonPath('simulation_fixed_expenses.0.title', '家賃')
            ->assertJsonPath('simulation_variable_expenses.0.amount', 70000);
    }

    public function test_personal_and_group_simulations_are_saved_separately(): void
    {
        [$family, $user] = $this->createFamilyUsers(['夫']);

        $this->putJson('/api/cash-flow-forecast/simulation', [
            'scope' => 'personal',
            'incomes' => [
                ['title' => '個人の給料', 'amount' => 300000],
            ],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ])->assertOk()
            ->assertJsonPath('owner_id', $user->id);

        $this->putJson('/api/cash-flow-forecast/simulation', [
            'scope' => 'group',
            'incomes' => [
                ['title' => 'グループ収入', 'amount' => 500000],
            ],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ])->assertOk()
            ->assertJsonPath('owner_id', 0);

        $this->getJson('/api/cash-flow-forecast?scope=personal')
            ->assertOk()
            ->assertJsonPath('simulation_incomes.0.title', '個人の給料');

        $this->getJson('/api/cash-flow-forecast?scope=group')
            ->assertOk()
            ->assertJsonPath('simulation_incomes.0.title', 'グループ収入');
    }

    public function test_cash_flow_simulation_save_does_not_overwrite_forecast(): void
    {
        [$family, $user] = $this->createFamilyUsers(['夫']);

        $this->putJson('/api/cash-flow-forecast', [
            'scope' => 'personal',
            'start_month' => '2026-07',
            'current_balance' => 200000,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ])->assertOk();

        $this->putJson('/api/cash-flow-forecast/simulation', [
            'scope' => 'personal',
            'incomes' => [
                ['title' => '給料', 'amount' => 300000],
            ],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ])->assertOk();

        $this->getJson('/api/cash-flow-forecast?scope=personal')
            ->assertOk()
            ->assertJsonPath('owner_id', $user->id)
            ->assertJsonPath('start_month', '2026-07')
            ->assertJsonPath('current_balance', 200000)
            ->assertJsonPath('simulation_incomes.0.title', '給料');
    }

    public function test_cash_flow_forecast_requires_item_title_when_amount_is_sent(): void
    {
        [$family, $user] = $this->createFamilyUsers(['夫']);

        $this->putJson('/api/cash-flow-forecast', [
            'scope' => 'personal',
            'start_month' => '2026-07',
            'current_balance' => 200000,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [
                [
                    'title' => '',
                    'same_amount' => false,
                    'amounts' => [
                        ['month' => '2026-07', 'amount' => 80000],
                        ['month' => '2026-08', 'amount' => null],
                        ['month' => '2026-09', 'amount' => null],
                    ],
                ],
            ],
            'variable_expenses' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('fixed_expenses.0.title');
    }
}
