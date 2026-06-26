<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = ['name', 'email', 'password'];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    public function families()
    {
        return $this->belongsToMany(Family::class)->withPivot('role')->withTimestamps();
    }

    public function currentFamily()
    {
        return $this->families()->orderBy('families.id')->first();
    }

    public function ratios()
    {
        return $this->hasMany(Ratio::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public function personal_expenses()
    {
        return $this->hasMany(Personal_expense::class);
    }
}
