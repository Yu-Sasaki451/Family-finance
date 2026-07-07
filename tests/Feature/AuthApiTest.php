<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\Ratio;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => '太郎',
            'email' => 'taro@example.com',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user', 'family']);

        $this->assertDatabaseHas('users', [
            'name' => '太郎',
            'email' => 'taro@example.com',
        ]);
        $this->assertDatabaseCount('families', 1);
        $this->assertDatabaseCount('categories', 8);
        $this->assertDatabaseCount('ratios', 8);
        Ratio::query()->each(function (Ratio $ratio) {
            $this->assertEqualsWithDelta(1.0, (float) $ratio->ratio, 0.001);
        });
    }

    public function test_user_can_login(): void
    {
        $user = User::create([
            'name' => '太郎',
            'email' => 'taro@example.com',
            'password' => Hash::make('password'),
        ]);
        $family = Family::create(['name' => 'グループ']);
        $family->users()->attach($user->id, ['role' => 'member']);

        $this->postJson('/api/auth/login', [
            'email' => 'taro@example.com',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user', 'family']);
    }

    public function test_invited_user_joins_same_family(): void
    {
        [$family, $user] = $this->createFamilyUsers(['夫']);

        $inviteUrl = $this->postJson('/api/invitations', [
            'email' => 'wife@example.com',
        ])->assertOk()
            ->json('invite_url');

        parse_str(parse_url($inviteUrl, PHP_URL_QUERY), $query);

        $this->postJson('/api/auth/register', [
            'name' => '妻',
            'email' => 'wife@example.com',
            'password' => 'password',
            'invite_token' => $query['invite'],
        ])->assertOk();

        $wife = User::where('email', 'wife@example.com')->first();

        $this->assertDatabaseHas('family_user', [
            'family_id' => $family->id,
            'user_id' => $wife->id,
        ]);

        Ratio::where('family_id', $family->id)
            ->get()
            ->groupBy('category_id')
            ->each(function ($ratios) {
                $this->assertCount(2, $ratios);
                $this->assertEqualsWithDelta(1.0, $ratios->sum('ratio'), 0.001);
            });
    }

    public function test_placeholder_family_member_is_not_claimed_by_registration(): void
    {
        [$family, $husband] = $this->createFamilyUsers(['夫', '妻']);

        $this->postJson('/api/auth/register', [
            'name' => '夫',
            'email' => 'husband@example.com',
            'password' => 'password',
        ])->assertOk();

        $registeredUser = User::where('email', 'husband@example.com')->first();

        $this->assertDatabaseCount('users', 3);
        $this->assertDatabaseHas('users', [
            'id' => $husband->id,
            'name' => '夫',
            'email' => null,
        ]);
        $this->assertDatabaseHas('family_user', [
            'family_id' => $registeredUser->currentFamily()->id,
            'user_id' => $registeredUser->id,
        ]);
        $this->assertNotSame($family->id, $registeredUser->currentFamily()->id);
    }

    public function test_group_name_can_be_updated(): void
    {
        [$family, $user] = $this->createFamilyUsers(['夫']);

        $this->putJson('/api/family', [
            'name' => '旅行メンバー',
        ])->assertOk()
            ->assertJsonFragment(['name' => '旅行メンバー']);

        $this->assertDatabaseHas('families', [
            'id' => $family->id,
            'name' => '旅行メンバー',
        ]);
    }

    public function test_group_name_is_required(): void
    {
        $this->createFamilyUsers(['夫']);

        $this->putJson('/api/family', [
            'name' => '',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }
}
