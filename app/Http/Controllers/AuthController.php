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
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $data = $request->validated();

        $this->ensureRegistrationSchema();

        $user = DB::transaction(function () use ($data) {
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

            return $user;
        });

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

    private function ensureRegistrationSchema(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'password')) {
                $table->string('password')->nullable();
            }

            if (! Schema::hasColumn('users', 'remember_token')) {
                $table->rememberToken();
            }
        });

        if (! Schema::hasTable('families')) {
            Schema::create('families', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('family_user')) {
            Schema::create('family_user', function (Blueprint $table) {
                $table->id();
                $table->foreignId('family_id');
                $table->foreignId('user_id');
                $table->string('role')->default('member');
                $table->timestamps();

                $table->unique(['family_id', 'user_id']);
            });
        } else {
            Schema::table('family_user', function (Blueprint $table) {
                if (! Schema::hasColumn('family_user', 'role')) {
                    $table->string('role')->default('member');
                }

                if (! Schema::hasColumn('family_user', 'created_at')) {
                    $table->timestamp('created_at')->nullable();
                }

                if (! Schema::hasColumn('family_user', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable();
                }
            });
        }

        if (! Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                if (! Schema::hasColumn('personal_access_tokens', 'tokenable_type')) {
                    $table->string('tokenable_type')->nullable();
                }

                if (! Schema::hasColumn('personal_access_tokens', 'tokenable_id')) {
                    $table->unsignedBigInteger('tokenable_id')->nullable();
                }

                if (! Schema::hasColumn('personal_access_tokens', 'name')) {
                    $table->string('name')->nullable();
                }

                if (! Schema::hasColumn('personal_access_tokens', 'token')) {
                    $table->string('token', 64)->nullable()->unique();
                }

                if (! Schema::hasColumn('personal_access_tokens', 'abilities')) {
                    $table->text('abilities')->nullable();
                }

                if (! Schema::hasColumn('personal_access_tokens', 'last_used_at')) {
                    $table->timestamp('last_used_at')->nullable();
                }

                if (! Schema::hasColumn('personal_access_tokens', 'expires_at')) {
                    $table->timestamp('expires_at')->nullable();
                }

                if (! Schema::hasColumn('personal_access_tokens', 'created_at')) {
                    $table->timestamp('created_at')->nullable();
                }

                if (! Schema::hasColumn('personal_access_tokens', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable();
                }
            });
        }
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
