'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { submitInterest } from '../actions';
import clsx from 'clsx';
import { toast } from 'sonner';

const interestSchema = z.object({
    fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
    email: z.string().email("Geçerli bir e-posta adresi giriniz."),
    phone: z.string().optional(),

    tckn: z.string().length(11, "TCKN 11 haneli olmalıdır."),
    note: z.string().optional()
});

type FormData = z.infer<typeof interestSchema>;

const INTEREST_FORM_KEYS: (keyof FormData)[] = ['fullName', 'email', 'phone', 'tckn', 'note'];

export default function InterestForm({ campaignId }: { campaignId: string }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setError
    } = useForm<FormData>({
        resolver: zodResolver(interestSchema),
    });

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setServerError(null);

        const formData = new FormData();
        formData.append('campaignId', campaignId);
        formData.append('fullName', data.fullName);
        formData.append('email', data.email);
        if (data.phone) formData.append('phone', data.phone);
        formData.append('tckn', data.tckn);
        if (data.note) formData.append('note', data.note);

        try {
            const result = await submitInterest({ success: false }, formData);

            if (result.success) {
                setSubmitSuccess(true);
                toast.success('Talebiniz alınmıştır.');
                reset();
            } else {
                setServerError(result.message || 'Bir hata oluştu.');
                toast.error(result.message || 'Bir hata oluştu.');
                // Sunucudan dönen alan hatalarını ilgili inputlara eşle
                if (result.errors && typeof result.errors === 'object') {
                    for (const [field, messages] of Object.entries(result.errors)) {
                        const msg = Array.isArray(messages) ? messages[0] : String(messages);
                        if (INTEREST_FORM_KEYS.includes(field as keyof FormData) && msg) {
                            setError(field as keyof FormData, { type: 'server', message: msg });
                        }
                    }
                }
            }
        } catch {
            setServerError('Bağlantı hatası.');
            toast.error('Bağlantı hatası.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitSuccess) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center animate-in fade-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-2">Talebiniz Alındı</h3>
                <p className="text-green-700">
                    İlginiz için teşekkür ederiz. Kampanya detayları netleştiğinde sizinle iletişime geçeceğiz.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="text-green-700 font-medium hover:text-green-900 underline"
                    >
                        Ana Sayfaya Dön
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                    {serverError}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
                <input
                    {...register('fullName')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="Adınız Soyadınız"
                />
                {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta Adresi *</label>
                <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="ornek@email.com"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon (İsteğe bağlı)</label>
                <input
                    {...register('phone')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="05XX XXX XX XX"
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">T.C. Kimlik No *</label>
                <input
                    {...register('tckn')}
                    maxLength={11}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="***********"
                />
                <p className="text-xs text-gray-700 mt-1">Üye doğrulaması için gereklidir.</p>
                {errors.tckn && <p className="text-xs text-red-500 mt-1">{errors.tckn.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notunuz (İsteğe bağlı)</label>
                <textarea
                    {...register('note')}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="Varsa eklemek istedikleriniz..."
                />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className={clsx(
                    "w-full py-3 px-4 rounded-lg text-white font-medium transition-colors shadow-md",
                    isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-talpa-navy hover:bg-talpa-navy/80"
                )}
            >
                {isSubmitting ? 'Gönderiliyor...' : 'Talep Oluştur'}
            </button>
        </form>
    );
}
