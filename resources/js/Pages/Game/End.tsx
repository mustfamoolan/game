import React, { useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Trophy, RotateCcw, Crown, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RankingPlayer {
    id: number;
    nickname: string;
    avatar_type: string;
    avatar_value: string;
    total_score: number;
}

interface EndProps {
    party: {
        id: number;
        code: string;
        name: string | null;
        leader_id: number;
    };
    currentPlayer: { id: number };
    rankings: RankingPlayer[];
}

function Avatar({ type, value, size = 'md' }: { type: string; value: string; size?: 'sm' | 'md' | 'lg' }) {
    const cls =
        size === 'lg' ? 'size-14 text-3xl' :
        size === 'md' ? 'size-10 text-xl'  :
                        'size-8 text-base';
    if (type === 'emoji') {
        return (
            <div className={`${cls} flex items-center justify-center rounded-full bg-slate-100 border border-slate-200 leading-none shrink-0`}>
                {value}
            </div>
        );
    }
    return <img src={value} alt="avatar" className={`${cls} rounded-full object-cover border border-slate-200 shrink-0`} />;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function End({ party, currentPlayer, rankings }: EndProps) {
    const isLeader = currentPlayer.id === party.leader_id;
    const first    = rankings[0] ?? null;
    const second   = rankings[1] ?? null;
    const third    = rankings[2] ?? null;

    // Poll party status to detect when the leader clicks "Play Again"
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['party'],
                onSuccess: (page) => {
                    const p = page.props.party as { status: string };
                    if (p && p.status === 'playing') {
                        router.visit(`/game/${party.code}`);
                    }
                }
            });
        }, 3500);
        return () => clearInterval(interval);
    }, [party.code]);

    const handleExit = () => {
        if (isLeader) {
            router.post(`/game/${party.code}/terminate`);
        } else {
            router.visit('/play');
        }
    };

    const handlePlayAgain = () => {
        router.post(`/game/${party.code}/restart`);
    };

    return (
        <>
            <Head title="منصة التتويج - لعبة أسئلة" />
            <div className="h-screen flex flex-col bg-[#ecf7f1] select-none font-sans relative overflow-hidden" dir="rtl">

                {/* Background Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#d5ede0] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#daf0e3] rounded-full blur-[100px] opacity-70 pointer-events-none" />

                {/* --- Top Banner (shrink-0) --- */}
                <div className="relative z-10 shrink-0 w-full max-w-md mx-auto px-4 pt-5 pb-2">
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden text-center">
                        <div className="bg-slate-900 text-white py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                            <Trophy className="size-3 fill-white text-amber-400" />
                            انتهت اللعبة — منصة التتويج
                            <Trophy className="size-3 fill-white text-amber-400" />
                        </div>
                        <CardContent className="p-3">
                            <p className="text-xs text-slate-500 font-bold">{party.name ?? 'غرفة اللعب'}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Podium Top 3 (shrink-0) --- */}
                <div className="relative z-10 shrink-0 w-full max-w-md mx-auto px-4 pb-2">
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="pb-1 pt-3 px-4">
                            <CardTitle className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <Crown className="size-3.5 text-amber-500" />
                                أفضل ثلاثة لاعبين
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            {/* Podium visual: 2nd | 1st | 3rd */}
                            <div className="flex items-end justify-center gap-3">

                                {/* 2nd place — left */}
                                {second ? (
                                    <div className="flex flex-col items-center flex-1">
                                        <Avatar type={second.avatar_type} value={second.avatar_value} />
                                        <p className="text-[11px] font-black text-slate-700 mt-1.5 truncate w-20 text-center">{second.nickname}</p>
                                        <div className="w-full h-20 bg-slate-100 border border-slate-200 rounded-t-xl flex flex-col items-center justify-end pb-3 relative mt-3.5">
                                            <span className="text-xl font-black text-slate-300">2</span>
                                            <span className="text-[10px] font-bold text-slate-500">{second.total_score} ن</span>
                                            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-lg">🥈</span>
                                        </div>
                                    </div>
                                ) : <div className="flex-1" />}

                                {/* 1st place — center (tallest) */}
                                {first ? (
                                    <div className="flex flex-col items-center flex-1 z-10">
                                        <Crown className="size-4 text-amber-500 fill-amber-400 mb-1" />
                                        <Avatar type={first.avatar_type} value={first.avatar_value} size="lg" />
                                        <p className="text-xs font-black text-slate-900 mt-1.5 truncate w-24 text-center">{first.nickname}</p>
                                        <div className="w-full h-28 bg-amber-100 border border-amber-200 rounded-t-xl flex flex-col items-center justify-end pb-4 relative shadow-sm mt-3.5">
                                            <span className="text-3xl font-black text-amber-250">1</span>
                                            <span className="text-[10px] font-black text-amber-700">{first.total_score} ن</span>
                                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xl">🥇</span>
                                        </div>
                                    </div>
                                ) : <div className="flex-1" />}

                                {/* 3rd place — right */}
                                {third ? (
                                    <div className="flex flex-col items-center flex-1">
                                        <Avatar type={third.avatar_type} value={third.avatar_value} />
                                        <p className="text-[11px] font-black text-slate-700 mt-1.5 truncate w-20 text-center">{third.nickname}</p>
                                        <div className="w-full h-14 bg-orange-50 border border-orange-100 rounded-t-xl flex flex-col items-center justify-end pb-2 relative mt-3.5">
                                            <span className="text-lg font-black text-orange-200">3</span>
                                            <span className="text-[10px] font-bold text-orange-700">{third.total_score} ن</span>
                                            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-lg">🥉</span>
                                        </div>
                                    </div>
                                ) : <div className="flex-1" />}

                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Full Leaderboard (flex-1 scrollable) --- */}
                <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-4 max-w-md w-full mx-auto min-h-0">
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden h-full flex flex-col min-h-0">
                        <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                            <span className="text-xs font-bold text-slate-800">ترتيب جميع اللاعبين</span>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
                            {rankings.map((player, idx) => {
                                const isMe   = player.id === currentPlayer.id;
                                const medal  = MEDALS[idx] ?? null;

                                return (
                                    <div
                                        key={player.id}
                                        className={`flex items-center gap-3 px-4 py-3 transition-colors
                                            ${isMe ? 'bg-emerald-50/70' : ''}`}
                                    >
                                        {/* Rank */}
                                        <span className="w-6 text-center shrink-0">
                                            {medal
                                                ? <span className="text-base">{medal}</span>
                                                : <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                                            }
                                        </span>

                                        <Avatar type={player.avatar_type} value={player.avatar_value} size="sm" />

                                        <span className={`text-xs font-black flex-1 truncate ${isMe ? 'text-emerald-700' : 'text-slate-800'}`}>
                                            {player.nickname}
                                            {isMe && <span className="text-[10px] text-emerald-500 font-bold mr-1"> (أنت)</span>}
                                        </span>

                                        <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 border
                                            ${idx === 0 ? 'bg-amber-100 text-amber-700 border-amber-200'
                                            : idx === 1 ? 'bg-slate-100 text-slate-600 border-slate-200'
                                            : idx === 2 ? 'bg-orange-50 text-orange-700 border-orange-100'
                                            : isMe      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                            :              'bg-slate-50 text-slate-500 border-slate-100'}`}
                                        >
                                            {player.total_score} ن
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {/* --- Bottom Actions (shrink-0) --- */}
                <div className="relative z-20 shrink-0 w-full bg-white border-t border-slate-200 p-4 shadow-lg">
                    <div className="max-w-md mx-auto space-y-2">
                        {isLeader && (
                            <Button
                                onClick={handlePlayAgain}
                                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="size-4" /> لعب مرة أخرى 🔄
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={handleExit}
                            className="w-full h-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold rounded-xl flex items-center justify-center gap-2"
                        >
                            <Home className="size-4" /> {isLeader ? 'إغلاق اللعبة والخروج' : 'العودة للقائمة'}
                        </Button>
                    </div>
                </div>

            </div>
        </>
    );
}
