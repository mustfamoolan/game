import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PartyData {
    id: number;
    code: string;
    leader_id: number;
    status: string;
    current_question_index: number;
    total_questions: number;
    question_started_at: string;
}

interface QuestionData {
    id: number;
    question_text: string;
    image_path: string | null;
    choices: string[] | null;
    category_name: string;
}

interface MyAnswer {
    answer_text: string | null;
    bet_points: number | null;
}

interface UsedBet {
    points: number;
    is_correct: boolean;
}

interface QuestionProps {
    party: PartyData;
    currentPlayer: { id: number; nickname: string; avatar_type: string; avatar_value: string };
    question: QuestionData;
    myAnswer: MyAnswer | null;
    usedBets: UsedBet[];
    timeLeft: number;
}

export default function Question({
    party, currentPlayer, question, myAnswer, usedBets, timeLeft: initialTimeLeft,
}: QuestionProps) {
    const [answerText, setAnswerText] = useState(myAnswer?.answer_text ?? '');
    // selectedBet is LOCAL only — not sent until the user clicks "حفظ الإجابة"
    const [selectedBet, setSelectedBet] = useState<number | null>(myAnswer?.bet_points ?? null);
    const [timeLeft, setTimeLeft]       = useState(Math.floor(initialTimeLeft));
    const [isSaved, setIsSaved]         = useState(!!myAnswer?.answer_text);
    const isSubmittingRef               = useRef(false);

    // Sync timer from server
    useEffect(() => {
        setTimeLeft(Math.floor(initialTimeLeft));
    }, [initialTimeLeft, question.id]);

    // Reset on new question
    useEffect(() => {
        setAnswerText(myAnswer?.answer_text ?? '');
        setSelectedBet(myAnswer?.bet_points ?? null);
        setIsSaved(!!myAnswer?.answer_text);
        isSubmittingRef.current = false;
    }, [question.id]);

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

    // Poll party status every 4s
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['party', 'timeLeft'],
                onSuccess: (page) => {
                    const p = page.props.party as PartyData;
                    if (p.status === 'finished') router.visit(`/game/${party.code}/end`);
                }
            });
        }, 4000);
        return () => clearInterval(interval);
    }, [party.code]);

    // ── Submit helpers ──────────────────────────────────────────────────
    const doSubmit = (text: string, bet: number | null) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSaved(true);
        router.post(`/game/${party.code}/answer`, {
            question_id: question.id,
            answer_text: text,
            bet_points:  bet,
        }, {
            preserveScroll: true,
            onError: () => {
                // On error allow retry
                isSubmittingRef.current = false;
                setIsSaved(false);
            },
        });
    };

    const autoSubmit = () => {
        router.post(`/game/${party.code}/answer`, {
            question_id: question.id,
            answer_text: answerText,
            bet_points:  selectedBet,
        }, {
            onFinish: () => router.visit(`/game/${party.code}/results`),
        });
    };

    // Called when user explicitly presses "حفظ الإجابة"
    const handleSaveAnswer = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!answerText.trim() && selectedBet === null) return;
        doSubmit(answerText.trim(), selectedBet);
    };

    // Just select bet locally — no network call
    const handleSelectBet = (points: number) => {
        const isUsed = usedBets.some(b => b.points === points);
        if (isUsed || isSaved) return;
        setSelectedBet(prev => prev === points ? null : points); // toggle off if same
    };

    const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const ss = String(timeLeft % 60).padStart(2, '0');

    const canSave = !isSaved && (answerText.trim() !== '' || selectedBet !== null);

    return (
        <>
            <Head title={`السؤال ${party.current_question_index} - لعبة أسئلة`} />
            <div className="h-screen flex flex-col bg-[#ecf7f1] select-none font-sans relative overflow-hidden" dir="rtl">

                {/* Background Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#d5ede0] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#daf0e3] rounded-full blur-[100px] opacity-70 pointer-events-none" />

                {/* Header */}
                <header className="relative z-10 shrink-0 w-full max-w-md mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
                    <div className="bg-white/80 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                        السؤال {party.current_question_index} / {party.total_questions}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">
                        <Clock className="size-3.5 animate-pulse text-amber-400" />
                        <span>{mm}:{ss}</span>
                    </div>
                </header>

                {/* Body */}
                <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6 max-w-md w-full mx-auto space-y-4 min-h-0">

                    {/* Question Card */}
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                                {question.category_name}
                            </span>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-3">
                            <h2 className="text-base font-bold text-slate-800 leading-relaxed">
                                {question.question_text}
                            </h2>
                            {question.image_path && (
                                <div className="w-full max-h-40 rounded-lg overflow-hidden border border-slate-100">
                                    <img src={question.image_path} alt="Question Graphic" className="w-full h-full object-cover" />
                                </div>
                            )}
                            {question.choices && question.choices.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    {question.choices.map((choice, i) => (
                                        <div key={i} className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                            <span className="size-5 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-bold text-slate-500 shrink-0">
                                                {String.fromCharCode(65 + i)}
                                            </span>
                                            <span className="truncate">{choice}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Answer + Save */}
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-4">
                        <form onSubmit={handleSaveAnswer} className="space-y-3">
                            <div className="relative">
                                <Input
                                    type="text"
                                    placeholder="اكتب إجابتك هنا..."
                                    value={answerText}
                                    disabled={isSaved}
                                    onChange={e => {
                                        setAnswerText(e.target.value);
                                        setIsSaved(false);
                                    }}
                                    className="h-12 bg-slate-50 border-slate-200 text-sm font-bold text-slate-800 rounded-xl pr-4 pl-10 focus-visible:ring-emerald-500"
                                />
                                {isSaved && (
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600">
                                        <CheckCircle2 className="size-5" />
                                    </div>
                                )}
                            </div>

                            {/* Save button — appears when answer or bet is chosen and not yet saved */}
                            {canSave && (
                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition duration-150"
                                >
                                    حفظ الإجابة والرهان 💾
                                </Button>
                            )}

                            {isSaved && (
                                <p className="text-xs text-emerald-600 font-bold text-center flex items-center justify-center gap-1.5">
                                    <CheckCircle2 className="size-4" />
                                    تم حفظ إجابتك ✓
                                </p>
                            )}
                        </form>
                    </Card>

                    {/* Bet selector grid */}
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                        <CardHeader className="pb-2 pt-3 px-4">
                            <CardTitle className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                <span>اختر رهانك على هذا السؤال</span>
                                {selectedBet !== null && !isSaved && (
                                    <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold">
                                        الرهان: {selectedBet} ن
                                    </span>
                                )}
                                {isSaved && selectedBet !== null && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                                        رهانك: {selectedBet} ن ✓
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="grid grid-cols-5 gap-2">
                                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => {
                                    const usedBetItem = usedBets.find(b => b.points === num);
                                    const isUsed      = !!usedBetItem;
                                    const isSelected  = selectedBet === num;
                                    const isSavedBet  = isSaved && selectedBet === num;

                                    // Color logic:
                                    // - used in PAST rounds: green (correct) or red (wrong) — locked
                                    // - selected in THIS round (not yet saved): black selected style
                                    // - saved in THIS round: emerald green (confirmed)
                                    // - default: light grey
                                    let btnCls = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';

                                    if (isUsed && !isSavedBet) {
                                        // Already used in a previous question
                                        btnCls = usedBetItem!.is_correct
                                            ? 'bg-emerald-500 border-emerald-600 text-white cursor-not-allowed'
                                            : 'bg-red-400 border-red-500 text-white cursor-not-allowed';
                                    } else if (isSavedBet) {
                                        // This is the saved bet for current question
                                        btnCls = 'bg-emerald-600 border-emerald-700 text-white ring-2 ring-emerald-400/40 cursor-not-allowed';
                                    } else if (isSelected) {
                                        // Highlighted / pending (not yet saved)
                                        btnCls = 'bg-slate-900 border-slate-950 text-white ring-2 ring-slate-950/20';
                                    }

                                    const disabled = isUsed || isSaved;

                                    return (
                                        <button
                                            key={num}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => handleSelectBet(num)}
                                            className={`h-9 border rounded-lg font-bold text-xs flex items-center justify-center transition duration-150 ${btnCls}`}
                                        >
                                            {num}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold text-center mt-3">
                                💡 اختر رهانك ثم اضغط "حفظ الإجابة والرهان" — كل رقم مرة واحدة فقط طوال 20 سؤال
                            </p>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </>
    );
}
