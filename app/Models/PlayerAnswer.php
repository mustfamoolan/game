<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlayerAnswer extends Model
{
    protected $fillable = [
        'party_id',
        'player_id',
        'question_id',
        'answer_text',
        'bet_points',
        'is_correct',
        'decisive_bet',
        'decisive_vote',
        'is_decisive',
    ];

    protected $casts = [
        'is_correct' => 'boolean',
    ];

    public function player() { return $this->belongsTo(Player::class); }
    public function question() { return $this->belongsTo(Question::class); }
    public function party() { return $this->belongsTo(Party::class); }
}
