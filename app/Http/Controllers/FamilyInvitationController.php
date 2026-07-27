<?php

namespace App\Http\Controllers;

use App\Http\Requests\FamilyInvitationRequest;
use App\Models\FamilyInvitation;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FamilyInvitationController extends Controller
{
    public function store(FamilyInvitationRequest $request)
    {
        $family = $request->user()->currentFamily();

        if (! $family) {
            throw ValidationException::withMessages([
                'family' => 'グループが見つかりません。',
            ]);
        }

        // 招待リンクは推測されにくいランダムな文字列にし、7日で期限切れにする。
        $invitation = FamilyInvitation::create([
            'family_id' => $family->id,
            'invited_by_user_id' => $request->user()->id,
            'email' => $request->validated('email'),
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
        ]);

        return [
            'invite_url' => url('/register?invite='.$invitation->token),
            'expires_at' => $invitation->expires_at,
        ];
    }

    public function show(string $token)
    {
        // 登録画面で招待先グループ名を表示するため、未使用で期限内の招待だけ返す。
        $invitation = FamilyInvitation::with('family:id,name')
            ->where('token', $token)
            ->whereNull('accepted_at')
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->firstOrFail();

        return [
            'family' => $invitation->family,
            'email' => $invitation->email,
        ];
    }
}
