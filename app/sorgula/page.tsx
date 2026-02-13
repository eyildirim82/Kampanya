'use client';

import { useActionState } from 'react';
import { checkApplicationStatus } from './actions';
import Image from 'next/image';
import Link from 'next/link';

// Simple Input Component
function Input({ name, label, type = "text", placeholder, required = false, maxLength }: { name: string, label: string, type?: string, placeholder?: string, required?: boolean, maxLength?: number }) {
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="mt-1">
                <input
                    type={type}
                    name={name}
                    id={name}
                    required={required}
                    maxLength={maxLength}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
    const STATUS_MAP: Record<string, { label: string, color: string, bg: string }> = {
        'pending': { label: 'Değerlendiriliyor', color: 'text-yellow-800', bg: 'bg-yellow-100' },
        'approved': { label: 'Onaylandı', color: 'text-green-800', bg: 'bg-green-100' },
        'rejected': { label: 'Reddedildi', color: 'text-red-800', bg: 'bg-red-100' },
        'draft': { label: 'Taslak', color: 'text-gray-800', bg: 'bg-gray-100' },
    };

    const config = STATUS_MAP[status?.toLowerCase()] || { label: status, color: 'text-gray-800', bg: 'bg-gray-100' };

    return (
        <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
            {config.label}
        </span>
    );
}

export default function SorgulaPage() {
    const [state, formAction, isPending] = useActionState(checkApplicationStatus, null);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <Image
                        src="/images/talpa-logo.png"
                        alt="TALPA Logo"
                        width={180}
                        height={80}
                        className="h-16 w-auto"
                        priority
                    />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Başvuru Sorgulama
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    TCKN ve Telefon numaranız ile başvurunuzun durumunu öğrenin.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form action={formAction} className="space-y-6">
                        <Input
                            name="tckn"
                            label="T.C. Kimlik Numarası"
                            placeholder="11 haneli TCKN giriniz"
                            maxLength={11}
                            required
                        />

                        <Input
                            name="phone"
                            label="Telefon Numarası"
                            type="tel"
                            placeholder="Örn: 532 123 45 67"
                            required
                        />

                        <div>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPending ? 'Sorgulanıyor...' : 'Sorgula'}
                            </button>
                        </div>
                    </form>

                    {state && !state.success && (
                        <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">
                                        {state.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {state && state.success && state.data && (
                        <div className="mt-8 space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Başvuru Sonuçları</h3>
                            {state.data.map((result: any) => (
                                <div key={result.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-gray-900">{result.campaignName}</p>
                                            <p className="text-xs text-gray-500 mt-1">Başvuru Tarihi: {result.date}</p>
                                        </div>
                                        <StatusBadge status={result.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-500 text-sm">
                            &larr; Ana Sayfaya Dön
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
