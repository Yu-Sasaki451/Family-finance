<?php

namespace Tests;

use App\Models\Family;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function signInFamily(array $users): Family
    {
        $family = Family::create(['name' => 'グループ']);

        foreach ($users as $user) {
            $family->users()->attach($user->id, ['role' => 'member']);
        }

        Sanctum::actingAs($users[0]);

        return $family;
    }

    protected function createFamilyUsers(array $names = ['夫', '妻']): array
    {
        $users = collect($names)
            ->map(fn ($name) => User::create(['name' => $name]))
            ->all();

        $family = $this->signInFamily($users);

        return [$family, ...$users];
    }
}
