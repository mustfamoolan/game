<?php

namespace App\Http\Controllers;

use App\Models\Party;
use App\Models\Player;
use App\Models\PlayerAnswer;
use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class GameController extends Controller
{
    private function currentPlayer(): ?Player
    {
        $token = Cookie::get('player_session');
        if (!$token) return null;
        return Player::where('session_token', $token)->first();
    }

    private function partyWithPlayer(string $code): ?array
    {
        $player = $this->currentPlayer();
        if (!$player) return null;

        $party = Party::where('code', $code)
            ->with(['players', 'categories'])
            ->first();
        if (!$party) return null;

        // Must be a member
        if (!$party->players->contains('id', $player->id)) return null;

        // Update player's active timestamp inside this party
        DB::table('party_players')
            ->where('party_id', $party->id)
            ->where('player_id', $player->id)
            ->update(['updated_at' => now()]);

        return [$party, $player];
    }

    /**
     * Helper: Automatically generate answers for simulated (mock) players.
     */
    private function autoAnswerMockPlayers(Party $party, Question $question)
    {
        $mockPlayers = $party->players()->where('session_token', 'LIKE', 'mock_session_%')->get();
        $emojis = ['نعم', 'لا', 'ربما', 'مصر', 'النيل', 'طوكيو', 'عطارد'];

        foreach ($mockPlayers as $mp) {
            // Check if they already answered
            $exists = PlayerAnswer::where([
                'party_id'    => $party->id,
                'player_id'   => $mp->id,
                'question_id' => $question->id,
            ])->exists();

            if (!$exists) {
                // Find unused bet points
                $usedBets = PlayerAnswer::where('party_id', $party->id)
                    ->where('player_id', $mp->id)
                    ->whereNotNull('bet_points')
                    ->pluck('bet_points')
                    ->toArray();

                $bet = null;
                for ($i = 1; $i <= 20; $i++) {
                    if (!in_array($i, $usedBets)) {
                        $bet = $i;
                        break;
                    }
                }

                // Randomly decide if correct for realistic mock scores
                $isCorrect = rand(0, 1) === 1;
                $ansText = $isCorrect ? $question->correct_answer : $emojis[array_rand($emojis)];

                PlayerAnswer::create([
                    'party_id'    => $party->id,
                    'player_id'   => $mp->id,
                    'question_id' => $question->id,
                    'answer_text' => $ansText,
                    'bet_points'  => $bet ?? rand(1, 20),
                    'is_correct'  => $isCorrect,
                ]);
            }
        }
    }

    /**
     * Called by PartyController@start — selects 20 questions, stores them, redirects to game.
     * (invoked internally, not via route)
     */
    public static function initGame(Party $party): void
    {
        $categoryIds = $party->categories->pluck('id')->toArray();

        // Pick 20 random questions from the party's categories
        $questions = Question::whereIn('category_id', $categoryIds)
            ->inRandomOrder()
            ->limit(20)
            ->get();

        // Insert into party_questions
        foreach ($questions as $i => $q) {
            DB::table('party_questions')->insertOrIgnore([
                'party_id'    => $party->id,
                'question_id' => $q->id,
                'order'       => $i + 1,
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }

        $party->update([
            'status'                  => 'playing',
            'current_question_index'  => 1,
            'question_started_at'     => now(),
        ]);
    }

    /**
     * GET /game/{code} — show the current question.
     */
    public function question(string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        // If game ended redirect to end
        if ($party->status === 'finished') {
            return redirect()->route('game.end', $code);
        }
        // If still waiting
        if ($party->status === 'waiting') {
            return redirect()->route('party.room', $code);
        }

        $idx = $party->current_question_index; // 1-based
        $totalQuestions = DB::table('party_questions')->where('party_id', $party->id)->count();

        // Fetch current question
        $pq = DB::table('party_questions')
            ->where('party_id', $party->id)
            ->where('order', $idx)
            ->first();

        if (!$pq) return redirect()->route('game.end', $code);

        $question = Question::with('category')->find($pq->question_id);

        // Auto-answer for any simulated players in this party
        $this->autoAnswerMockPlayers($party, $question);

        // Time remaining
        $elapsed = now()->diffInSeconds($party->question_started_at, true);
        $timeLeft = (int) max(0, 60 - $elapsed);

        // Player's existing answer for this question
        $myAnswer = PlayerAnswer::where([
            'party_id'   => $party->id,
            'player_id'  => $player->id,
            'question_id'=> $question->id,
        ])->first();

        if ($myAnswer && $myAnswer->answer_text !== null && $myAnswer->bet_points !== null) {
            return redirect()->route('game.results', $code);
        }

        // Which bet points has this player already used in this party?
        $usedBets = PlayerAnswer::where('party_id', $party->id)
            ->where('player_id', $player->id)
            ->whereNotNull('bet_points')
            ->get(['bet_points', 'is_correct'])
            ->map(fn($item) => [
                'points'     => $item->bet_points,
                'is_correct' => $item->is_correct,
            ])
            ->toArray();

        // Players list with current scores
        $players = $party->players->map(function ($p) use ($party) {
            $totalScore = PlayerAnswer::where('party_id', $party->id)
                ->where('player_id', $p->id)
                ->where('is_correct', true)
                ->sum('bet_points');
            return [
                'id'           => $p->id,
                'nickname'     => $p->nickname,
                'avatar_type'  => $p->avatar_type,
                'avatar_value' => $p->avatar_value,
                'score'        => (int) $totalScore,
                'is_leader'    => $p->id === $party->leader_id,
            ];
        });

        return Inertia::render('Game/Question', [
            'party' => [
                'id'        => $party->id,
                'code'      => $party->code,
                'leader_id' => $party->leader_id,
                'status'    => $party->status,
                'current_question_index' => $idx,
                'total_questions'        => $totalQuestions,
                'question_started_at'    => $party->question_started_at,
            ],
            'currentPlayer' => [
                'id'          => $player->id,
                'nickname'    => $player->nickname,
                'avatar_type' => $player->avatar_type,
                'avatar_value'=> $player->avatar_value,
            ],
            'question' => [
                'id'             => $question->id,
                'question_text'  => $question->question_text,
                'image_path'     => $question->image_path,
                'choices'        => $question->choices,
                'category_name'  => $question->category->name ?? '',
            ],
            'myAnswer'   => $myAnswer ? [
                'answer_text' => $myAnswer->answer_text,
                'bet_points'  => $myAnswer->bet_points,
            ] : null,
            'usedBets'   => $usedBets,
            'timeLeft'   => $timeLeft,
            'players'    => $players,
        ]);
    }

    /**
     * POST /game/{code}/answer — save player answer + bet.
     */
    public function submitAnswer(Request $request, string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return response()->json(['error' => 'Unauthorized'], 401);
        [$party, $player] = $res;

        $request->validate([
            'question_id' => 'required|exists:questions,id',
            'answer_text' => 'nullable|string|max:500',
            'bet_points'  => 'nullable|integer|min:1|max:20',
        ]);

        $question = Question::find($request->question_id);

        // Determine bet (auto-pick lowest available if none selected)
        $usedBets = PlayerAnswer::where('party_id', $party->id)
            ->where('player_id', $player->id)
            ->whereNotNull('bet_points')
            ->pluck('bet_points')
            ->toArray();

        $bet = $request->bet_points;
        if (!$bet || in_array($bet, $usedBets)) {
            // Auto-pick lowest available
            for ($i = 1; $i <= 20; $i++) {
                if (!in_array($i, $usedBets)) { $bet = $i; break; }
            }
        }

        // Check correctness (case-insensitive, trimmed)
        $isCorrect = false;
        if ($request->answer_text && $question->correct_answer) {
            $isCorrect = mb_strtolower(trim($request->answer_text))
                === mb_strtolower(trim($question->correct_answer));
        }

        PlayerAnswer::updateOrCreate(
            [
                'party_id'   => $party->id,
                'player_id'  => $player->id,
                'question_id'=> $request->question_id,
            ],
            [
                'answer_text' => $request->answer_text,
                'bet_points'  => $bet,
                'is_correct'  => $isCorrect,
            ]
        );

        return back();
    }

    /**
     * GET /game/{code}/results — show results after question timer ends.
     */
    public function results(string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        $idx = $party->current_question_index;
        $totalQuestions = DB::table('party_questions')->where('party_id', $party->id)->count();

        $pq = DB::table('party_questions')
            ->where('party_id', $party->id)
            ->where('order', $idx)
            ->first();

        if (!$pq) return redirect()->route('game.end', $code);

        $question = Question::find($pq->question_id);

        // Auto-answer for simulated players if they loaded the results
        $this->autoAnswerMockPlayers($party, $question);

        // Time remaining
        $elapsed = now()->diffInSeconds($party->question_started_at, true);
        $timeLeft = (int) max(0, 60 - $elapsed);

        // Check if all active players in the party have submitted answers (answer_text and bet_points are non-null)
        $activePlayersCount = $this->getActivePlayersCount($party);
        $answersCount = PlayerAnswer::where([
            'party_id'    => $party->id,
            'question_id' => $question->id,
        ])->whereNotNull('answer_text')
          ->whereNotNull('bet_points')
          ->count();

        $allAnswered = ($activePlayersCount > 0) && ($answersCount >= $activePlayersCount);

        if ($allAnswered) {
            $timeLeft = 0;
        }

        $isTimeUp = $timeLeft <= 0;

        // Build results per player
        $playerResults = $party->players->map(function ($p) use ($party, $question, $isTimeUp, $player) {
            $answer = PlayerAnswer::where([
                'party_id'   => $party->id,
                'player_id'  => $p->id,
                'question_id'=> $question->id,
            ])->first();

            $totalScore = PlayerAnswer::where('party_id', $party->id)
                ->where('player_id', $p->id)
                ->where('is_correct', true)
                ->sum('bet_points');

            $hasAnswered = $answer && $answer->answer_text !== null && $answer->bet_points !== null;

            return [
                'id'           => $p->id,
                'nickname'     => $p->nickname,
                'avatar_type'  => $p->avatar_type,
                'avatar_value' => $p->avatar_value,
                'is_leader'    => $p->id === $party->leader_id,
                'has_answered' => $hasAnswered,
                'answer_text'  => $isTimeUp ? ($answer?->answer_text) : null,
                'bet_points'   => ($isTimeUp || $p->id === $player->id) ? ($answer?->bet_points) : null,
                'is_correct'   => $isTimeUp ? ($answer?->is_correct ?? false) : false,
                'answer_id'    => $isTimeUp ? ($answer?->id) : null,
                'total_score'  => (int) $totalScore,
            ];
        })->sortByDesc('total_score')->values();

        return Inertia::render('Game/Results', [
            'party' => [
                'id'        => $party->id,
                'code'      => $party->code,
                'leader_id' => $party->leader_id,
                'status'    => $party->status,
                'current_question_index' => $idx,
                'total_questions'        => $totalQuestions,
            ],
            'currentPlayer' => [
                'id'       => $player->id,
                'nickname' => $player->nickname,
            ],
            'question' => [
                'id'            => $question->id,
                'question_text' => $question->question_text,
                'correct_answer'=> $isTimeUp ? $question->correct_answer : null,
                'image_path'    => $question->image_path,
            ],
            'playerResults'  => $playerResults,
            'isLastQuestion' => $idx >= $totalQuestions,
            'timeLeft'       => $timeLeft,
        ]);
    }

    /**
     * POST /game/{code}/mark/{answerId} — leader toggles correctness.
     */
    public function markCorrect(Request $request, string $code, int $answerId)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return response()->json(['error' => 'Unauthorized'], 401);
        [$party, $player] = $res;

        if ($party->leader_id !== $player->id) {
            return back()->withErrors(['error' => 'فقط القائد يمكنه تعديل الإجابات.']);
        }

        $answer = PlayerAnswer::where('party_id', $party->id)->findOrFail($answerId);
        $answer->update(['is_correct' => !$answer->is_correct]);

        return back();
    }

    /**
     * POST /game/{code}/next — leader moves to next question.
     */
    public function nextQuestion(Request $request, string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return response()->json(['error' => 'Unauthorized'], 401);
        [$party, $player] = $res;

        if ($party->leader_id !== $player->id) {
            return back()->withErrors(['error' => 'فقط القائد يمكنه بدء السؤال التالي.']);
        }

        $totalQuestions = DB::table('party_questions')->where('party_id', $party->id)->count();
        $nextIdx = $party->current_question_index + 1;

        if ($nextIdx > $totalQuestions) {
            $party->update(['status' => 'finished']);
            return redirect()->route('game.end', $code);
        }

        $party->update([
            'current_question_index' => $nextIdx,
            'question_started_at'    => now(),
        ]);

        return redirect()->route('game.question', $code);
    }

    /**
     * Helper: calculate total score for a player (regular + decisive).
     */
    private function calcScore(int $partyId, int $playerId): int
    {
        // Regular questions: sum of correct bet_points
        $regular = PlayerAnswer::where('party_id', $partyId)
            ->where('player_id', $playerId)
            ->where('is_correct', true)
            ->where('is_decisive', false)
            ->sum('bet_points');

        // Decisive: +decisive_bet if correct, -decisive_bet if wrong
        $decisiveRow = PlayerAnswer::where('party_id', $partyId)
            ->where('player_id', $playerId)
            ->where('is_decisive', true)
            ->first();

        $decisive = 0;
        if ($decisiveRow && $decisiveRow->decisive_bet !== null) {
            $decisive = $decisiveRow->is_correct
                ? $decisiveRow->decisive_bet
                : -$decisiveRow->decisive_bet;
        }

        return (int) ($regular + $decisive);
    }

    /**
     * Helper: Get the count of active players (online in last 6 seconds + mock players).
     */
    private function getActivePlayersCount(Party $party): int
    {
        // Active = updated pivot in last 6 seconds
        $onlinePlayerIds = DB::table('party_players')
            ->where('party_id', $party->id)
            ->where('updated_at', '>=', now()->subSeconds(6))
            ->pluck('player_id')
            ->toArray();

        // Plus mock players
        $mockPlayerIds = $party->players()
            ->where('session_token', 'LIKE', 'mock_session_%')
            ->pluck('players.id')
            ->toArray();

        $activePlayerIds = array_unique(array_merge($onlinePlayerIds, $mockPlayerIds));
        $activeCount = count($activePlayerIds);

        return $activeCount > 0 ? $activeCount : $party->players->count();
    }

    /**
     * GET /game/{code}/end — show final winners podium.
     */
    public function end(string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        // If the leader accesses the end page, set party status to finished
        if ($party->leader_id === $player->id && $party->status !== 'finished') {
            $party->update(['status' => 'finished']);
        }

        $rankings = $party->players->map(function ($p) use ($party) {
            return [
                'id'           => $p->id,
                'nickname'     => $p->nickname,
                'avatar_type'  => $p->avatar_type,
                'avatar_value' => $p->avatar_value,
                'total_score'  => $this->calcScore($party->id, $p->id),
            ];
        })->sortByDesc('total_score')->values();

        return Inertia::render('Game/End', [
            'party' => [
                'id'        => $party->id,
                'code'      => $party->code,
                'name'      => $party->name,
                'leader_id' => $party->leader_id,
            ],
            'currentPlayer' => ['id' => $player->id],
            'rankings'      => $rankings,
        ]);
    }

    // ═══════════════════════════════════════════
    // DECISIVE MODE
    // ═══════════════════════════════════════════

    /** POST /game/{code}/decisive/start-voting — leader triggers the decisive phase */
    public function startDecisiveVoting(string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        if ($party->leader_id !== $player->id) return back();

        $party->update(['decisive_phase' => 'voting', 'status' => 'decisive']);
        return redirect()->route('decisive.vote', $code);
    }

    /** GET /game/{code}/decisive/vote — combined vote + bet page */
    public function decisiveVoteView(string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        // If phase already moved to question, redirect there
        if ($party->decisive_phase === 'question') {
            return redirect()->route('decisive.question', $code);
        }

        // Build per-player data (vote + bet)
        $players = $party->players->map(function ($p) use ($party) {
            $row = PlayerAnswer::where('party_id', $party->id)
                ->where('player_id', $p->id)
                ->where('is_decisive', true)
                ->first();

            return [
                'id'           => $p->id,
                'nickname'     => $p->nickname,
                'avatar_type'  => $p->avatar_type,
                'avatar_value' => $p->avatar_value,
                'is_leader'    => $p->id === $party->leader_id,
                'vote'         => $row?->decisive_vote,
                'has_bet'      => $row !== null && $row->decisive_bet !== null,
                'total_score'  => $this->calcScore($party->id, $p->id),
            ];
        });

        $myRow = PlayerAnswer::where('party_id', $party->id)
            ->where('player_id', $player->id)
            ->where('is_decisive', true)
            ->first();

        $votesCount = PlayerAnswer::where('party_id', $party->id)
            ->where('is_decisive', true)
            ->whereNotNull('decisive_vote')
            ->count();

        $betsCount = PlayerAnswer::where('party_id', $party->id)
            ->where('is_decisive', true)
            ->whereNotNull('decisive_bet')
            ->count();

        return Inertia::render('Game/Decisive/Vote', [
            'party'         => ['id' => $party->id, 'code' => $party->code, 'leader_id' => $party->leader_id, 'decisive_phase' => $party->decisive_phase],
            'currentPlayer' => ['id' => $player->id, 'nickname' => $player->nickname],
            'players'       => $players,
            'myVote'        => $myRow?->decisive_vote,
            'myBet'         => $myRow?->decisive_bet,
            'votesCount'    => $votesCount,
            'betsCount'     => $betsCount,
        ]);
    }

    /** POST /game/{code}/decisive/vote */
    public function submitDecisiveVote(Request $request, string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        $request->validate(['vote' => 'required|in:easy,medium,hard']);

        PlayerAnswer::updateOrCreate(
            ['party_id' => $party->id, 'player_id' => $player->id, 'is_decisive' => true],
            ['decisive_vote' => $request->vote]
        );

        return back();
    }

    /** POST /game/{code}/decisive/start-betting — leader locks the vote and moves to betting */
    public function startDecisiveBetting(string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        if ($party->leader_id !== $player->id) return back();

        // Count votes for each difficulty
        $votes = PlayerAnswer::where('party_id', $party->id)
            ->where('is_decisive', true)
            ->whereNotNull('decisive_vote')
            ->get()
            ->groupBy('decisive_vote')
            ->map->count();

        $winner = $votes->sortDesc()->keys()->first() ?? 'medium';

        // Pick a random decisive question with that difficulty from party's categories
        $categoryIds = $party->categories->pluck('id')->toArray();
        $question = Question::whereIn('category_id', $categoryIds)
            ->where('difficulty', $winner)
            ->inRandomOrder()
            ->first();

        // Fallback if no questions exist with that difficulty
        if (!$question) {
            $question = Question::whereIn('category_id', $categoryIds)->inRandomOrder()->first();
        }

        $party->update([
            'decisive_phase'       => 'betting',
            'decisive_difficulty'  => $winner,
            'decisive_question_id' => $question?->id,
        ]);

        return redirect()->route('decisive.bet', $code);
    }

    /** GET /game/{code}/decisive/bet */
    public function decisiveBetView(string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        $players = $party->players->map(function ($p) use ($party) {
            $bet = PlayerAnswer::where('party_id', $party->id)
                ->where('player_id', $p->id)
                ->where('is_decisive', true)
                ->value('decisive_bet');

            return [
                'id'          => $p->id,
                'nickname'    => $p->nickname,
                'avatar_type' => $p->avatar_type,
                'avatar_value'=> $p->avatar_value,
                'is_leader'   => $p->id === $party->leader_id,
                'has_bet'     => $bet !== null,
                'total_score' => $this->calcScore($party->id, $p->id),
            ];
        });

        $myBet = PlayerAnswer::where('party_id', $party->id)
            ->where('player_id', $player->id)
            ->where('is_decisive', true)
            ->value('decisive_bet');

        $betsCount = PlayerAnswer::where('party_id', $party->id)
            ->where('is_decisive', true)
            ->whereNotNull('decisive_bet')
            ->count();

        return Inertia::render('Game/Decisive/Bet', [
            'party'         => [
                'id'                   => $party->id,
                'code'                 => $party->code,
                'leader_id'            => $party->leader_id,
                'decisive_difficulty'  => $party->decisive_difficulty,
                'decisive_phase'       => $party->decisive_phase,
            ],
            'currentPlayer' => ['id' => $player->id, 'nickname' => $player->nickname],
            'players'       => $players,
            'myBet'         => $myBet,
            'betsCount'     => $betsCount,
        ]);
    }

    /** POST /game/{code}/decisive/bet */
    public function submitDecisiveBet(Request $request, string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        $request->validate(['bet' => 'required|integer|in:0,5,10,15,20']);

        PlayerAnswer::updateOrCreate(
            ['party_id' => $party->id, 'player_id' => $player->id, 'is_decisive' => true],
            ['decisive_bet' => $request->bet]
        );

        return back();
    }

    /** POST /game/{code}/decisive/start-question — leader starts the decisive question (picks question from votes) */
    public function startDecisiveQuestion(string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        if ($party->leader_id !== $player->id) return back();

        // Count votes to pick winning difficulty
        $votes = PlayerAnswer::where('party_id', $party->id)
            ->where('is_decisive', true)
            ->whereNotNull('decisive_vote')
            ->get()
            ->groupBy('decisive_vote')
            ->map->count();

        $winner = $votes->sortDesc()->keys()->first() ?? 'medium';

        // Pick a question from party's categories with that difficulty
        $categoryIds = $party->categories->pluck('id')->toArray();
        $question = Question::whereIn('category_id', $categoryIds)
            ->where('difficulty', $winner)
            ->inRandomOrder()
            ->first();

        // Fallback if no questions for that difficulty
        if (!$question) {
            $question = Question::whereIn('category_id', $categoryIds)->inRandomOrder()->first();
        }

        $party->update([
            'decisive_phase'       => 'question',
            'decisive_difficulty'  => $winner,
            'decisive_question_id' => $question?->id,
            'question_started_at'  => now(),
        ]);

        return redirect()->route('decisive.question', $code);
    }

    /** GET /game/{code}/decisive/question */
    public function decisiveQuestionView(string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        $question = Question::with('category')->find($party->decisive_question_id);
        if (!$question) return redirect()->route('game.end', $code);

        // Check if player already answered
        $myAnswer = PlayerAnswer::where('party_id', $party->id)
            ->where('player_id', $player->id)
            ->where('is_decisive', true)
            ->whereNotNull('answer_text')
            ->first();

        if ($myAnswer) {
            return redirect()->route('decisive.results', $code);
        }

        $elapsed   = now()->diffInSeconds($party->question_started_at, true);
        $timeLeft  = (int) max(0, 60 - $elapsed);

        $myBet = PlayerAnswer::where('party_id', $party->id)
            ->where('player_id', $player->id)
            ->where('is_decisive', true)
            ->value('decisive_bet') ?? 0;

        return Inertia::render('Game/Decisive/Question', [
            'party'         => [
                'id'                   => $party->id,
                'code'                 => $party->code,
                'leader_id'            => $party->leader_id,
                'decisive_difficulty'  => $party->decisive_difficulty,
                'question_started_at'  => $party->question_started_at,
            ],
            'currentPlayer' => ['id' => $player->id, 'nickname' => $player->nickname],
            'question'      => [
                'id'            => $question->id,
                'question_text' => $question->question_text,
                'image_path'    => $question->image_path,
                'choices'       => $question->choices,
                'category_name' => $question->category->name ?? '',
                'difficulty'    => $question->difficulty,
            ],
            'myBet'    => $myBet,
            'timeLeft' => $timeLeft,
        ]);
    }

    /** POST /game/{code}/decisive/answer */
    public function submitDecisiveAnswer(Request $request, string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        $request->validate([
            'question_id' => 'required|exists:questions,id',
            'answer_text' => 'nullable|string|max:500',
        ]);

        // Determine correctness from the party's decisive question (stored in party)
        $question  = Question::find($party->decisive_question_id ?? $request->question_id);
        $isCorrect = false;

        if ($request->answer_text && $question?->correct_answer) {
            $isCorrect = mb_strtolower(trim($request->answer_text))
                === mb_strtolower(trim($question->correct_answer));
        }

        // Do NOT store question_id here — it causes unique constraint conflict with regular answers.
        // The decisive question is tracked in parties.decisive_question_id instead.
        PlayerAnswer::updateOrCreate(
            ['party_id' => $party->id, 'player_id' => $player->id, 'is_decisive' => true],
            [
                'answer_text' => $request->answer_text,
                'is_correct'  => $isCorrect,
            ]
        );

        return redirect()->route('decisive.results', $code);
    }

    /** GET /game/{code}/decisive/results */
    public function decisiveResultsView(string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        $question  = Question::find($party->decisive_question_id);
        $elapsed   = now()->diffInSeconds($party->question_started_at, true);
        $timeLeft  = (int) max(0, 60 - $elapsed);

        // All answered?
        $activeCount = $this->getActivePlayersCount($party);
        $answered   = PlayerAnswer::where('party_id', $party->id)
            ->where('is_decisive', true)
            ->whereNotNull('answer_text')
            ->count();
        if ($answered >= $activeCount) $timeLeft = 0;

        $isTimeUp = $timeLeft <= 0;

        $playerResults = $party->players->map(function ($p) use ($party, $question, $isTimeUp, $player) {
            $row = PlayerAnswer::where('party_id', $party->id)
                ->where('player_id', $p->id)
                ->where('is_decisive', true)
                ->first();

            $bet = $row?->decisive_bet ?? 0;
            $delta = 0;
            if ($isTimeUp && $row) {
                $delta = $row->is_correct ? $bet : -$bet;
            }

            return [
                'id'           => $p->id,
                'nickname'     => $p->nickname,
                'avatar_type'  => $p->avatar_type,
                'avatar_value' => $p->avatar_value,
                'is_leader'    => $p->id === $party->leader_id,
                'has_answered' => $row && $row->answer_text !== null,
                'answer_text'  => $isTimeUp ? ($row?->answer_text) : null,
                'decisive_bet' => $bet,
                'is_correct'   => $isTimeUp ? ($row?->is_correct ?? false) : false,
                'answer_id'    => $isTimeUp ? ($row?->id) : null,
                'score_delta'  => $delta,
                'total_score'  => $this->calcScore($party->id, $p->id),
            ];
        })->sortByDesc('total_score')->values();

        return Inertia::render('Game/Decisive/Results', [
            'party'         => [
                'id'        => $party->id,
                'code'      => $party->code,
                'leader_id' => $party->leader_id,
                'status'    => $party->status,
                'decisive_difficulty' => $party->decisive_difficulty,
            ],
            'currentPlayer' => ['id' => $player->id, 'nickname' => $player->nickname],
            'question'      => [
                'id'             => $question?->id,
                'question_text'  => $question?->question_text,
                'correct_answer' => $isTimeUp ? $question?->correct_answer : null,
            ],
            'playerResults' => $playerResults,
            'timeLeft'      => $timeLeft,
        ]);
    }

    /** POST /game/{code}/decisive/mark/{answerId} — leader toggles decisive correctness */
    public function markDecisiveAnswer(string $code, int $answerId)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        if ($party->leader_id !== $player->id) return back();

        $answer = PlayerAnswer::where('party_id', $party->id)->findOrFail($answerId);
        $answer->update(['is_correct' => !$answer->is_correct]);

        return back();
    }

    /** POST /game/{code}/restart — leader resets the game for play again */
    public function restart(string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) return redirect('/');
        [$party, $player] = $res;

        if ($party->leader_id !== $player->id) return back();

        // 1. Clear all player answers for this party
        PlayerAnswer::where('party_id', $party->id)->delete();

        // 2. Select 20 new random questions from categories
        DB::table('party_questions')->where('party_id', $party->id)->delete();

        $categoryIds = $party->categories->pluck('id')->toArray();
        $questions = Question::whereIn('category_id', $categoryIds)
            ->inRandomOrder()
            ->limit(20)
            ->get();

        foreach ($questions as $idx => $q) {
            DB::table('party_questions')->insert([
                'party_id'    => $party->id,
                'question_id' => $q->id,
                'order'       => $idx + 1,
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }

        // 3. Reset party columns to start fresh
        $party->update([
            'status'                 => 'playing',
            'current_question_index' => 1,
            'question_started_at'    => now(),
            'decisive_phase'         => null,
            'decisive_difficulty'    => null,
            'decisive_question_id'   => null,
        ]);

        return redirect()->route('game.question', $code);
    }

    /** POST /game/{code}/terminate — leader ends the game */
    public function terminate(Request $request, string $code)
    {
        $res = $this->partyWithPlayer($code);
        if (!$res) {
            if ($request->wantsJson() && !$request->header('X-Inertia')) {
                return response()->json(['success' => false]);
            }
            return redirect('/play');
        }
        [$party, $player] = $res;

        if ($party->leader_id === $player->id) {
            $party->update(['status' => 'finished']);
        }

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json(['success' => true]);
        }

        return redirect('/play');
    }
}

