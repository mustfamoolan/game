import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { Crown, Check, X, ArrowLeftRight, Clock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlayerResult {
    id: number;
    nickname: string;
    avatar_type: string;
    avatar_value: string;
    is_leader: boolean;
    has_answered: boolean;
    answer_text: string | null;
    bet_points: number | null;
    is_correct: boolean;
    answer_id: number | null;
    total_score: number;
}

interface PartyData {
    id: number;
    code: string;
    leader_id: number;
    current_question_index: number;
    total_questions: number;
}

interface ResultsProps {
    party: PartyData;
    currentPlayer: {
        id: number;
        nickname: string;
    };
    question: {
        id: number;
        question_text: string;
        correct_answer: string | null;
        image_path: string | null;
    };
    playerResults: PlayerResult[];
    isLastQuestion: boolean;
    timeLeft: number;
}

function Avatar({ type, value }: { type: string; value: string }) {
    if (type === 'emoji') {
        return (
            <div className="size-8 flex items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-base leading-none shrink-0">
                {value}
            </div>
        );
    }
    return (
        <img src={value} alt="avatar" className="size-8 rounded-full object-cover border border-slate-200 shrink-0" />
    );
}

export default function Results({
    party,
    currentPlayer,
    question,
    playerResults,
    isLastQuestion,
    timeLeft: initialTimeLeft,
}: ResultsProps) {
    const isLeader = currentPlayer.id === party.leader_id;
    const [timeLeft, setTimeLeft] = useState(Math.floor(initialTimeLeft));

    // Timer Sync
    useEffect(() => {
        setTimeLeft(Math.floor(initialTimeLeft));
    }, [initialTimeLeft]);

    // Local countdown ticker (runs every 1s to tick down smoothly)
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                const current = Math.floor(prev);
                if (current <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [question.id]);

    // Unified Polling & Countdown sync (every 3.5s for updates)
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['party', 'playerResults', 'timeLeft', 'question'],
                onSuccess: (page) => {
                    const partyData = page.props.party as PartyData;
                    // If decisive phase kicked in, go to decisive vote page
                    if ((partyData as any).status === 'decisive') {
                        router.visit(`/game/${party.code}/decisive/vote`);
                        return;
                    }
                    if ((partyData as any).status === 'finished') {
                        router.visit(`/game/${party.code}/end`);
                        return;
                    }
                    // If the index changed, redirect to the next question page
                    if (partyData.current_question_index !== party.current_question_index) {
                        router.visit(`/game/${party.code}`);
                    }
                    // Sync local countdown with server to ensure accuracy
                    const newTimeLeft = page.props.timeLeft as number;
                    if (newTimeLeft !== undefined) {
                        setTimeLeft(Math.floor(newTimeLeft));
                    }
                }
            });
        }, 1500);
        return () => clearInterval(interval);
    }, [party.current_question_index, party.code]);

    const handleToggleCorrect = (answerId: number) => {
        if (!isLeader) return;
        router.post(`/game/${party.code}/mark/${answerId}`, {}, {
            preserveScroll: true,
        });
    };

    const handleNextQuestion = () => {
        if (!isLeader) return;
        if (isLastQuestion) {
            router.post(`/game/${party.code}/decisive/start-voting`);
        } else {
            router.post(`/game/${party.code}/next`);
        }
    };

    const isTimeActive = timeLeft > 0;

    return (
        <>
            <Head title={`نتائج السؤال ${party.current_question_index} - لعبة أسئلة`} />
            <div className="h-screen flex flex-col bg-[#ecf7f1] select-none font-sans relative overflow-hidden" dir="rtl">
                
                {/* Background Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#d5ede0] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#daf0e3] rounded-full blur-[100px] opacity-70 pointer-events-none" />

                {/* --- Top Banner (shrink-0) --- */}
                <div className="relative z-10 shrink-0 w-full max-w-md mx-auto px-4 pt-5 pb-2">
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden text-center">
                        <div className="bg-slate-900 text-white py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                            <span>السؤال {party.current_question_index} / {party.total_questions}</span>
                            {isTimeActive ? (
                                <span className="flex items-center gap-1 text-amber-400">
                                    <Clock className="size-3 animate-pulse" />
                                    بانتظار إجابات اللاعبين ({timeLeft}ث)
                                </span>
                            ) : (
                                <span className="text-emerald-400">انتهى وقت الإجابة ⏱️</span>
                            )}
                        </div>
                        <CardContent className="p-4 space-y-1">
                            <p className="text-xs text-slate-400 font-bold">الإجابة النموذجية الصحيحة</p>
                            <h2 className="text-lg font-black tracking-wide">
                                {isTimeActive ? (
                                    <span className="text-slate-400 italic">جاري إخفاء الإجابة 🤫</span>
                                ) : (
                                    <span className="text-emerald-600">{question.correct_answer}</span>
                                )}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-medium px-4 pt-1 leading-relaxed border-t border-slate-100 mt-2">
                                السؤال: {question.question_text}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Leaderboard List (flex-1) --- */}
                <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-4 max-w-md w-full mx-auto min-h-0">
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden h-full flex flex-col min-h-0">
                        <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                                {isTimeActive ? 'متابعة إجابات اللاعبين' : 'قائمة المتصدرين الحالية'}
                            </span>
                            {isLeader && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full">
                                    أنت قائد الغرفة 👑
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0">
                            {playerResults.map((player, index) => {
                                const pointsWon = player.is_correct ? (player.bet_points || 0) : 0;
                                return (
                                    <div
                                        key={player.id}
                                        className={`flex flex-col gap-2 p-3 rounded-xl border transition-all duration-300 ${
                                            isTimeActive
                                                ? 'bg-slate-50 border-slate-100'
                                                : player.is_correct
                                                    ? 'bg-emerald-50/40 border-emerald-100'
                                                    : 'bg-red-50/30 border-red-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-slate-400 w-5 text-center">{index + 1}</span>
                                            
                                            <div className="relative">
                                                <Avatar type={player.avatar_type} value={player.avatar_value} />
                                                {player.is_leader && (
                                                    <span className="absolute -top-1.5 -right-1 text-xs">👑</span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate">
                                                    {player.nickname}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-semibold">
                                                    المجموع: {player.total_score} نقطة
                                                </p>
                                            </div>

                                            {/* Status Badge */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {isTimeActive ? (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        player.has_answered
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-amber-100 text-amber-800 animate-pulse'
                                                    }`}>
                                                        {player.has_answered ? 'تمت الإجابة ✅' : 'جاري التفكير ⏳'}
                                                    </span>
                                                ) : (
                                                    <>
                                                        {player.bet_points && (
                                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                                                                راهن بـ {player.bet_points}
                                                            </span>
                                                        )}
                                                        <span className={`size-6 rounded-full flex items-center justify-center text-white ${
                                                            player.is_correct ? 'bg-emerald-500' : 'bg-red-500'
                                                        }`}>
                                                            {player.is_correct ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Player typed answer (only show when time is up) */}
                                        {!isTimeActive && (
                                            <div className="text-[10px] font-bold text-slate-500 bg-white/80 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                                                <span>الجواب: {player.answer_text ? `"${player.answer_text}"` : '[ لم يكتب إجابة ]'}</span>
                                                <span className={`font-black ${player.is_correct ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {player.is_correct ? `+${pointsWon} نقطة` : '0 نقطة'}
                                                </span>
                                            </div>
                                        )}

                                        {/* Leader override trigger (only show when time is up) */}
                                        {isLeader && !isTimeActive && player.answer_id && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-7 w-full border-slate-200 bg-white text-[9px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1 rounded"
                                                onClick={() => handleToggleCorrect(player.answer_id!)}
                                            >
                                                <ArrowLeftRight className="size-3" />
                                                تغيير حالة الإجابة لـ {player.is_correct ? 'خطأ' : 'صح'}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {/* --- Bottom Action Bar (shrink-0) --- */}
                <div className="relative z-20 shrink-0 w-full bg-white border-t border-slate-200 p-4 shadow-lg">
                    <div className="max-w-md mx-auto">
                        {isTimeActive ? (
                            <div className="flex items-center justify-center gap-2.5 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="flex gap-1">
                                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse [animation-delay:150ms]" />
                                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse [animation-delay:300ms]" />
                                </div>
                                <p className="text-xs text-slate-500 font-bold">بانتظار إجابة بقية اللاعبين...</p>
                            </div>
                        ) : isLeader ? (
                            <Button
                                onClick={handleNextQuestion}
                                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                            >
                                {isLastQuestion ? (
                                    <>
                                        <Trophy className="size-4 text-amber-400" /> بدء وضع الحاسم 🏆
                                    </>
                                ) : (
                                    <>بدء السؤال التالي ▶</>
                                )}
                            </Button>
                        ) : (
                            <div className="flex items-center justify-center gap-2.5 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="flex gap-1">
                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse [animation-delay:150ms]" />
                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse [animation-delay:300ms]" />
                                </div>
                                <p className="text-xs text-slate-500 font-bold">بانتظار القائد لبدء المرحلة التالية...</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </>
    );
}
