<?php

namespace App\Http\Controllers;

use App\Models\Player;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;

class PlayerController extends Controller
{
    /**
     * Register a new player guest session.
     */
    public function register(Request $request)
    {
        $request->validate([
            'nickname' => 'required|string|min:3|max:15',
            'avatar_type' => 'required|string|in:emoji,upload',
            'avatar_value' => 'required|string',
        ], [
            'nickname.required' => 'الرجاء إدخال الاسم المستعار!',
            'nickname.min' => 'الاسم المستعار يجب أن يكون 3 حروف على الأقل.',
            'nickname.max' => 'الاسم المستعار لا يجب أن يتجاوز 15 حرفاً.',
        ]);

        $token = Str::random(60);

        Player::create([
            'nickname'     => $request->nickname,
            'avatar_type'  => $request->avatar_type,
            'avatar_value' => $request->avatar_value,
            'session_token' => $token,
        ]);

        // Cookie for 1 year (525,600 minutes) — explicitly set for mobile browser compatibility
        // SameSite=Lax works on both Android Chrome and iOS Safari
        $cookie = cookie(
            name:     'player_session',
            value:    $token,
            minutes:  525600,
            path:     '/',
            domain:   null,
            secure:   request()->secure(), // true if HTTPS, false if HTTP
            httpOnly: true,
            raw:      false,
            sameSite: 'Lax',
        );

        return redirect()->route('play')->withCookie($cookie);
    }

    /**
     * Update the current player's profile settings.
     */
    public function update(Request $request)
    {
        $request->validate([
            'nickname' => 'required|string|min:3|max:15',
            'avatar_type' => 'required|string|in:emoji,upload',
            'avatar_value' => 'required|string',
        ], [
            'nickname.required' => 'الرجاء إدخال الاسم المستعار!',
            'nickname.min' => 'الاسم المستعار يجب أن يكون 3 حروف على الأقل.',
            'nickname.max' => 'الاسم المستعار لا يجب أن يتجاوز 15 حرفاً.',
        ]);

        $token = Cookie::get('player_session');

        if (!$token) {
            return redirect('/');
        }

        $player = Player::where('session_token', $token)->first();

        if (!$player) {
            // Clear invalid cookie
            Cookie::queue(Cookie::forget('player_session'));
            return redirect('/');
        }

        $player->update([
            'nickname' => $request->nickname,
            'avatar_type' => $request->avatar_type,
            'avatar_value' => $request->avatar_value,
        ]);

        return redirect()->back();
    }
}
