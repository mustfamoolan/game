import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuestionProps {
    party: {
        id: number;
        code: string;
        leader_id: number;
        decisive_difficulty: string | null;
        question_started_at: string;
    };
    currentPlayer: { id: number; nickname: string };
    question: {
        id: number;
        question_text: string;
        image_path: string | null;
        choices: string[] | null;
        category_name: string;
        difficulty: string | null;
    };
    myBet: number;
    timeLeft: number;
}

const DIFF_LABEL: Record<string, string> = {
    easy: 'سهل 🟢', medium: 'متوسط 🟡', hard: 'صعب 🔴'
};

export default function DecisiveQuestion({
    party, currentPlayer, question, myBet, timeLeft: initialTimeLeft
}: QuestionProps) {
    const [answerText, setAnswerText]   = useState('');
    const [selectedChoice, setSelected] = useState<string | null>(null);
    const [timeLeft, setTimeLeft]       = useState(Math.floor(initialTimeLeft));
    const [isSaved, setIsSaved]         = useState(false);
    const isSubmittingRef               = useRef(false);

    const hasChoices = question.choices && question.choices.length > 0;

    // Sync timer with server on mount
    useEffect(() => {
        setTimeLeft(Math.floor(initialTimeLeft));
    }, [initialTimeLeft, question.id]);

    // Local countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                const cur = Math.floor(prev);
                if (cur <= 1) {
                    clearInterval(timer);
                    if (!isSubmittingRef.current) autoSubmit();
                    return 0;
                }
                return cur - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [question.id]);

    const doSubmit = (text: string) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSaved(true);
        router.post(`/game/${party.code}/decisive/answer`, {
            question_id: question.id,
            answer_text: text,
        }, {
            onFinish: () => router.visit(`/game/${party.code}/decisive/results`),
        });
    };

    const autoSubmit = () => {
        const text = hasChoices ? (selectedChoice ?? '') : answerText.trim();
        doSubmit(text);
    };

    const handleSave = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const text = hasChoices ? (selectedChoice ?? '') : answerText.trim();
        doSubmit(text);
    };

    const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const ss = String(timeLeft % 60).padStart(2, '0');

    return (
        <>
            <Head title="سؤال الحاسم" />
            <div className="h-screen flex flex-col bg-[#ecf7f1] select-none font-sans relative overflow-hidden" dir="rtl">

                {/* Background Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#d5ede0] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#daf0e3] rounded-full blur-[100px] opacity-70 pointer-events-none" />

                {/* Header */}
                <header className="relative z-10 shrink-0 w-full max-w-md mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
                    <div className="bg-white/80 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                        ⚡ الحاسم • {DIFF_LABEL[question.difficulty ?? 'medium']}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">
                        <Clock className="size-3.5 animate-pulse text-amber-400" />
                        <span>{mm}:{ss}</span>
                    </div>
                </header>

                {/* Body — scrollable */}
                <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6 max-w-md w-full mx-auto space-y-4 min-h-0">

                    {/* Bet indicator */}
                    <div className="flex items-center justify-center gap-2 py-2 bg-white/70 border border-slate-200 rounded-xl shadow-sm text-xs font-bold text-slate-700">
                        🎲 رهانك على هذا السؤال:
                        <span className="bg-slate-900 text-white px-2.5 py-0.5 rounded-full">{myBet} نقطة</span>
                    </div>

                    {/* Question Card */}
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                                {question.category_name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold">
                                سؤال الحاسم 🔥
                            </span>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-3">
                            <h2 className="text-base font-bold text-slate-800 leading-relaxed">
                                {question.question_text}
                            </h2>
                            {question.image_path && (
                                <div className="w-full max-h-40 rounded-lg overflow-hidden border border-slate-100">
                                    <img src={`/storage/${question.image_path}`} alt="سؤال" className="w-full h-full object-cover" />
                                </div>
                            )}
                            {/* Multiple choice options */}
                            {hasChoices && (
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    {question.choices!.map((choice, i) => {
                                        const isSelected = selectedChoice === choice;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => !isSaved && setSelected(choice)}
                                                className={`p-2.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition duration-150 text-right
                                                    ${isSelected
                                                        ? 'bg-slate-900 border-slate-950 text-white ring-2 ring-slate-950/20'
                                                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                                                    ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    {String.fromCharCode(65 + i)}
                                                </span>
                                                <span className="truncate">{choice}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Answer text field (only if no choices) */}
                    {!hasChoices && (
                        <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-4">
                            <form onSubmit={handleSave} className="space-y-3">
                                <div className="relative">
                                    <Input
                                        type="text"
                                        placeholder="اكتب إجابتك هنا..."
                                        value={answerText}
                                        disabled={isSaved}
                                        onChange={e => {
                                            setAnswerText(e.target.value);
                                        }}
                                        className="h-12 bg-slate-50 border-slate-200 text-sm font-bold text-slate-800 rounded-xl pr-4 pl-10 focus-visible:ring-emerald-500"
                                    />
                                    {isSaved && (
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600">
                                            <CheckCircle2 className="size-5" />
                                        </div>
                                    )}
                                </div>
                                {answerText.trim() !== '' && !isSaved && (
                                    <Button
                                        type="submit"
                                        className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition duration-150"
                                    >
                                        حفظ الإجابة 💾
                                    </Button>
                                )}
                            </form>
                        </Card>
                    )}

                    {/* Save button for multiple choice */}
                    {hasChoices && selectedChoice && !isSaved && (
                        <Button
                            onClick={() => handleSave()}
                            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition duration-150"
                        >
                            حفظ الإجابة 💾
                        </Button>
                    )}

                    {isSaved && (
                        <div className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <CheckCircle2 className="size-4 text-emerald-600" />
                            <p className="text-xs font-bold text-emerald-700">تم حفظ إجابتك! بانتظار الآخرين...</p>
                        </div>
                    )}

                    <div className="h-2" />
                </div>
            </div>
        </>
    );
}
