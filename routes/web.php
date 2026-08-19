<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\PartyController;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\ProfileController;
use App\Models\Category;
use App\Models\Party;
use App\Models\Player;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    // Auto-login: If player session cookie exists and belongs to a player, redirect to play
    $token = Cookie::get('player_session');
    if ($token) {
        $player = Player::where('session_token', $token)->first();
        if ($player) {
            return redirect()->route('play');
        }
    }

    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/play', function () {
    $token = Cookie::get('player_session');
    if (!$token) return redirect('/');

    $player = Player::where('session_token', $token)->first();
    if (!$player) return redirect('/');

    // Load public waiting parties with their leader and categories
    $publicParties = Party::where('is_public', true)
        ->where('status', 'waiting')
        ->with(['leader', 'categories', 'players'])
        ->latest()
        ->get()
        ->map(fn($p) => [
            'id'           => $p->id,
            'code'         => $p->code,
            'name'         => $p->name,
            'leader'       => [
                'nickname'     => $p->leader->nickname,
                'avatar_type'  => $p->leader->avatar_type,
                'avatar_value' => $p->leader->avatar_value,
            ],
            'categories'   => $p->categories->map(fn($c) => ['id' => $c->id, 'name' => $c->name]),
            'player_count' => $p->players->count(),
        ]);

    $categories = Category::all()->map(fn($c) => ['id' => $c->id, 'name' => $c->name]);

    return Inertia::render('Play', [
        'player' => [
            'id'           => $player->id,
            'nickname'     => $player->nickname,
            'avatar_type'  => $player->avatar_type,
            'avatar_value' => $player->avatar_value,
        ],
        'publicParties' => $publicParties,
        'categories'    => $categories,
    ]);
})->name('play');

// Guest player routes
Route::post('/players/register', [PlayerController::class, 'register'])->name('players.register');
Route::post('/players/update', [PlayerController::class, 'update'])->name('players.update');

// Party routes
Route::post('/parties/create', [PartyController::class, 'create'])->name('parties.create');
Route::post('/parties/join-code', [PartyController::class, 'joinByCode'])->name('parties.join-code');
Route::post('/parties/join-public/{id}', [PartyController::class, 'joinPublic'])->name('parties.join-public');
Route::get('/parties/{code}', [PartyController::class, 'show'])->name('party.room');
Route::post('/parties/{code}/leave', [PartyController::class, 'leave'])->name('parties.leave');
Route::post('/parties/{code}/start', [PartyController::class, 'start'])->name('parties.start');
Route::post('/parties/{code}/simulate', [PartyController::class, 'simulate'])->name('parties.simulate');

// Game routes
Route::get('/game/{code}', [GameController::class, 'question'])->name('game.question');
Route::post('/game/{code}/answer', [GameController::class, 'submitAnswer'])->name('game.answer');
Route::get('/game/{code}/results', [GameController::class, 'results'])->name('game.results');
Route::post('/game/{code}/mark/{answerId}', [GameController::class, 'markCorrect'])->name('game.mark');
Route::post('/game/{code}/next', [GameController::class, 'nextQuestion'])->name('game.next');
Route::get('/game/{code}/end', [GameController::class, 'end'])->name('game.end');
Route::post('/game/{code}/restart', [GameController::class, 'restart'])->name('game.restart');
Route::post('/game/{code}/terminate', [GameController::class, 'terminate'])->name('game.terminate');
Route::post('/game/{code}/buzz', [GameController::class, 'buzz'])->name('game.buzz');
Route::post('/game/{code}/buzzer/mark-correct/{playerId}', [GameController::class, 'buzzerMarkCorrect'])->name('game.buzzer.mark-correct');
Route::post('/game/{code}/buzzer/mark-wrong/{playerId}', [GameController::class, 'buzzerMarkWrong'])->name('game.buzzer.mark-wrong');


// Decisive Mode routes
Route::post('/game/{code}/decisive/start-voting',   [GameController::class, 'startDecisiveVoting'])->name('decisive.start-voting');
Route::get('/game/{code}/decisive/vote',             [GameController::class, 'decisiveVoteView'])->name('decisive.vote');
Route::post('/game/{code}/decisive/vote',            [GameController::class, 'submitDecisiveVote'])->name('decisive.submit-vote');
Route::post('/game/{code}/decisive/start-betting',   [GameController::class, 'startDecisiveBetting'])->name('decisive.start-betting');
Route::get('/game/{code}/decisive/bet',              [GameController::class, 'decisiveBetView'])->name('decisive.bet');
Route::post('/game/{code}/decisive/bet',             [GameController::class, 'submitDecisiveBet'])->name('decisive.submit-bet');
Route::post('/game/{code}/decisive/start-question',  [GameController::class, 'startDecisiveQuestion'])->name('decisive.start-question');
Route::get('/game/{code}/decisive/question',         [GameController::class, 'decisiveQuestionView'])->name('decisive.question');
Route::post('/game/{code}/decisive/answer',          [GameController::class, 'submitDecisiveAnswer'])->name('decisive.submit-answer');
Route::get('/game/{code}/decisive/results',          [GameController::class, 'decisiveResultsView'])->name('decisive.results');
Route::post('/game/{code}/decisive/mark/{answerId}', [GameController::class, 'markDecisiveAnswer'])->name('decisive.mark');

// Admin routes
Route::get('/admin/login', [AdminController::class, 'login'])->name('admin.login');
Route::post('/admin/login', [AdminController::class, 'authenticate'])->name('admin.authenticate');
Route::post('/admin/logout', [AdminController::class, 'logout'])->name('admin.logout');
Route::get('/admin/dashboard', [AdminController::class, 'dashboard'])->name('admin.dashboard');
Route::post('/admin/categories', [AdminController::class, 'storeCategory'])->name('admin.categories.store');
Route::put('/admin/categories/{id}', [AdminController::class, 'updateCategory'])->name('admin.categories.update');
Route::delete('/admin/categories/{id}', [AdminController::class, 'deleteCategory'])->name('admin.categories.delete');
Route::post('/admin/questions', [AdminController::class, 'storeQuestion'])->name('admin.questions.store');
Route::post('/admin/questions/{id}', [AdminController::class, 'updateQuestion'])->name('admin.questions.update');
Route::delete('/admin/questions/{id}', [AdminController::class, 'deleteQuestion'])->name('admin.questions.delete');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
