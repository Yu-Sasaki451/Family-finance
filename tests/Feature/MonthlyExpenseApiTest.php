<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Expense;
use App\Models\Ratio;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MonthlyExpenseApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_monthly_summaries_are_displayed_before_selecting_month(): void
    {
        [$family, $user] = $this->createFamilyUsers(['夫']);
        $category = Category::create(['name' => '食費']);

        Expense::create([
            'family_id' => $family->id,
            'user_id' => $user->id,
            'category_id' => $category->id,
            'amount' => 2000,
            'spent_at' => '2026-06-09',
            'note' => null,
        ]);

        $this->getJson('/api/expenses/monthly')
            ->assertOk()
            ->assertJsonFragment([
                'month' => '2026-06',
                'total' => 2000,
                'count' => 1,
            ])
            ->assertJsonPath('selected_month', null)
            ->assertJsonCount(0, 'category_totals')
            ->assertJsonCount(0, 'details');
    }

    public function test_selected_month_expenses_are_summarized_by_category(): void
    {
        [$family, $user] = $this->createFamilyUsers(['夫']);
        $food = Category::create(['name' => '食費']);
        $rent = Category::create(['name' => '家賃']);

        Expense::create([
            'family_id' => $family->id,
            'user_id' => $user->id,
            'category_id' => $food->id,
            'amount' => 2000,
            'spent_at' => '2026-06-09',
            'note' => null,
        ]);
        Expense::create([
            'family_id' => $family->id,
            'user_id' => $user->id,
            'category_id' => $food->id,
            'amount' => 3000,
            'spent_at' => '2026-06-10',
            'note' => null,
        ]);
        Expense::create([
            'family_id' => $family->id,
            'user_id' => $user->id,
            'category_id' => $rent->id,
            'amount' => 80000,
            'spent_at' => '2026-06-25',
            'note' => null,
        ]);
        Expense::create([
            'family_id' => $family->id,
            'user_id' => $user->id,
            'category_id' => $food->id,
            'amount' => 1000,
            'spent_at' => '2026-05-09',
            'note' => null,
        ]);

        $this->getJson('/api/expenses/monthly?month=2026-06')
            ->assertOk()
            ->assertJsonPath('category_totals.0.category', '家賃')
            ->assertJsonPath('category_totals.0.total', 80000)
            ->assertJsonPath('category_totals.1.category', '食費')
            ->assertJsonPath('category_totals.1.total', 5000)
            ->assertJsonCount(2, 'category_totals');
    }

    public function test_selected_month_details_are_displayed(): void
    {
        [$family, $user, $wife] = $this->createFamilyUsers();
        $category = Category::create(['name' => '食費']);
        Ratio::create([
            'family_id' => $family->id,
            'user_id' => $user->id,
            'category_id' => $category->id,
            'ratio' => 0.5,
        ]);
        Ratio::create([
            'family_id' => $family->id,
            'user_id' => $wife->id,
            'category_id' => $category->id,
            'ratio' => 0.5,
        ]);

        Expense::create([
            'family_id' => $family->id,
            'user_id' => $user->id,
            'category_id' => $category->id,
            'amount' => 2000,
            'spent_at' => '2026-06-09',
            'note' => null,
        ]);
        Expense::create([
            'family_id' => $family->id,
            'user_id' => $user->id,
            'category_id' => $category->id,
            'amount' => 3000,
            'spent_at' => '2026-05-09',
            'note' => null,
        ]);

        $this->getJson('/api/expenses/monthly?month=2026-05')
            ->assertOk()
            ->assertJsonPath('selected_month', '2026-05')
            ->assertJsonFragment([
                'amount' => 3000,
                'shared_amount' => 3000,
            ])
            ->assertJsonFragment([
                'from' => '妻',
                'to' => '夫',
                'amount' => 1500,
            ])
            ->assertJsonMissing([
                'amount' => 2000,
            ]);
    }

    public function test_personal_expenses_are_included_in_settlement(): void
    {
        [$family, $husband, $wife] = $this->createFamilyUsers();
        $category = Category::create(['name' => '食費']);

        Ratio::create([
            'family_id' => $family->id,
            'user_id' => $husband->id,
            'category_id' => $category->id,
            'ratio' => 0.5,
        ]);
        Ratio::create([
            'family_id' => $family->id,
            'user_id' => $wife->id,
            'category_id' => $category->id,
            'ratio' => 0.5,
        ]);

        $expense = Expense::create([
            'family_id' => $family->id,
            'user_id' => $husband->id,
            'category_id' => $category->id,
            'amount' => 2000,
            'spent_at' => '2026-06-09',
            'note' => null,
        ]);
        $expense->personal_expenses()->createMany([
            ['user_id' => $husband->id, 'amount' => 700, 'note' => null],
            ['user_id' => $wife->id, 'amount' => 300, 'note' => null],
        ]);

        $this->getJson('/api/expenses/monthly?month=2026-06')
            ->assertOk()
            ->assertJsonFragment([
                'name' => '夫',
                'paid' => 2000,
                'burden' => 1200,
                'difference' => 800,
            ])
            ->assertJsonFragment([
                'name' => '妻',
                'paid' => 0,
                'burden' => 800,
                'difference' => -800,
            ])
            ->assertJsonFragment([
                'from' => '妻',
                'to' => '夫',
                'amount' => 800,
            ]);
    }

    public function test_solar_income_is_subtracted_from_monthly_total_and_settlement(): void
    {
        [$family, $husband, $wife] = $this->createFamilyUsers();
        $electricity = Category::create(['name' => '電気代']);

        Ratio::create([
            'family_id' => $family->id,
            'user_id' => $husband->id,
            'category_id' => $electricity->id,
            'ratio' => 0.5,
        ]);
        Ratio::create([
            'family_id' => $family->id,
            'user_id' => $wife->id,
            'category_id' => $electricity->id,
            'ratio' => 0.5,
        ]);

        Expense::create([
            'family_id' => $family->id,
            'user_id' => $husband->id,
            'category_id' => $electricity->id,
            'amount' => 10000,
            'income' => 3000,
            'spent_at' => '2026-06-09',
            'note' => null,
        ]);

        $this->getJson('/api/expenses/monthly?month=2026-06')
            ->assertOk()
            ->assertJsonFragment([
                'expense_total' => 10000,
                'income_total' => 3000,
                'total' => 7000,
            ])
            ->assertJsonFragment([
                'income' => 3000,
                'net_amount' => 7000,
                'shared_amount' => 7000,
            ])
            ->assertJsonFragment([
                'from' => '妻',
                'to' => '夫',
                'amount' => 3500,
            ]);
    }
}
