import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { Crown, Check, X, ArrowLeftRight, Clock, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
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
    decisive_bet: number;
    is_correct: boolean;
    answer_id: number | null;
    score_delta: number;
    total_score: number;
}

interface DecisiveResultsProps {
    party: {
        id: number;
        code: string;
        leader_id: number;
        decisive_difficulty: string | null;
    };
    currentPlayer: { id: number; nickname: string };
    question: {
        id: number | null;
        question_text: string | null;
        correct_answer: string | null;
    };
    playerResults: PlayerResult[];
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
    return <img src={value} alt="avatar" className="size-8 rounded-full object-cover border border-slate-200 shrink-0" />;
}

export default function DecisiveResults({
    party, currentPlayer, question, playerResults, timeLeft: initialTimeLeft
}: DecisiveResultsProps) {
    const isLeader = currentPlayer.id === party.leader_id;
    const [timeLeft, setTimeLeft] = useState(Math.floor(initialTimeLeft));

    // Sync timer
    useEffect(() => {
        setTimeLeft(Math.floor(initialTimeLeft));
    }, [initialTimeLeft]);

    // Local countdown
    useEffect(() => {
        const t = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(t); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [question.id]);

    // Polling
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['party', 'playerResults', 'timeLeft', 'question'],
                onSuccess: (page) => {
                    const partyData = page.props.party as any;
                    if (partyData && partyData.status === 'finished') {
                        router.visit(`/game/${party.code}/end`);
                    }
                }
            });
        }, 1500);
        return () => clearInterval(interval);
    }, [party.code]);

    const isTimeUp = timeLeft <= 0;

    const handleToggle = (answerId: number) => {
        if (!isLeader) return;
        router.post(`/game/${party.code}/decisive/mark/${answerId}`, {}, { preserveScroll: true });
    };

    const goToEnd = () => {
        router.visit(`/game/${party.code}/end`);
    };

    const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const ss = String(timeLeft % 60).padStart(2, '0');

    return (
        <>
            <Head title="نتائج سؤال الحاسم" />
            <div className="h-screen flex flex-col bg-[#ecf7f1] select-none font-sans relative overflow-hidden" dir="rtl">

                {/* Background Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#d5ede0] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#daf0e3] rounded-full blur-[100px] opacity-70 pointer-events-none" />

                {/* --- Top Banner --- */}
                <div className="relative z-10 shrink-0 w-full max-w-md mx-auto px-4 pt-5 pb-2">
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden text-center">
                        <div className="bg-slate-900 text-white py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                            <span>⚡ السؤال الحاسم</span>
                            {isTimeUp ? (
                                <span className="text-emerald-400">انتهى وقت الإجابة ⏱️</span>
                            ) : (
                                <span className="flex items-center gap-1 text-amber-400">
                                    <Clock className="size-3 animate-pulse" />
                                    بانتظار إجابات اللاعبين ({mm}:{ss})
                                </span>
                            )}
                        </div>
                        <CardContent className="p-4 space-y-1">
                            <p className="text-xs text-slate-400 font-bold">الإجابة النموذجية الصحيحة</p>
                            <h2 className="text-lg font-black tracking-wide">
                                {isTimeUp ? (
                                    <span className="text-emerald-600">{question.correct_answer ?? '—'}</span>
                                ) : (
                                    <span className="text-slate-400 italic">جاري إخفاء الإجابة 🤫</span>
                                )}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-medium px-4 pt-1 leading-relaxed border-t border-slate-100 mt-2">
                                السؤال: {question.question_text}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Leaderboard List --- */}
                <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-4 max-w-md w-full mx-auto min-h-0">
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden h-full flex flex-col min-h-0">
                        <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                                {isTimeUp ? 'الترتيب النهائي 🏆' : 'متابعة إجابات اللاعبين'}
                            </span>
                            {isLeader && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full">
                                    أنت قائد الغرفة 👑
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0">
                            {playerResults.map((player, index) => {
                                const isMe = player.id === currentPlayer.id;
                                const medals = ['🥇', '🥈', '🥉'];

                                return (
                                    <div
                                        key={player.id}
                                        className={`rounded-xl border p-3 transition-all
                                            ${isMe ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-100 bg-white'}`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            {/* Rank */}
                                            <span className="text-base shrink-0 w-6 text-center">
                                                {isTimeUp
                                                    ? (medals[index] ?? <span className="text-xs text-slate-500 font-black">#{index + 1}</span>)
                                                    : <span className="text-xs text-slate-400 font-black">#{index + 1}</span>
                                                }
                                            </span>

                                            <Avatar type={player.avatar_type} value={player.avatar_value} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-black text-slate-800 truncate">{player.nickname}</span>
                                                    {player.is_leader && <Crown className="size-3 text-amber-500 shrink-0" />}
                                                    {isMe && (
                                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-1.5 py-0.5 rounded-full">
                                                            أنت
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Answer display (after time up) */}
                                                {isTimeUp && (
                                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                        <span className="text-[10px] text-amber-600 font-bold">رهان: {player.decisive_bet}ن</span>
                                                        {player.has_answered ? (
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                                                                ${player.is_correct
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-red-100 text-red-700'}`}>
                                                                {player.is_correct ? '✓ صح' : '✗ خطأ'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400">لم يجب</span>
                                                        )}
                                                        {player.answer_text && (
                                                            <span className="text-[10px] text-slate-500">
                                                                &ldquo;{player.answer_text}&rdquo;
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Waiting indicator */}
                                                {!isTimeUp && (
                                                    <span className={`text-[10px] font-bold
                                                        ${player.has_answered ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {player.has_answered ? '✓ أجاب' : 'لم يجب بعد...'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Score + delta */}
                                            <div className="shrink-0 text-right">
                                                <p className="text-sm font-black text-slate-800">{player.total_score}</p>
                                                {isTimeUp && player.score_delta !== 0 && (
                                                    <div className={`flex items-center justify-end gap-0.5 text-[10px] font-black
                                                        ${player.score_delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {player.score_delta > 0
                                                            ? <TrendingUp className="size-3" />
                                                            : <TrendingDown className="size-3" />
                                                        }
                                                        {player.score_delta > 0 ? '+' : ''}{player.score_delta}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Leader toggle button */}
                                        {isLeader && isTimeUp && player.answer_id && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-7 w-full mt-2 border-slate-200 bg-white text-[9px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1 rounded"
                                                onClick={() => handleToggle(player.answer_id!)}
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

                {/* --- Bottom Action Bar --- */}
                <div className="relative z-20 shrink-0 w-full bg-white border-t border-slate-200 p-4 shadow-lg">
                    <div className="max-w-md mx-auto">
                        {isTimeUp && isLeader ? (
                            <Button
                                onClick={goToEnd}
                                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                            >
                                <Trophy className="size-4 text-amber-400" />
                                كشف الترتيب النهائي 🏆
                            </Button>
                        ) : isTimeUp ? (
                            <div className="flex items-center justify-center gap-2.5 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse [animation-delay:150ms]" />
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse [animation-delay:300ms]" />
                                <p className="text-xs text-slate-500 font-bold">بانتظار القائد لعرض النتائج النهائية...</p>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2.5 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse [animation-delay:150ms]" />
                                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse [animation-delay:300ms]" />
                                <p className="text-xs text-slate-500 font-bold">بانتظار إجابة بقية اللاعبين...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
