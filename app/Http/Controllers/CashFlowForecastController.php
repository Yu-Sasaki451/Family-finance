<?php

namespace App\Http\Controllers;

use App\Http\Requests\CashFlowForecastRequest;
use App\Http\Requests\CashFlowSimulationRequest;
use App\Models\CashFlowForecast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashFlowForecastController extends Controller
{
    public function show(Request $request): array
    {
        $family = $request->user()->currentFamily();
        $scope = $this->scope($request->query('scope'));
        $forecastMonths = $this->forecastMonths($request->query('forecast_months'));
        $ownerId = $this->ownerId($scope, $request->user()->id);
        $forecast = CashFlowForecast::where('family_id', $family->id)
            ->where('scope', $scope)
            ->where('owner_id', $ownerId)
            ->where('forecast_months', $forecastMonths)
            ->first();
        $simulationData = $this->simulationData($family->id, $scope, $ownerId);

        if ($forecast) {
            return array_merge($forecast->toArray(), $simulationData);
        }

        $months = $this->months(now()->format('Y-m'));

        return array_merge([
            'scope' => $scope,
            'forecast_months' => $forecastMonths,
            'start_month' => $months[0],
            'current_balance' => 0,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ], $simulationData);
    }

    public function update(CashFlowForecastRequest $request): JsonResponse
    {
        $data = $request->validated();
        $family = $request->user()->currentFamily();
        $forecastMonths = $request->forecastMonths();
        $ownerId = $this->ownerId($data['scope'], $request->user()->id);

        $forecast = CashFlowForecast::updateOrCreate(
            [
                'family_id' => $family->id,
                'scope' => $data['scope'],
                'owner_id' => $ownerId,
                'forecast_months' => $forecastMonths,
            ],
            [
                'forecast_months' => $forecastMonths,
                'start_month' => $data['start_month'],
                'current_balance' => $data['current_balance'],
                'fixed_incomes' => $data['fixed_incomes'],
                'variable_incomes' => $data['variable_incomes'],
                'fixed_expenses' => $data['fixed_expenses'],
                'variable_expenses' => $data['variable_expenses'],
            ],
        );

        return response()->json($forecast);
    }

    public function updateSimulation(CashFlowSimulationRequest $request): JsonResponse
    {
        $data = $request->validated();
        $family = $request->user()->currentFamily();
        $ownerId = $this->ownerId($data['scope'], $request->user()->id);

        $forecast = CashFlowForecast::where('family_id', $family->id)
            ->where('scope', $data['scope'])
            ->where('owner_id', $ownerId)
            ->orderBy('forecast_months')
            ->first();

        if (! $forecast) {
            $forecast = new CashFlowForecast([
                'family_id' => $family->id,
                'owner_id' => $ownerId,
                ...$this->defaultForecastData($data['scope']),
            ]);
        }

        $forecast->fill([
            'simulation_incomes' => $data['incomes'],
            'simulation_fixed_expenses' => $data['fixed_expenses'],
            'simulation_variable_expenses' => $data['variable_expenses'],
        ]);
        $forecast->save();

        return response()->json($forecast);
    }

    private function scope(?string $scope): string
    {
        return in_array($scope, ['personal', 'group'], true)
            ? $scope
            : 'personal';
    }

    private function ownerId(string $scope, int $userId): int
    {
        return $scope === 'group' ? 0 : $userId;
    }

    private function forecastMonths(mixed $forecastMonths): int
    {
        $forecastMonths = (int) ($forecastMonths ?? 3);

        return in_array($forecastMonths, [3, 6], true) ? $forecastMonths : 3;
    }

    private function months(string $startMonth): array
    {
        [$year, $month] = array_map('intval', explode('-', $startMonth));

        return collect(range(0, 2))
            ->map(fn ($index) => now()
                ->setDate($year, $month, 1)
                ->addMonthsNoOverflow($index)
            ->format('Y-m'))
            ->all();
    }

    private function defaultForecastData(string $scope): array
    {
        return [
            'scope' => $scope,
            'forecast_months' => 3,
            'start_month' => now()->format('Y-m'),
            'current_balance' => 0,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ];
    }

    private function simulationData(int $familyId, string $scope, int $ownerId): array
    {
        $forecast = CashFlowForecast::where('family_id', $familyId)
            ->where('scope', $scope)
            ->where('owner_id', $ownerId)
            ->where(function ($query) {
                $query->whereNotNull('simulation_incomes')
                    ->orWhereNotNull('simulation_fixed_expenses')
                    ->orWhereNotNull('simulation_variable_expenses');
            })
            ->orderBy('forecast_months')
            ->first();

        return [
            'simulation_incomes' => $forecast?->simulation_incomes ?? [],
            'simulation_fixed_expenses' => $forecast?->simulation_fixed_expenses ?? [],
            'simulation_variable_expenses' => $forecast?->simulation_variable_expenses ?? [],
        ];
    }
}
