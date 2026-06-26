<?php

namespace App\Http\Controllers;

use App\Http\Requests\FamilyRequest;
use Illuminate\Validation\ValidationException;

class FamilyController extends Controller
{
    public function update(FamilyRequest $request)
    {
        $family = $request->user()->currentFamily();

        if (! $family) {
            throw ValidationException::withMessages([
                'family' => 'グループが見つかりません。',
            ]);
        }

        $family->update($request->validated());

        return $family;
    }
}
