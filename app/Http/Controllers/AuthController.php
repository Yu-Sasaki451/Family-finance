<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Family;
use App\Models\FamilyInvitation;
use App\Models\Category;
use App\Models\Ratio;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $data = $request->validated();

        $family = $this->resolveFamilyForRegistration($data['invite_token'] ?? null, $data['email']);

        $user = $family->users()
            ->whereNull('users.email')
            ->where('users.name', $data['name'])
            ->first();

        if ($user) {
            $user->update([
                'email' => $data['email'],
                'password' => $data['password'],
            ]);
        } else {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);

            $family->users()->syncWithoutDetaching([
                $user->id => ['role' => 'member'],
            ]);
        }

        $this->ensureRegistrationDefaults($family);

        if (! empty($data['invite_token'])) {
            FamilyInvitation::where('token', $data['invite_token'])
                ->update(['accepted_at' => now()]);
        }

        return $this->respondWithToken($user);
    }

    public function login(LoginRequest $request)
    {
        $data = $request->validated();
        $user = User::where('email', $data['email'])->first();

        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'メールアドレスまたはパスワードが正しくありません。',
            ]);
        }

        return $this->respondWithToken($user);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('families:id,name');

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'family' => $user->families->first(),
        ];
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    private function resolveFamilyForRegistration(?string $inviteToken, string $email): Family
    {
        if ($inviteToken) {
            $invitation = FamilyInvitation::where('token', $inviteToken)
                ->whereNull('accepted_at')
                ->where(function ($query) {
                    $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->first();

            if (! $invitation) {
                throw ValidationException::withMessages([
                    'invite_token' => '招待リンクの有効期限が切れているか、すでに使用されています。',
                ]);
            }

            if ($invitation->email && strtolower($invitation->email) !== strtolower($email)) {
                throw ValidationException::withMessages([
                    'email' => '招待されたメールアドレスで登録してください。',
                ]);
            }

            return $invitation->family;
        }

        $hasRegisteredUser = User::whereNotNull('email')->exists();

        if (! $hasRegisteredUser) {
            return Family::whereHas('users')->orderBy('id')->first()
                ?? Family::firstOrCreate(['name' => 'グループ']);
        }

        return Family::create(['name' => 'グループ']);
    }

    private function ensureRegistrationDefaults(Family $family): void
    {
        foreach (CategorySeeder::DEFAULT_CATEGORIES as $name) {
            Category::firstOrCreate(['name' => $name]);
        }

        $users = $family->users()->orderBy('users.id')->get(['users.id']);
        $categories = Category::orderBy('id')->get(['id', 'name']);

        foreach ($categories as $category) {
            foreach ($users as $index => $user) {
                Ratio::firstOrCreate(
                    [
                        'family_id' => $family->id,
                        'user_id' => $user->id,
                        'category_id' => $category->id,
                    ],
                    [
                        'ratio' => $this->defaultRatio($category->name, $index),
                    ],
                );
            }
        }
    }

    private function defaultRatio(string $categoryName, int $userIndex): float
    {
        if ($categoryName === '家ローン') {
            return $userIndex === 0 ? 0.45 : 0.55;
        }

        return 0.5;
    }

    private function respondWithToken(User $user)
    {
        return [
            'token' => $user->createToken('web')->plainTextToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'family' => $user->currentFamily(),
        ];
    }
}
