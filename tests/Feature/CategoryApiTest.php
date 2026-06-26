<?php

namespace Tests\Feature;

use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_category_can_be_displayed_added_updated_and_deleted(): void
    {
        $this->createFamilyUsers(['夫']);
        $category = Category::create(['name' => '食費']);

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonFragment(['name' => '食費']);

        $createdCategory = $this->postJson('/api/categories', ['name' => '電気代'])
            ->assertCreated()
            ->assertJsonFragment(['name' => '電気代'])
            ->json();

        $this->putJson("/api/categories/{$category->id}", ['name' => '外食費'])
            ->assertOk()
            ->assertJsonFragment(['name' => '外食費']);

        $this->deleteJson("/api/categories/{$createdCategory['id']}")
            ->assertNoContent();

        $this->assertDatabaseHas('categories', ['name' => '外食費']);
        $this->assertDatabaseMissing('categories', ['name' => '電気代']);
    }

    public function test_category_name_is_required(): void
    {
        $this->createFamilyUsers(['夫']);

        $this->postJson('/api/categories', ['name' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }
}
