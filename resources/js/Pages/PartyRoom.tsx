import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Copy, Check, Crown, LogOut, Play, Globe, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category { id: number; name: string; }

interface PartyPlayer {
    id: number;
    nickname: string;
    avatar_type: string;
    avatar_value: string;
    score: number;
    is_leader: boolean;
}

interface PartyData {
    id: number;
    code: string;
    name: string | null;
    is_public: boolean;
    status: string;
    game_type: 'traditional' | 'betting' | 'buzzer';
    leader_id: number;
    categories: Category[];
    players: PartyPlayer[];
}

interface CurrentPlayer {
    id: number;
    nickname: string;
    avatar_type: string;
    avatar_value: string;
}

interface PartyRoomProps {
    party: PartyData;
    currentPlayer: CurrentPlayer;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ type, value }: { type: string; value: string }) {
    if (type === 'emoji') {
        return (
            <div className="size-9 flex items-center justify-center rounded-full bg-slate-100 border-2 border-slate-200 text-xl leading-none shrink-0">
                {value}
            </div>
        );
    }
    return (
        <img src={value} alt="avatar"
            className="size-9 rounded-full object-cover border-2 border-slate-200 shrink-0" />
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PartyRoom({ party, currentPlayer }: PartyRoomProps) {
    const [copied, setCopied]     = useState(false);
    const [isLeaving, setLeaving] = useState(false);
    const [isStarting, setStart]  = useState(false);

    const isLeader = currentPlayer.id === party.leader_id;

    // Poll party details every 3 seconds to update player list and detect game start
    React.useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['party'],
                onSuccess: (page) => {
                    const partyData = page.props.party as any;
                    if (partyData && partyData.status === 'playing') {
                        router.visit(`/game/${party.code}`);
                    }
                }
            });
        }, 3000);
        return () => clearInterval(interval);
    }, [party.code]);

    const handleCopy = () => {
        navigator.clipboard.writeText(party.code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleLeave = () => { setLeaving(true); router.post(`/parties/${party.code}/leave`); };
    const handleStart = () => { setStart(true);   router.post(`/parties/${party.code}/start`); };

    return (
        <>
            <Head title={`غرفة الانتظار - ${party.name ?? 'بارتي'}`} />

            <div className="h-screen flex flex-col bg-[#ecf7f1] select-none font-sans relative overflow-hidden" dir="rtl">

                {/* blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#d5ede0] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#daf0e3] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute top-[50%] right-[10%] w-[240px] h-[240px] bg-[#e1f5eb] rounded-full blur-[80px] opacity-60 pointer-events-none" />

                {/* ══ TOP (shrink-0) ══════════════════════════════════════════ */}
                <div className="relative z-10 shrink-0 w-full max-w-sm mx-auto flex flex-col px-4">

                    {/* Header */}
                    <div className="flex items-center justify-between pt-5 pb-3">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-600 shadow-sm">
                            {party.is_public
                                ? <><Globe className="size-3 text-emerald-500" /> عام</>
                                : <><Lock className="size-3 text-slate-500" /> خاص</>}
                        </div>
                        <Button variant="outline" size="sm" disabled={isLeaving}
                            className="h-8 px-3 border-slate-200 bg-white/80 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-xs font-semibold rounded-md"
                            onClick={handleLeave}>
                            <LogOut className="size-3.5 ml-1" />
                            {isLeaving ? 'جاري المغادرة...' : 'مغادرة'}
                        </Button>
                    </div>

                    {/* Code */}
                    <div className="flex flex-col items-center pb-3">
                        <p className="text-[10px] font-bold text-slate-400 mb-2 tracking-widest uppercase">كود الغرفة</p>
                        <button onClick={handleCopy}
                            className="group flex items-center gap-3 bg-white border-2 border-slate-200 hover:border-slate-400 rounded-2xl px-6 py-3 shadow-sm transition-all duration-200 active:scale-95">
                            <span className="font-mono text-4xl font-black tracking-[0.25em] text-slate-900 leading-none" dir="ltr">
                                {party.code}
                            </span>
                            <div className={`size-8 flex items-center justify-center rounded-lg transition-all duration-200 ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                            </div>
                        </button>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                            {copied ? '✅ تم نسخ الكود!' : 'اضغط لنسخ الكود ومشاركته'}
                        </p>
                    </div>

                    {/* Start / Waiting */}
                    <div className="pb-3">
                        {isLeader ? (
                            <div className="space-y-1">
                                <Button
                                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    onClick={handleStart}
                                    disabled={isStarting || party.players.length < 2}>
                                    {isStarting
                                        ? <span className="animate-pulse">جاري البدء...</span>
                                        : <><Play className="size-4 fill-white" /> بدء اللعبة</>}
                                </Button>
                                <p className="text-[10px] text-slate-400 text-center">
                                    {party.players.length < 2
                                        ? 'يجب أن يكون هناك لاعبان على الأقل لبدء اللعبة'
                                        : 'يمكنك بدء اللعبة الآن!'}
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-3 py-2.5 bg-white/60 border border-slate-200 rounded-lg">
                                <div className="flex gap-1.5">
                                    <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="size-1.5 rounded-full bg-amber-400 animate-pulse [animation-delay:150ms]" />
                                    <span className="size-1.5 rounded-full bg-amber-400 animate-pulse [animation-delay:300ms]" />
                                </div>
                                <p className="text-xs text-slate-500 font-medium">بانتظار قائد المجموعة لبدء اللعبة ⏳</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Leaderboard card (flex-1) ── */}
                <div className="relative z-10 flex-1 flex flex-col w-full max-w-sm mx-auto px-4 pb-4 min-h-0">
                    <div className="flex-1 flex flex-col bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden min-h-0">

                        {/* Card top: name + categories */}
                        <div className="shrink-0 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                            <div className="flex items-center justify-between gap-2 font-bold text-slate-900 text-sm">
                                <span className="truncate">🎮 {party.name ?? 'غرفة انتظار'}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                    party.game_type === 'buzzer' 
                                        ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                        : party.game_type === 'betting'
                                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                }`}>
                                    {party.game_type === 'buzzer' && 'وضع المواجهة (الباز) 🔔'}
                                    {party.game_type === 'betting' && 'وضع المراهنات 🪙'}
                                    {party.game_type === 'traditional' && 'الوضع التقليدي 📝'}
                                </span>
                            </div>
                            {party.categories.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {party.categories.map(c => (
                                        <span key={c.id} className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-semibold">
                                            {c.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Players label */}
                        <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-slate-500 px-4 pt-3 pb-2">
                            <Users className="size-3.5" />
                            اللاعبون ({party.players.length})
                        </div>

                        {/* Players list — scrollable */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 min-h-0">
                            {party.players.map((p, index) => (
                                <div key={p.id}
                                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-150 ${
                                        p.id === currentPlayer.id ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'
                                    }`}>
                                    <span className="text-xs font-bold text-slate-400 w-5 text-center shrink-0">{index + 1}</span>
                                    <div className="relative shrink-0">
                                        <Avatar type={p.avatar_type} value={p.avatar_value} />
                                        {p.is_leader && (
                                            <span className="absolute -top-2 -right-1 text-sm leading-none">👑</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${p.id === currentPlayer.id ? 'text-slate-900' : 'text-slate-700'}`}>
                                            {p.nickname}
                                            {p.id === currentPlayer.id && (
                                                <span className="text-slate-400 font-normal text-xs mr-1">(أنت)</span>
                                            )}
                                        </p>
                                        {p.is_leader && (
                                            <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                                                <Crown className="size-2.5" /> قائد المجموعة
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                                        {p.score} نقطة
                                    </span>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>

            </div>
        </>
    );
}
