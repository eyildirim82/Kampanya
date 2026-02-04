'use client';

import { useActionState } from 'react';
import { adminLogin } from '../actions';
import clsx from 'clsx';
import { useState } from 'react';

const initialState = { success: false, message: '' };

export default function AdminLoginPage() {
    // using useActionState (Next.js 15+ / React 19)
    // Adjust logic if older next.js, but package.json said 16.
    const [state, formAction, isPending] = useActionState(adminLogin, initialState);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-[#002855]">
                        Admin Girişi
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sadece yetkili personel erişebilir.
                    </p>
                </div>

                {state?.message && !state?.success && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                        {state.message}
                    </div>
                )}

                <form className="mt-8 space-y-6" action={formAction}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">E-posta Adresi</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-[#002855] focus:border-[#002855] focus:z-10 sm:text-sm"
                                placeholder="E-posta Adresi"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Şifre</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-[#002855] focus:border-[#002855] focus:z-10 sm:text-sm"
                                placeholder="Şifre"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className={clsx(
                                "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#002855] hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002855]",
                                isPending && "opacity-75 cursor-wait"
                            )}
                        >
                            {isPending ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
