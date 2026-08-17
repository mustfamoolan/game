<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'ثقافة عامة',  'slug' => 'general'],
            ['name' => 'علوم',         'slug' => 'science'],
            ['name' => 'جغرافيا',      'slug' => 'geography'],
            ['name' => 'تاريخ',        'slug' => 'history'],
            ['name' => 'أدب ولغة',     'slug' => 'literature'],
            ['name' => 'رياضة',        'slug' => 'sports'],
            ['name' => 'تقنية',        'slug' => 'technology'],
            ['name' => 'فن وموسيقى',   'slug' => 'arts'],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(['slug' => $cat['slug']], $cat);
        }
    }
}
