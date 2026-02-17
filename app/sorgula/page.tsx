'use client';

import { useActionState } from 'react';
import { checkApplicationStatus } from './actions';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';

function statusToVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
    const s = status?.toLowerCase();
    if (s === 'approved') return 'success';
    if (s === 'rejected') return 'error';
    if (s === 'pending' || s === 'reviewing') return 'warning';
    return 'default';
}

function statusLabel(status: string): string {
    const map: Record<string, string> = {
        pending: 'Değerlendiriliyor',
        approved: 'Onaylandı',
        rejected: 'Reddedildi',
        draft: 'Taslak',
        reviewing: 'İnceleniyor',
    };
    return map[status?.toLowerCase()] ?? status;
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
                <Card variant="elevated" padding="lg" className="py-8 px-4 sm:px-10">
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
                        <Button
                            type="submit"
                            disabled={isPending}
                            isLoading={isPending}
                            className="w-full"
                            variant="primary"
                            size="md"
                        >
                            Sorgula
                        </Button>
                    </form>

                    {state && !state.success && (
                        <div className="mt-6">
                            <Alert variant="destructive" title="Sorgu Hatası">
                                {state.message}
                            </Alert>
                        </div>
                    )}

                    {state && state.success && state.data && (
                        <div className="mt-8 space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                                Başvuru Sonuçları
                            </h3>
                            {state.data.map((result: { id: string; campaignName: string; date: string; status: string }) => (
                                <div
                                    key={result.id}
                                    className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <p className="font-bold text-gray-900">{result.campaignName}</p>
                                            <p className="text-xs text-gray-700 mt-1">
                                                Başvuru Tarihi: {result.date}
                                            </p>
                                        </div>
                                        <Badge variant={statusToVariant(result.status)} size="sm">
                                            {statusLabel(result.status)}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <Link
                            href="/"
                            className="font-medium text-[#002855] hover:text-[#0066cc] text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002855] focus-visible:ring-offset-2 rounded"
                        >
                            &larr; Ana Sayfaya Dön
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
