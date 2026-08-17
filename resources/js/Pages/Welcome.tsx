import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { Gamepad2, Sparkles, User, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

// Default avatar selections
const AVATARS = [
    { emoji: '🦁', label: 'أسد' },
    { emoji: '🦊', label: 'ثعلب' },
    { emoji: '🐼', label: 'باندا' },
    { emoji: '🐸', label: 'ضفدع' },
    { emoji: '🐨', label: 'كوالا' },
    { emoji: '🐯', label: 'نمر' },
    { emoji: '🐙', label: 'أخطبوط' },
    { emoji: '🦄', label: 'وحيد القرن' },
    { emoji: '🐱', label: 'قطة' },
    { emoji: '🐵', label: 'قرد' },
    { emoji: '🐧', label: 'بطريق' },
    { emoji: '🦉', label: 'بومة' },
    { emoji: '🐝', label: 'نحلة' },
    { emoji: '🦕', label: 'ديناصور' },
    { emoji: '🦀', label: 'سلطعون' },
    { emoji: '🐔', label: 'دجاجة' },
    { emoji: '🦖', label: 'تيركس' },
    { emoji: '🐬', label: 'دولفين' },
    { emoji: '🦋', label: 'فراشة' },
    { emoji: '🐰', label: 'أرنب' },
    { emoji: '🐹', label: 'هامستر' },
    { emoji: '🐻', label: 'دب' },
    { emoji: '🐶', label: 'كلب' },
    { emoji: '🐷', label: 'خنزير' },
];

export default function Welcome() {
    const [username, setUsername] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].emoji);
    const [error, setError] = useState('');

    useEffect(() => {
        // Retrieve saved user info if present
        const storedName = localStorage.getItem('game_username');
        const storedAvatar = localStorage.getItem('game_avatar');
        if (storedName) setUsername(storedName);
        if (storedAvatar) setSelectedAvatar(storedAvatar);
    }, []);

    const handlePlay = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!username.trim()) {
            setError('الرجاء إدخال اسمك المستعار أولاً!');
            return;
        }

        if (username.trim().length < 3) {
            setError('الاسم المستعار يجب أن يكون 3 حروف على الأقل.');
            return;
        }

        setError('');
        
        router.post('/players/register', {
            nickname: username.trim(),
            avatar_type: 'emoji',
            avatar_value: selectedAvatar,
        }, {
            onError: (errors) => {
                if (errors.nickname) {
                    setError(errors.nickname);
                }
            }
        });
    };

    return (
        <>
            <Head title="الصفحة الرئيسية - لعبة أسئلة" />
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#ecf7f1] px-4 py-12 select-none font-sans relative overflow-hidden" dir="rtl">
                
                {/* Subtle soft green spots/radial gradients for calm aesthetic */}
                <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#d5ede0] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#daf0e3] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute top-[30%] right-[15%] w-[280px] h-[280px] bg-[#e1f5eb] rounded-full blur-[90px] opacity-80 pointer-events-none" />

                {/* Standard shadcn UI card - Clean white, sharp borders, soft shadows */}
                <Card className="w-full max-w-sm bg-white border border-slate-200 shadow-sm rounded-lg p-1 relative z-10">
                    
                    {/* Header Section */}
                    <CardHeader className="text-center space-y-1.5 pb-4">
                        <div className="flex size-14 items-center justify-center rounded-lg bg-slate-900 text-white mx-auto shadow-sm text-3xl transition-all duration-200">
                            {selectedAvatar}
                        </div>
                        <CardTitle className="text-xl font-bold tracking-tight text-slate-900 mt-2">لعبة أسئلة</CardTitle>
                    </CardHeader>

                    {/* Content Section */}
                    <CardContent className="space-y-6">
                        <form onSubmit={handlePlay} className="space-y-5">
                            
                            {/* Username Input using standard shadcn styling */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 justify-start">
                                    <User className="size-3.5 text-slate-500" />
                                    الاسم المستعار
                                </Label>
                                <Input
                                    type="text"
                                    placeholder="اكتب اسمك هنا..."
                                    value={username}
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        if (error) setError('');
                                    }}
                                    className="h-10 bg-slate-50 border-slate-200 text-slate-900 rounded-md placeholder:text-slate-400 text-center font-medium focus-visible:ring-1 focus-visible:ring-slate-950"
                                    maxLength={15}
                                />
                                {error && (
                                    <p className="text-[11px] text-red-600 text-center font-semibold mt-1">{error}</p>
                                )}
                            </div>

                            {/* Avatar Picker with clean borders */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 justify-start">
                                    <Sparkles className="size-3.5 text-slate-500" />
                                    اختر شخصيتك
                                </Label>
                                
                                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    {AVATARS.map((item) => (
                                        <button
                                            key={item.emoji}
                                            type="button"
                                            onClick={() => setSelectedAvatar(item.emoji)}
                                            className={`h-11 text-2xl flex items-center justify-center rounded-md border transition duration-150 ${
                                                selectedAvatar === item.emoji
                                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                            }`}
                                            title={item.label}
                                        >
                                            {item.emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Submit Button using standard primary styling */}
                            <Button
                                type="submit"
                                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-md shadow-sm flex items-center justify-center gap-1.5 border-0 transition duration-150"
                            >
                                <Gamepad2 className="size-4 ml-1" />
                                العب الآن
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
