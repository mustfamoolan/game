<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug'];

    public function parties()
    {
        return $this->belongsToMany(Party::class, 'party_categories');
    }

    public function questions()
    {
        return $this->hasMany(Question::class);
    }
}
