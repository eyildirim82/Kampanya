'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';

export default function LoginForm() {
    const router = useRouter();

    const [tckn, setTckn] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'TCKN' | 'OTP'>('TCKN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');

    const handleTcknSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (tckn.length !== 11) {
            setError('TCKN 11 haneli olmalıdır.');
            setLoading(false);
            return;
        }

        try {
            const res = await axios.post('/api/auth/check', {
                tckn,
            });

            if (res.data.status === 'OTP_SENT') {
                setMaskedEmail(res.data.emailMasked);
                setStep('OTP');
            } else if (res.data.status === 'REDIRECT_FORM') {
                router.push(`/basvuru?tckn=${tckn}`);
            }

        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as any;
            console.error(error);
            setError(error.response?.data?.error || 'Giriş yapılırken sunucuyla iletişim kurulamadı.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post('/api/auth/verify', {
                tckn,
                otp
            });

            if (res.data.success) {
                router.push(`/basvuru?tckn=${tckn}`);
            }

        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as any;
            console.error(error);
            setError(error.response?.data?.error || 'Doğrulama işlemi başarısız oldu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
                <div className="mb-4">
                    <Alert variant="destructive" title="Giriş Hatası">
                        {error}
                    </Alert>
                </div>
            )}

            {step === 'TCKN' ? (
                <form className="space-y-6" onSubmit={handleTcknSubmit}>
                    <div>
                        <label htmlFor="tckn" className="block text-sm font-medium text-gray-700">
                            TC Kimlik No
                        </label>
                        <div className="mt-1">
                            <input
                                id="tckn"
                                name="tckn"
                                type="text"
                                required
                                maxLength={11}
                                value={tckn}
                                onChange={(e) => setTckn(e.target.value.replace(/\D/g, ''))}
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'İşleniyor...' : 'Giriş Yap'}
                        </button>
                    </div>
                </form>
            ) : (
                <form className="space-y-6" onSubmit={handleOtpSubmit}>
                    <div className="text-sm text-gray-600 mb-4">
                        Lütfen <b>{maskedEmail}</b> adresine gönderilen 6 haneli kodu giriniz.
                    </div>
                    <div>
                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                            Doğrulama Kodu (OTP)
                        </label>
                        <div className="mt-1">
                            <input
                                id="otp"
                                name="otp"
                                type="text"
                                required
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Doğrulanıyor...' : 'Doğrula'}
                        </button>
                    </div>

                    <div className="text-center mt-2">
                        <button
                            type="button"
                            onClick={() => setStep('TCKN')}
                            className="text-sm text-indigo-600 hover:text-indigo-500"
                        >
                            Geri Dön
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
