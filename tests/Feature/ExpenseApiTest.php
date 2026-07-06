<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Expense;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_expense_and_personal_expenses_can_be_stored(): void
    {
        [$family, $husband, $wife] = $this->createFamilyUsers();
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

    public function test_expense_can_be_stored_with_browser_string_values_and_empty_optional_fields(): void
    {
        [$family, $husband, $wife] = $this->createFamilyUsers();
        $category = Category::create(['name' => '食費']);

        $this->postJson('/api/expenses', [
            'user_id' => (string) $husband->id,
            'category_id' => (string) $category->id,
            'amount' => '3000',
            'income' => '',
            'spent_at' => '2026-06-09',
            'note' => '',
            'personal_expenses' => [
                ['user_id' => $husband->id, 'amount' => '', 'note' => ''],
                ['user_id' => $wife->id, 'amount' => '', 'note' => ''],
            ],
        ])->assertCreated()
            ->assertJsonFragment(['amount' => 3000]);

        $this->assertDatabaseHas('expenses', [
            'user_id' => $husband->id,
            'category_id' => $category->id,
            'amount' => 3000,
            'income' => null,
            'note' => null,
        ]);
        $this->assertDatabaseCount('personal_expenses', 0);
    }

    public function test_personal_expense_total_cannot_exceed_expense_amount(): void
    {
        [$family, $husband, $wife] = $this->createFamilyUsers();
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
        [$family, $husband] = $this->createFamilyUsers(['夫']);
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
        [$family, $husband] = $this->createFamilyUsers(['夫']);
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
        [$family, $husband, $wife] = $this->createFamilyUsers();
        $food = Category::create(['name' => '食費']);
        $dailyGoods = Category::create(['name' => '日用品']);
        $expense = Expense::create([
            'family_id' => $family->id,
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
        [$family, $user] = $this->createFamilyUsers(['夫']);
        $category = Category::create(['name' => '食費']);
        $expense = Expense::create([
            'family_id' => $family->id,
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
