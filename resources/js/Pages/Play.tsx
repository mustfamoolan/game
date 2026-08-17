import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { PlusCircle, LogIn, Settings, Upload, User, Sparkles, Users, Lock, Globe, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';

// Emoji avatar list
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

interface Category {
    id: number;
    name: string;
}

interface PublicParty {
    id: number;
    code: string;
    name: string | null;
    leader: {
        nickname: string;
        avatar_type: string;
        avatar_value: string;
    };
    categories: Category[];
    player_count: number;
}

interface PlayerData {
    id: number;
    nickname: string;
    avatar_type: 'emoji' | 'upload';
    avatar_value: string;
}

interface PlayProps {
    player: PlayerData;
    publicParties: PublicParty[];
    categories: Category[];
}

// OTP Input Component
function OtpCodeInput({ onComplete, error }: { onComplete: (code: string) => void; error?: string }) {
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const inputs = useRef<Array<HTMLInputElement | null>>([]);

    const handleChange = (idx: number, val: string) => {
        const digit = val.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[idx] = digit;
        setDigits(next);

        if (digit && idx < 5) {
            inputs.current[idx + 1]?.focus();
        }

        // Auto-submit when all filled
        const full = next.join('');
        if (full.length === 6 && !next.includes('')) {
            onComplete(full);
        }
    };

    const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (digits[idx] === '' && idx > 0) {
                inputs.current[idx - 1]?.focus();
            } else {
                const next = [...digits];
                next[idx] = '';
                setDigits(next);
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setDigits(pasted.split(''));
            inputs.current[5]?.focus();
            onComplete(pasted);
        }
        e.preventDefault();
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-center gap-2" dir="ltr">
                {digits.map((d, idx) => (
                    <input
                        key={idx}
                        ref={(el) => { inputs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        className={`w-11 h-12 text-center text-xl font-bold rounded-lg border-2 outline-none transition-all duration-150 bg-slate-50 text-slate-900 focus:border-slate-900 focus:bg-white ${
                            error ? 'border-red-400 bg-red-50' : 'border-slate-200'
                        }`}
                    />
                ))}
            </div>
            {error && (
                <p className="text-center text-xs text-red-600 font-semibold">{error}</p>
            )}
        </div>
    );
}

// Avatar display helper
function AvatarDisplay({ type, value, size = 'sm' }: { type: string; value: string; size?: 'sm' | 'md' }) {
    const cls = size === 'md' ? 'size-10' : 'size-7';
    if (type === 'emoji') {
        return (
            <div className={`${cls} flex items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-lg leading-none`}>
                {value}
            </div>
        );
    }
    return (
        <img
            src={value}
            alt="avatar"
            className={`${cls} rounded-full object-cover border border-slate-200`}
        />
    );
}

export default function Play({ player, publicParties, categories }: PlayProps) {
    // Settings modal state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [nickname, setNickname] = useState(player.nickname);
    const [avatarType, setAvatarType] = useState(player.avatar_type);
    const [avatarValue, setAvatarValue] = useState(player.avatar_value);
    const [settingsError, setSettingsError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Join modal state
    const [isJoinOpen, setIsJoinOpen] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    // Create modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [partyName, setPartyName] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [createError, setCreateError] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        setNickname(player.nickname);
        setAvatarType(player.avatar_type);
        setAvatarValue(player.avatar_value);
    }, [player]);

    // --- Settings Handlers ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const max_size = 120;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > max_size) { height *= max_size / width; width = max_size; }
                } else {
                    if (height > max_size) { width *= max_size / height; height = max_size; }
                }
                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                setAvatarType('upload');
                setAvatarValue(compressedBase64);
                setIsUploading(false);
            };
        };
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname.trim()) { setSettingsError('الرجاء إدخال الاسم المستعار!'); return; }
        if (nickname.trim().length < 3) { setSettingsError('الاسم المستعار يجب أن يكون 3 حروف على الأقل.'); return; }
        setSettingsError('');
        router.post('/players/update', {
            nickname: nickname.trim(),
            avatar_type: avatarType,
            avatar_value: avatarValue,
        }, {
            onSuccess: () => setIsSettingsOpen(false),
            onError: (errors) => { if (errors.nickname) setSettingsError(errors.nickname); },
        });
    };

    // --- Join Party Handler ---
    const handleJoinByCode = (code: string) => {
        setIsJoining(true);
        setJoinError('');
        router.post('/parties/join-code', { code }, {
            onError: (errors) => {
                setJoinError(errors.code || 'الكود غير صحيح أو البارتي بدأ بالفعل.');
                setIsJoining(false);
            },
        });
    };

    const handleJoinPublic = (id: number) => {
        router.post(`/parties/join-public/${id}`, {});
    };

    // --- Create Party Handler ---
    const toggleCategory = (id: number) => {
        setSelectedCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleCreateParty = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCategories.length === 0) {
            setCreateError('الرجاء اختيار قسم واحد على الأقل.');
            return;
        }
        setCreateError('');
        setIsCreating(true);
        router.post('/parties/create', {
            name: partyName.trim() || null,
            is_public: isPublic,
            category_ids: selectedCategories,
        }, {
            onError: (errors) => {
                setCreateError(Object.values(errors).join(' '));
                setIsCreating(false);
            },
        });
    };

    return (
        <>
            <Head title="ساحة اللعب - لعبة أسئلة" />
            <div className="min-h-screen flex flex-col bg-[#ecf7f1] select-none font-sans relative overflow-hidden" dir="rtl">

                {/* Background spots */}
                <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#d5ede0] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#daf0e3] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute top-[30%] right-[15%] w-[280px] h-[280px] bg-[#e1f5eb] rounded-full blur-[90px] opacity-80 pointer-events-none" />

                {/* Floating Settings Button */}
                <div className="absolute top-4 right-4 z-20">
                    <Button
                        type="button"
                        variant="outline"
                        className="size-10 p-0 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-md flex items-center justify-center transition duration-150 shadow-sm"
                        onClick={() => setIsSettingsOpen(true)}
                    >
                        <Settings className="size-5" />
                    </Button>
                </div>

                {/* Logo Section */}
                <div className="flex-1 flex items-center justify-center p-6 min-h-[45vh]">
                    <div className="w-full max-w-[280px] aspect-square flex items-center justify-center">
                        <img
                            src="/images/logo.png"
                            alt="Logo"
                            className="w-full h-full object-contain filter drop-shadow-md rounded-lg"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallbackEl = e.currentTarget.parentElement?.querySelector('.logo-fallback');
                                if (fallbackEl) fallbackEl.classList.remove('hidden');
                            }}
                        />
                        <div className="logo-fallback hidden flex items-center justify-center w-28 h-28 rounded-lg bg-white border border-slate-200 text-slate-800 text-5xl shadow-sm">
                            🎮
                        </div>
                    </div>
                </div>

                {/* Bottom Card */}
                <div className="w-full max-w-sm mx-auto px-4 pb-6 mt-auto">
                    <Card className="w-full bg-white border border-slate-200 shadow-sm rounded-lg p-1 relative z-10">
                        <CardHeader className="text-center space-y-1 pb-4">
                            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">ساحة اللعب</CardTitle>
                            {player && (
                                <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-xs font-semibold text-slate-600 mt-2 mx-auto">
                                    {player.avatar_type === 'emoji' ? (
                                        <span className="text-lg">{player.avatar_value}</span>
                                    ) : (
                                        <img src={player.avatar_value} alt={player.nickname} className="size-5 rounded-full object-cover border border-slate-200" />
                                    )}
                                    <span>{player.nickname}</span>
                                </div>
                            )}
                        </CardHeader>

                        <CardContent className="space-y-3">
                            <Button
                                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md flex items-center justify-center gap-1.5 border-0 transition duration-150"
                                onClick={() => { setIsCreateOpen(true); setCreateError(''); setSelectedCategories([]); setPartyName(''); setIsPublic(false); }}
                            >
                                <PlusCircle className="size-4 ml-1" />
                                إنشاء بارتي
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-md flex items-center justify-center gap-1.5 transition duration-150"
                                onClick={() => { setIsJoinOpen(true); setJoinError(''); }}
                            >
                                <LogIn className="size-4 ml-1" />
                                دخول بارتي
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* ====== JOIN PARTY MODAL ====== */}
                <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
                    <DialogContent className="max-w-sm bg-white border border-slate-200 text-slate-900 rounded-lg p-5 shadow-lg select-none" dir="rtl">
                        <DialogHeader className="text-right pb-3 border-b border-slate-100">
                            <DialogTitle className="text-lg font-bold text-slate-900">دخول بارتي</DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 mt-1">
                                أدخل كود البارتي المكون من 6 أرقام
                            </DialogDescription>
                        </DialogHeader>

                        <div className="pt-4 space-y-5">
                            {/* OTP Inputs */}
                            <OtpCodeInput onComplete={handleJoinByCode} error={joinError} />

                            {isJoining && (
                                <p className="text-center text-xs text-slate-500 font-medium animate-pulse">
                                    جاري البحث عن البارتي...
                                </p>
                            )}

                            {/* Public Parties List */}
                            {publicParties.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        <Globe className="size-3" />
                                        البارتيات المتاحة
                                    </div>
                                    <div className="space-y-2 max-h-52 overflow-y-auto">
                                        {publicParties.map((party) => (
                                            <button
                                                key={party.id}
                                                onClick={() => handleJoinPublic(party.id)}
                                                className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-lg text-right transition-all duration-150 group"
                                            >
                                                {/* Leader avatar */}
                                                <AvatarDisplay type={party.leader.avatar_type} value={party.leader.avatar_value} size="md" />

                                                {/* Party info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate">
                                                        {party.name || `بارتي ${party.leader.nickname}`}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {party.categories.map((c) => (
                                                            <span key={c.id} className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-medium">
                                                                {c.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Player count */}
                                                <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold shrink-0">
                                                    <Users className="size-3.5" />
                                                    {party.player_count}
                                                    <ChevronRight className="size-3 text-slate-400 group-hover:text-slate-600 transition" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {publicParties.length === 0 && (
                                <p className="text-center text-xs text-slate-400 font-medium py-2">
                                    لا توجد بارتيات عامة متاحة الآن
                                </p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ====== CREATE PARTY MODAL ====== */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="max-w-sm bg-white border border-slate-200 text-slate-900 rounded-lg p-5 shadow-lg select-none" dir="rtl">
                        <DialogHeader className="text-right pb-3 border-b border-slate-100">
                            <DialogTitle className="text-lg font-bold text-slate-900">إنشاء بارتي جديد</DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 mt-1">
                                ستصبح قائد المجموعة وتتحكم في بدء اللعبة
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateParty} className="pt-4 space-y-4">

                            {/* Party Name */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">اسم البارتي (اختياري)</Label>
                                <Input
                                    type="text"
                                    placeholder="مثال: فريق النجوم..."
                                    value={partyName}
                                    onChange={(e) => setPartyName(e.target.value)}
                                    className="h-10 bg-slate-50 border-slate-200 text-slate-900 rounded-md placeholder:text-slate-400 text-right font-medium focus-visible:ring-1 focus-visible:ring-slate-950"
                                    maxLength={40}
                                />
                            </div>

                            {/* Privacy Toggle */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">نوع البارتي</Label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setIsPublic(true)}
                                        className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition duration-150 ${
                                            isPublic ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <Globe className="size-3.5" />
                                        عام
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsPublic(false)}
                                        className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition duration-150 ${
                                            !isPublic ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <Lock className="size-3.5" />
                                        خاص بالكود
                                    </button>
                                </div>
                            </div>

                            {/* Categories Multi-select */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">
                                    أقسام الأسئلة
                                    <span className="text-slate-400 font-normal mr-1">(اختر واحداً أو أكثر)</span>
                                </Label>
                                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    {categories.map((cat) => {
                                        const selected = selectedCategories.includes(cat.id);
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => toggleCategory(cat.id)}
                                                className={`text-xs font-semibold px-3 py-1.5 rounded-md border transition-all duration-150 ${
                                                    selected
                                                        ? 'bg-slate-900 text-white border-slate-900'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                                }`}
                                            >
                                                {cat.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {createError && (
                                <p className="text-xs text-red-600 font-semibold text-center">{createError}</p>
                            )}

                            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-md px-4">
                                        إلغاء
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md px-5"
                                    disabled={isCreating}
                                >
                                    {isCreating ? 'جاري الإنشاء...' : 'إنشاء البارتي 🎮'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ====== SETTINGS MODAL ====== */}
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogContent className="max-w-sm bg-white border border-slate-200 text-slate-900 rounded-lg p-5 shadow-lg select-none" dir="rtl">
                        <DialogHeader className="text-right pb-3 border-b border-slate-100">
                            <DialogTitle className="text-lg font-bold text-slate-900">تعديل الملف الشخصي</DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-semibold mt-1">
                                معرّف اللاعب الخاص بك: <span className="text-slate-950 font-bold">#{player.id}</span>
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSaveSettings} className="space-y-4 pt-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 justify-start">
                                    <User className="size-3.5 text-slate-500" />
                                    الاسم المستعار
                                </Label>
                                <Input
                                    type="text"
                                    placeholder="اكتب اسمك..."
                                    value={nickname}
                                    onChange={(e) => { setNickname(e.target.value); if (settingsError) setSettingsError(''); }}
                                    className="h-10 bg-slate-50 border-slate-200 text-slate-900 rounded-md placeholder:text-slate-400 text-center font-medium focus-visible:ring-1 focus-visible:ring-slate-950"
                                    maxLength={15}
                                />
                                {settingsError && (
                                    <p className="text-[11px] text-red-600 text-center font-semibold mt-1">{settingsError}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 justify-start">
                                    <Sparkles className="size-3.5 text-slate-500" />
                                    صورة الملف الشخصي
                                </Label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                                    <button type="button" className={`py-1.5 text-xs font-semibold rounded-md transition duration-150 ${avatarType === 'emoji' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`} onClick={() => setAvatarType('emoji')}>رمز تعبيري</button>
                                    <button type="button" className={`py-1.5 text-xs font-semibold rounded-md transition duration-150 ${avatarType === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`} onClick={() => { setAvatarType('upload'); if (avatarType !== 'upload') { setAvatarValue(player.avatar_type === 'upload' ? player.avatar_value : ''); } }}>رفع من الأستوديو</button>
                                </div>

                                {avatarType === 'emoji' ? (
                                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 max-h-36 overflow-y-auto scrollbar-thin">
                                        {AVATARS.map((item) => (
                                            <button key={item.emoji} type="button" onClick={() => { setAvatarType('emoji'); setAvatarValue(item.emoji); }} className={`h-9 text-xl flex items-center justify-center rounded-md border transition duration-150 ${avatarType === 'emoji' && avatarValue === item.emoji ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'}`} title={item.label}>
                                                {item.emoji}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                                        <div className="size-14 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center overflow-hidden">
                                            {avatarValue && avatarValue.startsWith('data:image') ? (
                                                <img src={avatarValue} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl">🎮</span>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                                        <Button type="button" variant="outline" size="sm" className="h-8 border-slate-200 text-xs font-semibold rounded-md flex items-center gap-1" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                            <Upload className="size-3.5" />
                                            {isUploading ? 'جاري الرفع والضغط...' : 'اختر صورة من الأستوديو'}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-md px-4">إلغاء</Button>
                                </DialogClose>
                                <Button type="submit" className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md px-5" disabled={isUploading}>
                                    حفظ التغييرات
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

            </div>
        </>
    );
}
