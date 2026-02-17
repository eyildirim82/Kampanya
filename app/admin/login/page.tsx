'use client';

import { useActionState } from 'react';
import { adminLogin } from '../actions';
import clsx from 'clsx';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const initialState = { success: false, message: '', redirectUrl: '' };

export default function AdminLoginPage() {
    // using useActionState (Next.js 15+ / React 19)
    // Adjust logic if older next.js, but package.json said 16.
    const [state, formAction, isPending] = useActionState(adminLogin, initialState);
    const router = useRouter();

    useEffect(() => {
        if (state?.success && state?.redirectUrl) {
            router.push(state.redirectUrl);
        }
    }, [state, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-deniz-red via-talpa-navy to-deniz-red"></div>

            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl shadow-talpa-navy/10 relative z-10">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-talpa-navy rounded-xl flex items-center justify-center text-white shadow-lg shadow-talpa-navy/30">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-talpa-navy tracking-tight">
                        Yönetici Girişi
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Bu alana sadece yetkili personel erişebilir.
                    </p>
                </div>

                {state?.message && !state?.success && (
                    <div className="bg-red-50 border border-red-100 text-deniz-red px-4 py-3 rounded-lg text-sm font-medium animate-pulse flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                        {state.message}
                    </div>
                )}

                <form className="mt-8 space-y-6" action={formAction}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-1">E-posta Adresi</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-talpa-navy focus:border-talpa-navy focus:z-10 sm:text-sm transition-all"
                                placeholder="ornek@talpa.org"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-talpa-navy focus:border-talpa-navy focus:z-10 sm:text-sm transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className={clsx(
                                "group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-talpa-navy hover:bg-talpa-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-talpa-navy transition-all shadow-md hover:shadow-lg active:scale-[0.98]",
                                isPending && "opacity-75 cursor-wait"
                            )}
                        >
                            {isPending ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Giriş Yapılıyor...
                                </span>
                            ) : 'Güvenli Giriş'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="absolute bottom-6 text-center w-full text-xs text-slate-400">
                &copy; {new Date().getFullYear()} Türkiye Havayolu Pilotları Derneği
            </div>
        </div>
    );
}
