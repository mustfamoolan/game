<?php

namespace App\Http\Controllers;

use App\Http\Controllers\GameController;
use App\Models\Category;
use App\Models\Party;
use App\Models\Player;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PartyController extends Controller
{
    /**
     * Helper: resolve current player from cookie.
     */
    private function currentPlayer(): ?Player
    {
        $token = Cookie::get('player_session');
        if (!$token) return null;
        return Player::where('session_token', $token)->first();
    }

    /**
     * Create a new party.
     */
    public function create(Request $request)
    {
        $player = $this->currentPlayer();
        if (!$player) return redirect('/');

        $request->validate([
            'name'        => 'nullable|string|max:40',
            'is_public'   => 'required|boolean',
            'game_type'   => 'required|string|in:traditional,betting,buzzer',
            'category_ids'=> 'required|array|min:1',
            'category_ids.*' => 'exists:categories,id',
        ]);

        // Generate unique 6-digit code
        do {
            $code = (string) random_int(100000, 999999);
        } while (Party::where('code', $code)->exists());

        $party = Party::create([
            'code'      => $code,
            'name'      => $request->name,
            'leader_id' => $player->id,
            'is_public' => $request->is_public,
            'game_type' => $request->game_type,
            'status'    => 'waiting',
        ]);

        // Attach categories
        $party->categories()->sync($request->category_ids);

        // Leader joins as first player
        $party->players()->attach($player->id, ['score' => 0]);

        return redirect()->route('party.room', ['code' => $code]);
    }

    /**
     * Join party by 6-digit code.
     */
    public function joinByCode(Request $request)
    {
        $player = $this->currentPlayer();
        if (!$player) return redirect('/');

        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $party = Party::where('code', $request->code)
            ->where('status', 'waiting')
            ->first();

        if (!$party) {
            return back()->withErrors(['code' => 'الكود غير صحيح أو البارتي بدأ بالفعل.']);
        }

        // Attach player if not already in
        if (!$party->players()->where('player_id', $player->id)->exists()) {
            $party->players()->attach($player->id, ['score' => 0]);
        }

        return redirect()->route('party.room', ['code' => $party->code]);
    }

    /**
     * Join a public party directly.
     */
    public function joinPublic(Request $request, $id)
    {
        $player = $this->currentPlayer();
        if (!$player) return redirect('/');

        $party = Party::where('id', $id)
            ->where('is_public', true)
            ->where('status', 'waiting')
            ->firstOrFail();

        if (!$party->players()->where('player_id', $player->id)->exists()) {
            $party->players()->attach($player->id, ['score' => 0]);
        }

        return redirect()->route('party.room', ['code' => $party->code]);
    }

    /**
     * Show the party waiting room.
     */
    public function show($code)
    {
        $player = $this->currentPlayer();
        if (!$player) return redirect('/');

        $party = Party::where('code', $code)
            ->with(['leader', 'players', 'categories'])
            ->firstOrFail();

        // Build players list for Inertia
        $playersList = $party->players->map(fn($p) => [
            'id'           => $p->id,
            'nickname'     => $p->nickname,
            'avatar_type'  => $p->avatar_type,
            'avatar_value' => $p->avatar_value,
            'score'        => $p->pivot->score,
            'is_leader'    => $p->id === $party->leader_id,
        ]);

        return Inertia::render('PartyRoom', [
            'currentPlayer' => [
                'id'           => $player->id,
                'nickname'     => $player->nickname,
                'avatar_type'  => $player->avatar_type,
                'avatar_value' => $player->avatar_value,
            ],
            'party' => [
                'id'        => $party->id,
                'code'      => $party->code,
                'name'      => $party->name,
                'is_public' => $party->is_public,
                'status'    => $party->status,
                'game_type' => $party->game_type,
                'leader_id' => $party->leader_id,
                'categories'=> $party->categories->map(fn($c) => [
                    'id'   => $c->id,
                    'name' => $c->name,
                ]),
                'players'   => $playersList,
            ],
        ]);
    }

    /**
     * Leave the party.
     */
    public function leave(Request $request, $code)
    {
        $player = $this->currentPlayer();
        if (!$player) return redirect('/');

        $party = Party::where('code', $code)->firstOrFail();
        $party->players()->detach($player->id);

        // If leader left, assign new leader or delete party
        if ($party->leader_id === $player->id) {
            $newLeader = $party->players()->first();
            if ($newLeader) {
                $party->update(['leader_id' => $newLeader->id]);
            } else {
                $party->delete();
                return redirect()->route('play');
            }
        }

        return redirect()->route('play');
    }

    /**
     * Start the party (leader only).
     */
    public function start(Request $request, $code)
    {
        $player = $this->currentPlayer();
        if (!$player) return redirect('/');

        $party = Party::where('code', $code)->firstOrFail();

        if ($party->leader_id !== $player->id) {
            return back()->withErrors(['error' => 'فقط القائد يمكنه بدء اللعبة.']);
        }

        // Init game: pick 20 questions and set timer
        GameController::initGame($party);

        return redirect()->route('game.question', ['code' => $code]);
    }

    /**
     * Simulate 7 mock players in the party for testing.
     */
    public function simulate($code)
    {
        $party = Party::where('code', $code)->firstOrFail();

        $emojis = ['🦁', '🦊', '🐼', '🐸', '🐨', '🐯', '🐙', '🦄', '🐰', '🐹', '🐻', '🐷'];
        $names = ['سالم العلمي', 'خلود جغرافيا', 'يوسف الفن', 'نورة الأدبية', 'خالد حاسوب', 'هدى التاريخية', 'سعد الكيميائي'];

        foreach ($names as $idx => $name) {
            // Find or create mock player
            $mockPlayer = Player::firstOrCreate(
                ['session_token' => 'mock_session_' . ($idx + 1)],
                [
                    'nickname' => $name,
                    'avatar_type' => 'emoji',
                    'avatar_value' => $emojis[$idx % count($emojis)],
                ]
            );

            // Link them if not already inside the party
            if (!$party->players()->where('player_id', $mockPlayer->id)->exists()) {
                $party->players()->attach($mockPlayer->id, ['score' => 0]);
            }
        }

        return back();
    }
}
