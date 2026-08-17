import React, { useState, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { LogOut, Plus, Trash2, Edit3, Image as ImageIcon, Users, List, FolderPlus, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// --- Types ---
interface Category {
    id: number;
    name: string;
    slug: string;
    questions_count?: number;
}

interface Question {
    id: number;
    category_id: number;
    question_text: string;
    image_path: string | null;
    choices: string[] | null;
    correct_answer: string;
    category?: Category;
}

interface Player {
    id: number;
    nickname: string;
    avatar_type: 'emoji' | 'upload';
    avatar_value: string;
}

interface Party {
    id: number;
    code: string;
    name: string | null;
    is_public: boolean;
    status: 'waiting' | 'playing' | 'finished';
    leader_name: string;
    categories: string[];
    players_count: number;
}

interface DashboardProps {
    categories: Category[];
    questions: Question[];
    players: Player[];
    parties: Party[];
}

export default function Dashboard({ categories, questions, players, parties }: DashboardProps) {
    const [activeTab, setActiveTab] = useState<'questions' | 'categories' | 'players' | 'parties'>('questions');
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // --- Category Form States ---
    const [catName, setCatName] = useState('');
    const [editingCatId, setEditingCatId] = useState<number | null>(null);
    const [editingCatName, setEditingCatName] = useState('');

    // --- Question Form States ---
    const [questionText, setQuestionText] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || '');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [choiceA, setChoiceA] = useState('');
    const [choiceB, setChoiceB] = useState('');
    const [choiceC, setChoiceC] = useState('');
    const [choiceD, setChoiceD] = useState('');
    const [questionImage, setQuestionImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Handle Logout ---
    const handleLogout = () => {
        setIsLoggingOut(true);
        router.post('/admin/logout', {}, {
            onFinish: () => setIsLoggingOut(false)
        });
    };

    // --- Category CRUD Actions ---
    const handleSaveCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!catName.trim()) return;

        router.post('/admin/categories', { name: catName.trim() }, {
            onSuccess: () => {
                setCatName('');
            }
        });
    };

    const handleStartEditCategory = (cat: Category) => {
        setEditingCatId(cat.id);
        setEditingCatName(cat.name);
    };

    const handleUpdateCategory = (id: number) => {
        if (!editingCatName.trim()) return;
        router.put(`/admin/categories/${id}`, { name: editingCatName.trim() }, {
            onSuccess: () => {
                setEditingCatId(null);
            }
        });
    };

    const handleDeleteCategory = (id: number) => {
        if (confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع الأسئلة المرتبطة به!')) {
            router.delete(`/admin/categories/${id}`);
        }
    };

    // --- Question CRUD Actions ---
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setQuestionImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleClearImage = () => {
        setQuestionImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSaveQuestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!questionText.trim() || !selectedCategoryId || !correctAnswer.trim()) {
            alert('الرجاء تعبئة نص السؤال، القسم، والإجابة الصحيحة.');
            return;
        }

        // Collect choices (only non-empty ones)
        const choicesList = [choiceA.trim(), choiceB.trim(), choiceC.trim(), choiceD.trim()].filter(c => c !== '');
        const choicesData = choicesList.length > 0 ? choicesList : null;

        const formData = new FormData();
        formData.append('category_id', String(selectedCategoryId));
        formData.append('question_text', questionText.trim());
        formData.append('correct_answer', correctAnswer.trim());
        if (questionImage) {
            formData.append('image', questionImage);
        }
        if (choicesData) {
            choicesData.forEach((ch, idx) => {
                formData.append(`choices[${idx}]`, ch);
            });
        }

        if (editingQuestion) {
            // Edit existing question
            // Note: Since standard PHP/Laravel PUT requests don't handle multipart form-data natively,
            // we use POST for update to upload the image file correctly.
            router.post(`/admin/questions/${editingQuestion.id}`, formData as any, {
                onSuccess: () => {
                    resetQuestionForm();
                }
            });
        } else {
            // Create new question
            router.post('/admin/questions', formData as any, {
                onSuccess: () => {
                    resetQuestionForm();
                }
            });
        }
    };

    const handleEditQuestionClick = (q: Question) => {
        setEditingQuestion(q);
        setQuestionText(q.question_text);
        setSelectedCategoryId(q.category_id);
        setCorrectAnswer(q.correct_answer);
        
        // Populate choices
        setChoiceA(q.choices?.[0] || '');
        setChoiceB(q.choices?.[1] || '');
        setChoiceC(q.choices?.[2] || '');
        setChoiceD(q.choices?.[3] || '');

        // Set image preview if exists
        if (q.image_path) {
            setImagePreview(q.image_path);
        } else {
            setImagePreview(null);
        }
        setQuestionImage(null);
    };

    const handleDeleteQuestion = (id: number) => {
        if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
            router.delete(`/admin/questions/${id}`);
        }
    };

    const resetQuestionForm = () => {
        setEditingQuestion(null);
        setQuestionText('');
        setSelectedCategoryId(categories[0]?.id || '');
        setCorrectAnswer('');
        setChoiceA('');
        setChoiceB('');
        setChoiceC('');
        setChoiceD('');
        setQuestionImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <>
            <Head title="لوحة التحكم الإدارية - لعبة أسئلة" />
            <div className="min-h-screen flex flex-col bg-[#ecf7f1] select-none font-sans relative overflow-x-hidden" dir="rtl">
                
                {/* Background spots */}
                <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#d5ede0] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#daf0e3] rounded-full blur-[100px] opacity-70 pointer-events-none" />

                {/* --- Admin Top Header Bar --- */}
                <header className="relative z-10 w-full bg-white/80 border-b border-slate-200 shadow-sm sticky top-0 backdrop-blur-sm shrink-0">
                    <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🛠️</span>
                            <h1 className="text-base font-bold text-slate-900">لوحة الإدارة - لعبة أسئلة</h1>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-xs font-semibold rounded-md"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                        >
                            <LogOut className="size-3.5 ml-1" />
                            {isLoggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}
                        </Button>
                    </div>
                </header>

                {/* --- Main Portal --- */}
                <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto p-4 space-y-4">

                    {/* Navigation Tabs (Responsive flex list) */}
                    <div className="flex flex-wrap gap-2 p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                        {(['questions', 'categories', 'players', 'parties'] as const).map((tab) => {
                            const label = 
                                tab === 'questions' ? 'الأسئلة 📝' :
                                tab === 'categories' ? 'الأقسام 📂' :
                                tab === 'players' ? 'اللاعبين 👥' : 'البارتيات 🎮';

                            const active = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); resetQuestionForm(); }}
                                    className={`flex-1 min-w-[90px] py-2 text-xs font-bold rounded-md transition duration-150 ${
                                        active 
                                            ? 'bg-slate-900 text-white shadow-sm' 
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* ======================================================= */}
                    {/*  TAB: QUESTIONS                                         */}
                    {/* ======================================================= */}
                    {activeTab === 'questions' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* Question Form Card */}
                            <Card className="bg-white border-slate-200 md:col-span-1 h-fit">
                                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        <Plus className="size-4 text-emerald-600" />
                                        {editingQuestion ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
                                    </CardTitle>
                                    <CardDescription className="text-[10px] text-slate-500">
                                        تعبئة بيانات السؤال مع إمكانية إرفاق صورة اختيارية.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <form onSubmit={handleSaveQuestion} className="space-y-4">
                                        
                                        {/* Category Select */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">قسم السؤال</Label>
                                            <select
                                                value={selectedCategoryId}
                                                onChange={(e) => setSelectedCategoryId(e.target.value)}
                                                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-800 px-3 outline-none focus:border-slate-400"
                                            >
                                                {categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Question Text */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">نص السؤال</Label>
                                            <textarea
                                                rows={3}
                                                placeholder="اكتب السؤال هنا..."
                                                value={questionText}
                                                onChange={(e) => setQuestionText(e.target.value)}
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-800 outline-none focus:border-slate-400 resize-none"
                                            />
                                        </div>

                                        {/* Correct Answer */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">الجواب الصحيح (يكتبه اللاعب)</Label>
                                            <Input
                                                type="text"
                                                placeholder="الجواب الصحيح..."
                                                value={correctAnswer}
                                                onChange={(e) => setCorrectAnswer(e.target.value)}
                                                className="h-9 bg-slate-50 border-slate-200 text-xs font-medium focus-visible:ring-slate-400"
                                            />
                                        </div>

                                        {/* Image Upload Option */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                                <ImageIcon className="size-3.5" />
                                                إرفاق صورة (اختياري)
                                            </Label>
                                            
                                            {imagePreview ? (
                                                <div className="relative size-24 rounded-lg border border-slate-200 overflow-hidden group">
                                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={handleClearImage}
                                                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px] font-bold"
                                                    >
                                                        حذف الصورة
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleImageChange}
                                                        accept="image/*"
                                                        className="hidden"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 border-slate-200 text-[10px] rounded-md font-semibold text-slate-600"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        اختر صورة...
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Choice Fields */}
                                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                                <HelpCircle className="size-3.5" />
                                                خيارات الإجابة (اختياري - لخيارات متعددة)
                                            </Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input type="text" placeholder="خيار أ..." value={choiceA} onChange={(e) => setChoiceA(e.target.value)} className="h-8 bg-slate-50 border-slate-200 text-[11px] font-medium" />
                                                <Input type="text" placeholder="خيار ب..." value={choiceB} onChange={(e) => setChoiceB(e.target.value)} className="h-8 bg-slate-50 border-slate-200 text-[11px] font-medium" />
                                                <Input type="text" placeholder="خيار ج..." value={choiceC} onChange={(e) => setChoiceC(e.target.value)} className="h-8 bg-slate-50 border-slate-200 text-[11px] font-medium" />
                                                <Input type="text" placeholder="خيار د..." value={choiceD} onChange={(e) => setChoiceD(e.target.value)} className="h-8 bg-slate-50 border-slate-200 text-[11px] font-medium" />
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                                            {editingQuestion && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 border-slate-200 text-xs text-slate-700"
                                                    onClick={resetQuestionForm}
                                                >
                                                    إلغاء التعديل
                                                </Button>
                                            )}
                                            <Button type="submit" size="sm" className="h-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4">
                                                {editingQuestion ? 'حفظ التحديث' : 'إنشاء السؤال'}
                                            </Button>
                                        </div>

                                    </form>
                                </CardContent>
                            </Card>

                            {/* Questions List Card */}
                            <Card className="bg-white border-slate-200 md:col-span-2">
                                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                            <List className="size-4 text-slate-600" />
                                            قائمة الأسئلة ({questions.length})
                                        </CardTitle>
                                        <CardDescription className="text-[10px] text-slate-500">
                                            جميع أسئلة اللعبة المضافة في قاعدة البيانات.
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                                        {questions.map((q) => (
                                            <div key={q.id} className="p-4 flex gap-3 hover:bg-slate-50/60 transition duration-150">
                                                
                                                {/* Thumbnail preview */}
                                                {q.image_path ? (
                                                    <img src={q.image_path} alt="Question" className="size-14 rounded-md object-cover border border-slate-200 shrink-0" />
                                                ) : (
                                                    <div className="size-14 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-lg shrink-0">
                                                        📝
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                                                            {q.category?.name || 'غير مصنف'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-semibold">#{q.id}</span>
                                                    </div>
                                                    
                                                    <p className="text-xs font-bold text-slate-800 mt-1.5 leading-relaxed">
                                                        {q.question_text}
                                                    </p>

                                                    <p className="text-[10px] font-semibold text-emerald-700 mt-1">
                                                        الجواب الصحيح: {q.correct_answer}
                                                    </p>

                                                    {q.choices && q.choices.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            {q.choices.map((ch, idx) => (
                                                                <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200/50">
                                                                    {ch}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-col gap-1 justify-center shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="size-7 p-0 text-slate-500 hover:text-slate-900 rounded-md"
                                                        onClick={() => handleEditQuestionClick(q)}
                                                    >
                                                        <Edit3 className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="size-7 p-0 text-slate-400 hover:text-red-600 rounded-md"
                                                        onClick={() => handleDeleteQuestion(q.id)}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>

                                            </div>
                                        ))}

                                        {questions.length === 0 && (
                                            <p className="text-center text-xs text-slate-400 font-medium py-12">
                                                لا توجد أسئلة مضافة حتى الآن.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                        </div>
                    )}

                    {/* ======================================================= */}
                    {/*  TAB: CATEGORIES                                       */}
                    {/* ======================================================= */}
                    {activeTab === 'categories' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* Category form */}
                            <Card className="bg-white border-slate-200 md:col-span-1 h-fit">
                                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        <FolderPlus className="size-4 text-emerald-600" />
                                        إضافة قسم جديد
                                    </CardTitle>
                                    <CardDescription className="text-[10px] text-slate-500">
                                        أدخل اسم القسم الجديد للبارتيات.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <form onSubmit={handleSaveCategory} className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">اسم القسم</Label>
                                            <Input
                                                type="text"
                                                placeholder="مثال: جغرافيا..."
                                                value={catName}
                                                onChange={(e) => setCatName(e.target.value)}
                                                className="h-9 bg-slate-50 border-slate-200 text-xs font-medium focus-visible:ring-slate-400"
                                            />
                                        </div>
                                        <Button type="submit" size="sm" className="w-full h-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md">
                                            حفظ القسم
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Categories list */}
                            <Card className="bg-white border-slate-200 md:col-span-2">
                                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        <List className="size-4 text-slate-600" />
                                        قائمة الأقسام المتاحة
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <table className="w-full text-right text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                                                <th className="p-3">#</th>
                                                <th className="p-3">اسم القسم</th>
                                                <th className="p-3">عدد الأسئلة</th>
                                                <th className="p-3 text-left">العمليات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {categories.map((cat, idx) => (
                                                <tr key={cat.id} className="hover:bg-slate-50/40">
                                                    <td className="p-3 font-semibold text-slate-400">{idx + 1}</td>
                                                    <td className="p-3 font-bold text-slate-800">
                                                        {editingCatId === cat.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="text"
                                                                    value={editingCatName}
                                                                    onChange={(e) => setEditingCatName(e.target.value)}
                                                                    className="h-7 w-40 bg-slate-50 border-slate-300 text-xs font-semibold"
                                                                />
                                                                <Button size="sm" className="h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px]" onClick={() => handleUpdateCategory(cat.id)}>
                                                                    تحديث
                                                                </Button>
                                                                <Button variant="outline" size="sm" className="h-7 px-3 text-[10px]" onClick={() => setEditingCatId(null)}>
                                                                    إلغاء
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            cat.name
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-slate-500 font-bold">{cat.questions_count || 0} سؤال</td>
                                                    <td className="p-3 text-left">
                                                        {editingCatId !== cat.id && (
                                                            <div className="inline-flex gap-1.5">
                                                                <Button variant="ghost" size="sm" className="size-7 p-0 text-slate-500 rounded-md" onClick={() => handleStartEditCategory(cat)}>
                                                                    <Edit3 className="size-3.5" />
                                                                </Button>
                                                                <Button variant="ghost" size="sm" className="size-7 p-0 text-slate-400 hover:text-red-650 rounded-md" onClick={() => handleDeleteCategory(cat.id)}>
                                                                    <Trash2 className="size-3.5" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>

                        </div>
                    )}

                    {/* ======================================================= */}
                    {/*  TAB: PLAYERS                                          */}
                    {/* ======================================================= */}
                    {activeTab === 'players' && (
                        <Card className="bg-white border-slate-200">
                            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <Users className="size-4 text-slate-600" />
                                    قائمة اللاعبين المسجلين في اللعبة ({players.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-right text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                                            <th className="p-3">معرف اللاعب (ID)</th>
                                            <th className="p-3">الصورة</th>
                                            <th className="p-3">الاسم المستعار</th>
                                            <th className="p-3">نوع الجلسة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {players.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/40">
                                                <td className="p-3 font-mono font-bold text-slate-900">#{p.id}</td>
                                                <td className="p-3">
                                                    {p.avatar_type === 'emoji' ? (
                                                        <div className="size-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm leading-none shrink-0">
                                                            {p.avatar_value}
                                                        </div>
                                                    ) : (
                                                        <img src={p.avatar_value} alt="avatar" className="size-7 rounded-full object-cover border border-slate-200 shrink-0" />
                                                    )}
                                                </td>
                                                <td className="p-3 font-bold text-slate-800">{p.nickname}</td>
                                                <td className="p-3 text-slate-500 font-medium">لاعب ضيف (Active)</td>
                                            </tr>
                                        ))}

                                        {players.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center text-xs text-slate-400 font-medium py-12">
                                                    لا يوجد لاعبون مسجلون حالياً.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}

                    {/* ======================================================= */}
                    {/*  TAB: PARTIES                                          */}
                    {/* ======================================================= */}
                    {activeTab === 'parties' && (
                        <Card className="bg-white border-slate-200">
                            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <List className="size-4 text-slate-600" />
                                    مراقبة البارتيات النشطة ({parties.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-right text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                                            <th className="p-3">كود الغرفة</th>
                                            <th className="p-3">اسم البارتي</th>
                                            <th className="p-3">القائد (Leader)</th>
                                            <th className="p-3">التصنيفات</th>
                                            <th className="p-3">الأعضاء</th>
                                            <th className="p-3">حالة الغرفة</th>
                                            <th className="p-3">الخصوصية</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {parties.map((prt) => (
                                            <tr key={prt.id} className="hover:bg-slate-50/40">
                                                <td className="p-3 font-mono font-bold text-slate-900 tracking-wider">{prt.code}</td>
                                                <td className="p-3 font-bold text-slate-800">{prt.name ?? 'بارتي افتراضي'}</td>
                                                <td className="p-3 font-semibold text-slate-700">{prt.leader_name}</td>
                                                <td className="p-3 text-slate-500">
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {prt.categories.map((cName, idx) => (
                                                            <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                                                {cName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-3 font-bold text-slate-600">{prt.players_count} لاعبين</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        prt.status === 'waiting' 
                                                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                    }`}>
                                                        {prt.status === 'waiting' ? 'بانتظار اللعب' : 'جاري اللعب'}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                        prt.is_public ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-650'
                                                    }`}>
                                                        {prt.is_public ? 'عام' : 'خاص بالكود'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}

                                        {parties.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="text-center text-xs text-slate-400 font-medium py-12">
                                                    لا توجد بارتيات نشطة حالياً.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}

                </main>
            </div>
        </>
    );
}
