<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_expense_and_personal_expenses_can_be_stored(): void
    {
        $husband = User::create(['name' => '夫']);
        $wife = User::create(['name' => '妻']);
        $category = Category::create(['name' => '食費']);

        $response = $this->postJson('/api/expenses', [
            'user_id' => $husband->id,
            'category_id' => $category->id,
            'amount' => 3000,
            'spent_at' => '2026-06-09',
            'note' => null,
            'personal_expenses' => [
                ['user_id' => $husband->id, 'amount' => 500, 'note' => null],
                ['user_id' => $wife->id, 'amount' => 0, 'note' => null],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonFragment(['amount' => 3000]);

        $this->assertDatabaseHas('expenses', [
            'amount' => 3000,
            'note' => null,
        ]);
        $this->assertDatabaseHas('personal_expenses', [
            'user_id' => $husband->id,
            'amount' => 500,
            'note' => null,
        ]);
        $this->assertDatabaseCount('personal_expenses', 1);
    }

    public function test_personal_expense_total_cannot_exceed_expense_amount(): void
    {
        $husband = User::create(['name' => '夫']);
        $wife = User::create(['name' => '妻']);
        $category = Category::create(['name' => '食費']);

        $this->postJson('/api/expenses', [
            'user_id' => $husband->id,
            'category_id' => $category->id,
            'amount' => 1000,
            'spent_at' => '2026-06-09',
            'personal_expenses' => [
                ['user_id' => $husband->id, 'amount' => 700, 'note' => null],
                ['user_id' => $wife->id, 'amount' => 500, 'note' => null],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('personal_expenses');
    }

    public function test_electricity_expense_can_be_stored_with_solar_income(): void
    {
        $husband = User::create(['name' => '夫']);
        $electricity = Category::create(['name' => '電気代']);

        $this->postJson('/api/expenses', [
            'user_id' => $husband->id,
            'category_id' => $electricity->id,
            'amount' => 10000,
            'income' => 3000,
            'spent_at' => '2026-06-09',
        ])->assertCreated()
            ->assertJsonFragment(['income' => 3000]);

        $this->assertDatabaseHas('expenses', [
            'category_id' => $electricity->id,
            'amount' => 10000,
            'income' => 3000,
        ]);
    }

    public function test_solar_income_cannot_be_stored_for_other_categories(): void
    {
        $husband = User::create(['name' => '夫']);
        $food = Category::create(['name' => '食費']);

        $this->postJson('/api/expenses', [
            'user_id' => $husband->id,
            'category_id' => $food->id,
            'amount' => 10000,
            'income' => 3000,
            'spent_at' => '2026-06-09',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('income');
    }

    public function test_expense_and_personal_expenses_can_be_updated(): void
    {
        $husband = User::create(['name' => '夫']);
        $wife = User::create(['name' => '妻']);
        $food = Category::create(['name' => '食費']);
        $dailyGoods = Category::create(['name' => '日用品']);
        $expense = Expense::create([
            'user_id' => $husband->id,
            'category_id' => $food->id,
            'amount' => 3000,
            'spent_at' => '2026-06-09',
        ]);
        $expense->personal_expenses()->create([
            'user_id' => $husband->id,
            'amount' => 500,
        ]);

        $this->putJson("/api/expenses/{$expense->id}", [
            'user_id' => $wife->id,
            'category_id' => $dailyGoods->id,
            'amount' => 4500,
            'spent_at' => '2026-06-10',
            'note' => '変更後',
            'personal_expenses' => [
                ['user_id' => $husband->id, 'amount' => 0, 'note' => null],
                ['user_id' => $wife->id, 'amount' => 700, 'note' => '妻の分'],
            ],
        ])->assertOk()
            ->assertJsonFragment(['amount' => 4500]);

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'user_id' => $wife->id,
            'category_id' => $dailyGoods->id,
            'amount' => 4500,
            'note' => '変更後',
        ]);
        $this->assertDatabaseMissing('personal_expenses', [
            'expense_id' => $expense->id,
            'user_id' => $husband->id,
        ]);
        $this->assertDatabaseHas('personal_expenses', [
            'expense_id' => $expense->id,
            'user_id' => $wife->id,
            'amount' => 700,
        ]);
    }

    public function test_expense_and_personal_expenses_can_be_deleted(): void
    {
        $user = User::create(['name' => '夫']);
        $category = Category::create(['name' => '食費']);
        $expense = Expense::create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'amount' => 3000,
            'spent_at' => '2026-06-09',
        ]);
        $expense->personal_expenses()->create([
            'user_id' => $user->id,
            'amount' => 500,
        ]);

        $this->deleteJson("/api/expenses/{$expense->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('expenses', ['id' => $expense->id]);
        $this->assertDatabaseMissing('personal_expenses', [
            'expense_id' => $expense->id,
        ]);
    }
}
