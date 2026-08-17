import React, { useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { Crown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Player {
    id: number;
    nickname: string;
    avatar_type: string;
    avatar_value: string;
    is_leader: boolean;
    vote: string | null;
    has_bet: boolean;
    total_score: number;
}

interface VoteProps {
    party: { id: number; code: string; leader_id: number; decisive_phase: string };
    currentPlayer: { id: number; nickname: string };
    players: Player[];
    myVote: string | null;
    myBet: number | null;
    votesCount: number;
    betsCount: number;
}

const DIFFICULTIES = [
    { key: 'easy',   label: 'سهل 🟢' },
    { key: 'medium', label: 'متوسط 🟡' },
    { key: 'hard',   label: 'صعب 🔴' },
];

const BET_OPTIONS = [0, 5, 10, 15, 20];

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

export default function Vote({ party, currentPlayer, players, myVote, myBet, votesCount, betsCount }: VoteProps) {
    const isLeader = currentPlayer.id === party.leader_id;
    const totalPlayers = players.length;

    // Polling
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        pollRef.current = setInterval(() => {
            router.reload({
                only: ['players', 'myVote', 'myBet', 'votesCount', 'betsCount', 'party'],
                onSuccess: (page) => {
                    const p = page.props.party as { decisive_phase: string; code: string };
                    if (p.decisive_phase === 'question') {
                        router.visit(`/game/${party.code}/decisive/question`);
                    }
                }
            });
        }, 3500);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const submitVote = (key: string) => {
        router.post(`/game/${party.code}/decisive/vote`, { vote: key }, { preserveScroll: true });
    };

    const submitBet = (amount: number) => {
        router.post(`/game/${party.code}/decisive/bet`, { bet: amount }, { preserveScroll: true });
    };

    const startQuestion = () => {
        router.post(`/game/${party.code}/decisive/start-question`);
    };

    const allReady = votesCount >= totalPlayers && betsCount >= totalPlayers;

    return (
        <>
            <Head title="وضع الحاسم" />
            <div className="h-screen flex flex-col bg-[#ecf7f1] select-none font-sans relative overflow-hidden" dir="rtl">

                {/* Background Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#d5ede0] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#daf0e3] rounded-full blur-[100px] opacity-70 pointer-events-none" />

                {/* Header */}
                <header className="relative z-10 shrink-0 w-full max-w-md mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
                    <div className="bg-white/80 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                        ⚡ السؤال الحاسم
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">
                        <Crown className="size-3.5 text-amber-400" />
                        وضع الحاسم
                    </div>
                </header>

                {/* Body */}
                <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6 max-w-md w-full mx-auto space-y-4 min-h-0">

                    {/* SECTION 1: Vote on difficulty */}
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="pb-2 pt-3 px-4">
                            <CardTitle className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                <span>📊 صوّت على صعوبة سؤال الحاسم</span>
                                <span className="text-slate-400 font-normal">{votesCount}/{totalPlayers} صوّتوا</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="grid grid-cols-3 gap-2">
                                {DIFFICULTIES.map(({ key, label }) => {
                                    const isSelected = myVote === key;
                                    const count = players.filter(p => p.vote === key).length;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => submitVote(key)}
                                            className={`relative h-14 border rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition duration-150
                                                ${isSelected
                                                    ? 'bg-slate-900 border-slate-950 text-white shadow-sm ring-2 ring-slate-950/20'
                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            <span>{label}</span>
                                            {count > 0 && (
                                                <span className={`text-[10px] font-bold ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                                                    {count} صوت
                                                </span>
                                            )}
                                            {isSelected && (
                                                <Check className="absolute top-1 left-1 size-3 text-emerald-400" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* SECTION 2: Bet points */}
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="pb-2 pt-3 px-4">
                            <CardTitle className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                <span>🎲 راهن بنقاطك على الإجابة</span>
                                <span className="text-slate-400 font-normal">{betsCount}/{totalPlayers} راهنوا</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-3">
                            <div className="grid grid-cols-5 gap-2">
                                {BET_OPTIONS.map((amount) => {
                                    const isSelected = myBet === amount;
                                    return (
                                        <button
                                            key={amount}
                                            onClick={() => submitBet(amount)}
                                            className={`h-11 border rounded-xl font-bold text-sm flex flex-col items-center justify-center transition duration-150
                                                ${isSelected
                                                    ? 'bg-slate-900 border-slate-950 text-white shadow-sm ring-2 ring-slate-950/20'
                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            {amount}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold text-center">
                                💡 إذا أصبت تحصل على النقاط، وإذا أخطأت تخسرها
                            </p>
                            {myBet !== null && (
                                <div className="flex items-center gap-1.5 justify-center text-xs font-bold text-emerald-700">
                                    <Check className="size-3.5" />
                                    رهانك: {myBet} نقطة
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* SECTION 3: Players status */}
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="pb-2 pt-3 px-4">
                            <CardTitle className="text-xs font-bold text-slate-700">حالة اللاعبين</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-2">
                            {players.map(p => (
                                <div key={p.id} className="flex items-center gap-2.5">
                                    <Avatar type={p.avatar_type} value={p.avatar_value} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-slate-800 truncate">{p.nickname}</span>
                                            {p.is_leader && <Crown className="size-3 text-amber-500 shrink-0" />}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                                            ${p.vote ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                            {p.vote ? '✓ صوّت' : 'لم يصوّت'}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                                            ${p.has_bet ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                            {p.has_bet ? '✓ راهن' : 'لم يراهن'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Spacer for bottom bar */}
                    <div className="h-4" />
                </div>

                {/* Bottom Action Bar */}
                <div className="relative z-20 shrink-0 w-full bg-white border-t border-slate-200 p-4 shadow-lg">
                    <div className="max-w-md mx-auto">
                        {isLeader ? (
                            <Button
                                onClick={startQuestion}
                                disabled={!myVote || myBet === null}
                                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                <Crown className="size-4 text-amber-400" />
                                ابدأ سؤال الحاسم 🔥
                            </Button>
                        ) : (
                            <div className="flex items-center justify-center gap-2.5 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse [animation-delay:150ms]" />
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse [animation-delay:300ms]" />
                                <p className="text-xs text-slate-500 font-bold">بانتظار القائد لبدء السؤال...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
