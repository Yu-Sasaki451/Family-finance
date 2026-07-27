<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ratio extends Model
{
    use HasFactory;

    // ratioは0.50のような小数で保存し、画面では50%として表示する。
    protected $fillable = ['family_id', 'user_id', 'category_id', 'ratio'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
