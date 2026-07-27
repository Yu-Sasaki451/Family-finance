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

        // 招待リンクがある場合は招待先のグループへ、ない場合は空きグループまたは新規グループへ入れる。
        $family = $this->resolveFamilyForRegistration($data['invite_token'] ?? null, $data['email']);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);

        $family->users()->syncWithoutDetaching([
            $user->id => ['role' => 'member'],
        ]);

        // 新規ユーザーでもすぐ使えるように、カテゴリと割合の初期データを揃える。
        $this->ensureRegistrationDefaults($family);

        if (! empty($data['invite_token'])) {
            // 使い終わった招待リンクを再利用できないように、受け入れ済みにする。
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
            // 未使用で期限内の招待だけを有効にする。
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
                // メール指定の招待は、別のメールアドレスで参加できないようにする。
                throw ValidationException::withMessages([
                    'email' => '招待されたメールアドレスで登録してください。',
                ]);
            }

            return $invitation->family;
        }

        // 招待なし登録では、まだ誰もいないグループを優先して使い、なければ新しく作る。
        return Family::whereDoesntHave('users')->orderBy('id')->first()
            ?? Family::create(['name' => 'グループ']);
    }

    private function ensureRegistrationDefaults(Family $family): void
    {
        foreach (CategorySeeder::DEFAULT_CATEGORIES as $name) {
            Category::firstOrCreate(['name' => $name]);
        }

        $users = $family->users()->orderBy('users.id')->get(['users.id']);
        $categories = Category::orderBy('id')->get(['id', 'name']);

        $userCount = $users->count();
        $userIds = $users->pluck('id');

        foreach ($categories as $category) {
            // メンバー不足や合計100%崩れがあるカテゴリは、標準割合で作り直す。
            $existingRatios = Ratio::where('family_id', $family->id)
                ->where('category_id', $category->id)
                ->whereIn('user_id', $userIds)
                ->get();
            $shouldResetRatios = $existingRatios->count() !== $userCount
                || abs($existingRatios->sum('ratio') - 1) > 0.001;

            foreach ($users as $index => $user) {
                $attributes = [
                    'family_id' => $family->id,
                    'user_id' => $user->id,
                    'category_id' => $category->id,
                ];
                $values = [
                    'ratio' => $this->defaultRatio($category->name, $index, $userCount),
                ];

                if ($shouldResetRatios) {
                    Ratio::updateOrCreate($attributes, $values);
                    continue;
                }

                Ratio::firstOrCreate($attributes, $values);
            }
        }
    }

    private function defaultRatio(string $categoryName, int $userIndex, int $userCount): float
    {
        if ($userCount === 1) {
            // 1人グループでは、その人が100%負担する。
            return 1.0;
        }

        if ($userCount === 2 && $categoryName === '家ローン') {
            // 家ローンだけは初期値を45%/55%にする運用。
            return $userIndex === 0 ? 0.45 : 0.55;
        }

        $baseRatio = floor(100 / $userCount) / 100;

        // 端数は最後の人に寄せて、合計が必ず100%になるようにする。
        return $userIndex === $userCount - 1
            ? 1 - ($baseRatio * ($userCount - 1))
            : $baseRatio;
    }

    private function respondWithToken(User $user)
    {
        // フロントはこのトークンをlocalStorageに保存し、以後のAPIへBearerトークンとして送る。
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
