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
        $forecast = CashFlowForecast::where('family_id', $family->id)
            ->where('scope', $scope)
            ->where('owner_id', $this->ownerId($scope, $request->user()->id))
            ->first();

        if ($forecast) {
            return $forecast->toArray();
        }

        $months = $this->months(now()->format('Y-m'));

        return [
            'scope' => $scope,
            'start_month' => $months[0],
            'current_balance' => 0,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [],
            'variable_expenses' => [],
            'simulation_incomes' => [],
            'simulation_fixed_expenses' => [],
            'simulation_variable_expenses' => [],
        ];
    }

    public function update(CashFlowForecastRequest $request): JsonResponse
    {
        $data = $request->validated();
        $family = $request->user()->currentFamily();
        $ownerId = $this->ownerId($data['scope'], $request->user()->id);

        $forecast = CashFlowForecast::updateOrCreate(
            [
                'family_id' => $family->id,
                'scope' => $data['scope'],
                'owner_id' => $ownerId,
            ],
            [
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

        $forecast = CashFlowForecast::firstOrNew([
            'family_id' => $family->id,
            'scope' => $data['scope'],
            'owner_id' => $ownerId,
        ]);

        if (! $forecast->exists) {
            $forecast->fill($this->defaultForecastData($data['scope']));
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
            'start_month' => now()->format('Y-m'),
            'current_balance' => 0,
            'fixed_incomes' => [],
            'variable_incomes' => [],
            'fixed_expenses' => [],
            'variable_expenses' => [],
        ];
    }
}
