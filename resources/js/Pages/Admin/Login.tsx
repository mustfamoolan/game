import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Login() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) {
            setError('الرجاء إدخال رمز المرور!');
            return;
        }

        setError('');
        setIsLoading(true);

        router.post('/admin/login', { password }, {
            onError: (errors) => {
                setError(errors.password || 'حدث خطأ ما.');
                setIsLoading(false);
            },
            onFinish: () => setIsLoading(false)
        });
    };

    return (
        <>
            <Head title="دخول الإدارة - لعبة أسئلة" />
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#ecf7f1] px-4 py-12 select-none font-sans relative overflow-hidden" dir="rtl">
                
                {/* Subtle soft green spots/radial gradients for calm aesthetic */}
                <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#d5ede0] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#daf0e3] rounded-full blur-[100px] opacity-70 pointer-events-none" />
                <div className="absolute top-[30%] right-[15%] w-[280px] h-[280px] bg-[#e1f5eb] rounded-full blur-[90px] opacity-80 pointer-events-none" />

                {/* Login Card */}
                <Card className="w-full max-w-sm bg-white border border-slate-200 shadow-sm rounded-lg p-1 relative z-10">
                    <CardHeader className="text-center space-y-1.5 pb-4">
                        <div className="size-12 rounded-full bg-slate-900 text-white flex items-center justify-center mx-auto text-xl shadow-sm mb-1">
                            🔐
                        </div>
                        <CardTitle className="text-xl font-bold tracking-tight text-slate-900">لوحة التحكم</CardTitle>
                        <CardDescription className="text-xs text-slate-500 font-semibold">
                            بوابة الإدارة الخاصة بنظام لعبة الأسئلة
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Password input */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 justify-start">
                                    <Lock className="size-3.5 text-slate-500" />
                                    رمز مرور الأدمن
                                </Label>
                                <Input
                                    type="password"
                                    placeholder="••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (error) setError('');
                                    }}
                                    className="h-10 bg-slate-50 border-slate-200 text-slate-900 rounded-md placeholder:text-slate-400 text-center font-medium focus-visible:ring-1 focus-visible:ring-slate-950"
                                />
                                {error && (
                                    <p className="text-[11px] text-red-600 text-center font-semibold mt-1">{error}</p>
                                )}
                            </div>

                            <Button 
                                type="submit"
                                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md flex items-center justify-center gap-1.5 border-0 transition duration-150"
                                disabled={isLoading}
                            >
                                <LogIn className="size-4 ml-1" />
                                {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
