<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Ratio;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RatioApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_ratios_can_be_displayed_and_updated(): void
    {
        $husband = User::create(['name' => '夫']);
        $wife = User::create(['name' => '妻']);
        $category = Category::create(['name' => '食費']);

        Ratio::create([
            'user_id' => $husband->id,
            'category_id' => $category->id,
            'ratio' => 0.5,
        ]);
        Ratio::create([
            'user_id' => $wife->id,
            'category_id' => $category->id,
            'ratio' => 0.5,
        ]);

        $this->getJson('/api/ratios')
            ->assertOk()
            ->assertJsonFragment(['name' => '食費'])
            ->assertJsonFragment(['ratio' => 50]);

        $this->putJson("/api/ratios/{$category->id}", [
            'ratios' => [
                ['user_id' => $husband->id, 'ratio' => 60],
                ['user_id' => $wife->id, 'ratio' => 40],
            ],
        ])->assertNoContent();

        $this->assertDatabaseHas('ratios', [
            'user_id' => $husband->id,
            'category_id' => $category->id,
            'ratio' => 0.6,
        ]);
        $this->assertDatabaseHas('ratios', [
            'user_id' => $wife->id,
            'category_id' => $category->id,
            'ratio' => 0.4,
        ]);
    }

    public function test_ratio_total_must_be_one_hundred_percent(): void
    {
        $husband = User::create(['name' => '夫']);
        $wife = User::create(['name' => '妻']);
        $category = Category::create(['name' => '食費']);

        $this->putJson("/api/ratios/{$category->id}", [
            'ratios' => [
                ['user_id' => $husband->id, 'ratio' => 50],
                ['user_id' => $wife->id, 'ratio' => 40],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('ratios');
    }
}
