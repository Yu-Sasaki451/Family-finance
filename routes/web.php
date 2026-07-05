<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/_version', function () {
    return response()->json([
        'release' => 'registration-schema-check-20260705',
        'version' => env('APP_VERSION', 'unknown'),
    ]);
});

Route::get('/_registration-check', function () {
    return response()->json([
        'users_table' => Schema::hasTable('users'),
        'users_email' => Schema::hasColumn('users', 'email'),
        'users_password' => Schema::hasColumn('users', 'password'),
        'families_table' => Schema::hasTable('families'),
        'family_user_table' => Schema::hasTable('family_user'),
        'family_user_role' => Schema::hasColumn('family_user', 'role'),
        'family_user_timestamps' => Schema::hasColumn('family_user', 'created_at')
            && Schema::hasColumn('family_user', 'updated_at'),
        'personal_access_tokens_table' => Schema::hasTable('personal_access_tokens'),
    ]);
});

Route::get('/{any}', function () {
    return view('index');
})->where('any','.*');
