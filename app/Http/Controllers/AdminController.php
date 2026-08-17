<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Party;
use App\Models\Player;
use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminController extends Controller
{
    /**
     * Helper: Check if admin is logged in.
     */
    private function isAdminLoggedIn(): bool
    {
        return Cookie::get('admin_session') === 'logged_in_1994';
    }

    /**
     * Show admin login page.
     */
    public function login()
    {
        if ($this->isAdminLoggedIn()) {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('Admin/Login');
    }

    /**
     * Authenticate admin using password.
     */
    public function authenticate(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        if ($request->password === '1994') {
            // Store session cookie valid for 1 year
            Cookie::queue('admin_session', 'logged_in_1994', 525600);
            return redirect()->route('admin.dashboard');
        }

        return back()->withErrors(['password' => 'كلمة المرور غير صحيحة!']);
    }

    /**
     * Log out admin.
     */
    public function logout()
    {
        Cookie::queue(Cookie::forget('admin_session'));
        return redirect()->route('admin.login');
    }

    /**
     * Admin Dashboard view.
     */
    public function dashboard()
    {
        if (!$this->isAdminLoggedIn()) {
            return redirect()->route('admin.login');
        }

        // Get Categories with question counts
        $categories = Category::withCount('questions')->get();

        // Get Questions with category info
        $questions = Question::with('category')->latest()->get();

        // Get Registered Players
        $players = Player::latest()->get();

        // Get Active Parties (waiting or playing) with leader and player counts
        $parties = Party::with(['leader', 'categories', 'players'])
            ->whereIn('status', ['waiting', 'playing'])
            ->latest()
            ->get()
            ->map(fn($p) => [
                'id'           => $p->id,
                'code'         => $p->code,
                'name'         => $p->name,
                'is_public'    => $p->is_public,
                'status'       => $p->status,
                'leader_name'  => $p->leader->nickname ?? 'غير معروف',
                'categories'   => $p->categories->pluck('name'),
                'players_count'=> $p->players->count(),
            ]);

        return Inertia::render('Admin/Dashboard', [
            'categories' => $categories,
            'questions'  => $questions,
            'players'    => $players,
            'parties'    => $parties,
        ]);
    }

    // --- Category CRUD ---

    public function storeCategory(Request $request)
    {
        if (!$this->isAdminLoggedIn()) return response()->json(['error' => 'Unauthorized'], 401);

        $request->validate([
            'name' => 'required|string|max:100|unique:categories,name',
        ]);

        Category::create([
            'name' => $request->name,
            'slug' => Str::random(8),
        ]);

        return back();
    }

    public function updateCategory(Request $request, $id)
    {
        if (!$this->isAdminLoggedIn()) return response()->json(['error' => 'Unauthorized'], 401);

        $request->validate([
            'name' => 'required|string|max:100|unique:categories,name,' . $id,
        ]);

        $category = Category::findOrFail($id);
        $category->update([
            'name' => $request->name,
        ]);

        return back();
    }

    public function deleteCategory($id)
    {
        if (!$this->isAdminLoggedIn()) return response()->json(['error' => 'Unauthorized'], 401);

        $category = Category::findOrFail($id);
        $category->delete();

        return back();
    }

    // --- Question CRUD ---

    public function storeQuestion(Request $request)
    {
        if (!$this->isAdminLoggedIn()) return response()->json(['error' => 'Unauthorized'], 401);

        $request->validate([
            'category_id'    => 'required|exists:categories,id',
            'question_text'  => 'required|string',
            'correct_answer' => 'required|string',
            'image'          => 'nullable|image|max:2048', // max 2MB
            'choices'        => 'nullable|array',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $fileName = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            
            // Ensure uploads directory exists
            $destinationPath = public_path('uploads/questions');
            if (!File::exists($destinationPath)) {
                File::makeDirectory($destinationPath, 0755, true);
            }
            
            $file->move($destinationPath, $fileName);
            $imagePath = '/uploads/questions/' . $fileName;
        }

        Question::create([
            'category_id'    => $request->category_id,
            'question_text'  => $request->question_text,
            'correct_answer' => $request->correct_answer,
            'image_path'     => $imagePath,
            'choices'        => $request->choices,
        ]);

        return back();
    }

    public function updateQuestion(Request $request, $id)
    {
        if (!$this->isAdminLoggedIn()) return response()->json(['error' => 'Unauthorized'], 401);

        $question = Question::findOrFail($id);

        $request->validate([
            'category_id'    => 'required|exists:categories,id',
            'question_text'  => 'required|string',
            'correct_answer' => 'required|string',
            'image'          => 'nullable|image|max:2048',
            'choices'        => 'nullable|array',
        ]);

        $imagePath = $question->image_path;

        // If new image uploaded
        if ($request->hasFile('image')) {
            // Delete old file if exists
            if ($imagePath && File::exists(public_path($imagePath))) {
                File::delete(public_path($imagePath));
            }

            $file = $request->file('image');
            $fileName = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            
            $destinationPath = public_path('uploads/questions');
            if (!File::exists($destinationPath)) {
                File::makeDirectory($destinationPath, 0755, true);
            }
            
            $file->move($destinationPath, $fileName);
            $imagePath = '/uploads/questions/' . $fileName;
        }

        $question->update([
            'category_id'    => $request->category_id,
            'question_text'  => $request->question_text,
            'correct_answer' => $request->correct_answer,
            'image_path'     => $imagePath,
            'choices'        => $request->choices,
        ]);

        return back();
    }

    public function deleteQuestion($id)
    {
        if (!$this->isAdminLoggedIn()) return response()->json(['error' => 'Unauthorized'], 401);

        $question = Question::findOrFail($id);

        // Delete associated image file
        if ($question->image_path && File::exists(public_path($question->image_path))) {
            File::delete(public_path($question->image_path));
        }

        $question->delete();

        return back();
    }
}
