<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Party extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'leader_id',
        'is_public',
        'status',
        'game_type',
        'buzzed_player_id',
        'current_question_index',
        'question_started_at',
        'decisive_phase',
        'decisive_difficulty',
        'decisive_question_id',
    ];

    protected $casts = [
        'is_public' => 'boolean',
    ];

    public function leader()
    {
        return $this->belongsTo(Player::class, 'leader_id');
    }

    public function buzzedPlayer()
    {
        return $this->belongsTo(Player::class, 'buzzed_player_id');
    }

    public function players()
    {
        return $this->belongsToMany(Player::class, 'party_players')
            ->withPivot('score')
            ->withTimestamps();
    }

    public function categories()
    {
        return $this->belongsToMany(Category::class, 'party_categories');
    }
}
