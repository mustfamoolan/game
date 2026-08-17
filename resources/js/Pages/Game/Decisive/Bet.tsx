import React, { useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { Crown, Check, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Player {
    id: number;
    nickname: string;
    avatar_type: string;
    avatar_value: string;
    is_leader: boolean;
    has_bet: boolean;
    total_score: number;
}

interface BetProps {
    party: {
        id: number;
        code: string;
        leader_id: number;
        decisive_difficulty: string | null;
        decisive_phase: string;
    };
    currentPlayer: { id: number; nickname: string };
    players: Player[];
    myBet: number | null;
    betsCount: number;
}

const BET_OPTIONS = [0, 5, 10, 15, 20];

const DIFF_LABELS: Record<string, { label: string; color: string }> = {
    easy:   { label: 'سهل',   color: 'text-emerald-400' },
    medium: { label: 'متوسط', color: 'text-amber-400' },
    hard:   { label: 'صعب',   color: 'text-rose-400' },
};

function Avatar({ type, value }: { type: string; value: string }) {
    if (type === 'emoji') {
        return (
            <div className="size-8 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-base leading-none shrink-0">
                {value}
            </div>
        );
    }
    return <img src={value} alt="avatar" className="size-8 rounded-full object-cover border border-slate-700 shrink-0" />;
}

export default function Bet({ party, currentPlayer, players, myBet, betsCount }: BetProps) {
    const isLeader = currentPlayer.id === party.leader_id;
    const diff = DIFF_LABELS[party.decisive_difficulty ?? 'medium'] ?? { label: 'متوسط', color: 'text-amber-400' };

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        pollRef.current = setInterval(() => {
            router.reload({
                only: ['players', 'myBet', 'betsCount', 'party'],
                onSuccess: (page) => {
                    const partyData = page.props.party as { decisive_phase: string; code: string };
                    if (partyData.decisive_phase === 'question') {
                        router.visit(`/game/${party.code}/decisive/question`);
                    }
                }
            });
        }, 1500);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const submitBet = (amount: number) => {
        router.post(`/game/${party.code}/decisive/bet`, { bet: amount }, { preserveScroll: true });
    };

    const startQuestion = () => {
        router.post(`/game/${party.code}/decisive/start-question`);
    };

    return (
        <>
            <Head title="وضع الحاسم - المراهنة" />
            <div
                className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 select-none overflow-hidden"
                dir="rtl"
            >
                <div className="absolute top-[-15%] right-[-10%] w-96 h-96 bg-amber-600 rounded-full blur-[140px] opacity-20 pointer-events-none" />
                <div className="absolute bottom-[-15%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full blur-[140px] opacity-20 pointer-events-none" />

                {/* ── Header ── */}
                <div className="relative z-10 shrink-0 flex flex-col items-center pt-10 pb-4 px-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Coins className="size-6 text-amber-400" />
                        <h1 className="text-2xl font-black text-white tracking-tight">وضع المراهنة</h1>
                        <Coins className="size-6 text-amber-400" />
                    </div>
                    <p className="text-sm text-slate-400 mt-1 text-center">
                        الصعوبة المختارة:{' '}
                        <span className={`font-black text-base ${diff.color}`}>{diff.label}</span>
                    </p>
                    <p className="text-xs text-slate-500 text-center mt-1">
                        اختر عدد النقاط التي تراهن بها — إذا أصبت تأخذها، وإذا أخطأت تخسرها
                    </p>
                    <div className="mt-3 px-4 py-1.5 bg-slate-800/70 rounded-full border border-slate-700 text-xs text-slate-300 font-bold">
                        راهن {betsCount} من {players.length} لاعب
                    </div>
                </div>

                {/* ── Bet Chips ── */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-6">
                    <div className="flex flex-wrap gap-3 justify-center">
                        {BET_OPTIONS.map((amount) => {
                            const isSelected = myBet === amount;
                            return (
                                <button
                                    key={amount}
                                    onClick={() => submitBet(amount)}
                                    className={`
                                        size-20 rounded-2xl flex flex-col items-center justify-center gap-1
                                        font-black text-2xl transition-all duration-150 active:scale-95
                                        ${isSelected
                                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-xl shadow-amber-500/30 ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900'
                                            : 'bg-slate-800/80 border border-slate-700 text-white hover:border-amber-500/50 hover:bg-slate-700/80'
                                        }
                                    `}
                                >
                                    {amount}
                                    <span className={`text-[10px] font-bold ${isSelected ? 'text-black/70' : 'text-slate-500'}`}>نقطة</span>
                                </button>
                            );
                        })}
                    </div>

                    {myBet !== null && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-900/30 border border-amber-700/50 rounded-xl text-amber-300 text-sm font-bold">
                            <Check className="size-4" />
                            راهنت بـ {myBet} نقطة
                        </div>
                    )}
                </div>

                {/* ── Players Status ── */}
                <div className="relative z-10 shrink-0 px-4 pb-2">
                    <div className="max-w-xs mx-auto flex flex-wrap gap-1.5 justify-center">
                        {players.map(p => (
                            <div
                                key={p.id}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border
                                    ${p.has_bet
                                        ? 'bg-amber-900/40 border-amber-700 text-amber-300'
                                        : 'bg-slate-800/70 border-slate-700 text-slate-400'
                                    }`}
                            >
                                <Avatar type={p.avatar_type} value={p.avatar_value} />
                                <span>{p.nickname}</span>
                                {p.is_leader && <Crown className="size-3 text-amber-400" />}
                                {p.has_bet && <Check className="size-3" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Bottom Action ── */}
                <div className="relative z-10 shrink-0 p-4">
                    <div className="max-w-xs mx-auto">
                        {isLeader ? (
                            <Button
                                onClick={startQuestion}
                                className="w-full h-12 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black rounded-2xl text-sm shadow-lg"
                            >
                                <Crown className="size-4 ml-2" />
                                ابدأ سؤال الحاسم 🔥
                            </Button>
                        ) : (
                            <div className="flex items-center justify-center gap-2 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl">
                                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                                <p className="text-xs text-slate-400 font-bold">في انتظار القائد لبدء السؤال...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
