'use client';

import { useState } from 'react';
import { verifyTcknAction } from '@/app/basvuru/actions';
import DynamicForm from '@/components/DynamicForm';

interface CampaignFormWrapperProps {
    campaignId: string;
    schema: Array<{
        name: string;
        label: string;
        type: string;
        required?: boolean;
        options?: string[];
        width?: string;
        id?: string;
        placeholder?: string;
    }>;
}

export default function CampaignFormWrapper({ campaignId, schema }: CampaignFormWrapperProps) {
    const [step, setStep] = useState<'TCKN' | 'FORM'>('TCKN');
    const [tckn, setTckn] = useState('');
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTcknSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const value = tckn.trim().replace(/\D/g, '');
        if (value.length !== 11) {
            setError('TCKN 11 haneli olmalıdır.');
            return;
        }
        setIsChecking(true);
        try {
            const result = await verifyTcknAction(value, campaignId);
            if (result.status === 'SUCCESS' && result.sessionToken) {
                setSessionToken(result.sessionToken);
                setStep('FORM');
            } else if (result.status === 'INVALID') {
                setError(result.message || 'Geçersiz TCKN.');
            } else if (result.status === 'NOT_FOUND') {
                setError(result.message || 'TALPA listesinde kaydınız bulunamadı.');
            } else if (result.status === 'BLOCKED' || result.status === 'DEBTOR') {
                setError(result.message || 'İşleminize devam edilememektedir.');
            } else if (result.status === 'EXISTS') {
                setError(result.message || 'Bu kampanya için zaten başvurunuz var.');
            } else {
                setError(result.message || 'Doğrulama başarısız.');
            }
        } catch {
            setError('Sistem hatası. Lütfen tekrar deneyiniz.');
        } finally {
            setIsChecking(false);
        }
    };

    if (step === 'FORM' && sessionToken) {
        return (
            <DynamicForm
                schema={schema}
                campaignId={campaignId}
                sessionToken={sessionToken}
            />
        );
    }

    return (
        <form onSubmit={handleTcknSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
                Başvuruya devam etmek için T.C. Kimlik Numaranızı girin. Üyeliğiniz doğrulanacaktır.
            </p>
            <div>
                <label htmlFor="tckn-step" className="block text-sm font-medium text-gray-700 mb-1.5">
                    T.C. Kimlik Numarası
                </label>
                <input
                    id="tckn-step"
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={tckn}
                    onChange={(e) => setTckn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="11 haneli numara"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#002855] focus:ring-2 focus:ring-[#002855]/20"
                    disabled={isChecking}
                />
                {error && (
                    <p className="text-red-500 text-xs mt-1.5">{error}</p>
                )}
            </div>
            <button
                type="submit"
                disabled={isChecking || tckn.replace(/\D/g, '').length !== 11}
                className="w-full bg-[#002855] text-white font-bold py-3.5 px-6 rounded-xl hover:bg-[#003366] disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
                {isChecking ? 'Doğrulanıyor...' : 'Devam Et'}
            </button>
        </form>
    );
}
