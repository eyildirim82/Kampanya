'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { checkCreditTcknStatus, submitCreditApplication } from '@/app/kampanya/credit-actions';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';

const creditFormSchema = z.object({
    tckn: z.string().length(11, "TCKN 11 haneli olmalıdır."),
    fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
    phone: z.string()
        .min(10, "Telefon numarası eksik girildi")
        .max(14, "Telefon numarası çok uzun")
        .regex(/^5[0-9]{2}\s[0-9]{3}\s[0-9]{2}\s[0-9]{2}$|^5[0-9]{9}$/, "Telefon numarası 5XX XXX XX XX formatında olmalıdır"),

    isDenizbankCustomer: z.enum(['yes', 'no']),

    requestedAmount: z.enum(['1_000_000', '2_000_000', '5_000_000', 'other']),

    phoneSharingConsent: z.boolean().refine(val => val === true, "Telefon numarası paylaşım onayı zorunludur."),
    tcknSharingConsent: z.boolean().refine(val => val === true, "TC Kimlik paylaşım onayı zorunludur."),
});

type FormData = z.infer<typeof creditFormSchema>;

interface CreditFormProps {
    campaignId: string;
}

export default function CreditForm({ campaignId }: CreditFormProps) {
    const searchParams = useSearchParams();
    const initialTckn = searchParams.get('tckn') || '';

    const [stage, setStage] = useState<'INIT' | 'FORM'>('INIT');
    const [isCheckingTckn, setIsCheckingTckn] = useState(false);
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        setValue,
        trigger
    } = useForm<FormData>({
        resolver: zodResolver(creditFormSchema),
        defaultValues: {
            tckn: initialTckn,
            isDenizbankCustomer: undefined,
            requestedAmount: undefined,
            phoneSharingConsent: false,
            tcknSharingConsent: false
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
    });

    const currentTckn = watch('tckn');

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0 && value[0] !== '5') {}
        if (value.length > 10) value = value.slice(0, 10);

        let formatted = value;
        if (value.length > 3) {
            formatted = `${value.slice(0, 3)} ${value.slice(3)}`;
        }
        if (value.length > 6) {
            formatted = `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`;
        }
        if (value.length > 8) {
            formatted = `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6, 8)} ${value.slice(8)}`;
        }

        setValue('phone', formatted, { shouldValidate: true });
    };

    const handleTcknCheck = async () => {
        const isValid = !errors.tckn && currentTckn?.length === 11;
        if (!isValid) {
            trigger('tckn');
            return;
        }

        setIsCheckingTckn(true);
        try {
            const result = await checkCreditTcknStatus(currentTckn, campaignId);
            setIsCheckingTckn(false);

            if (result.status === 'NEW_MEMBER') {
                if (result.sessionToken) setSessionToken(result.sessionToken);
                setStage('FORM');
                toast.success("TCKN doğrulandı.");
            } else if (result.status === 'EXISTS') {
                toast.warning(result.message);
            } else if (result.status === 'NOT_FOUND') {
                toast.error(result.message);
                if (confirm(result.message + "\n\nÜyelik formuna gitmek ister misiniz?")) {
                    window.location.href = 'https://talpa.org/uyelik';
                }
            } else {
                toast.error(result.message || "Hata oluştu.");
            }
        } catch {
            setIsCheckingTckn(false);
            toast.error("Sistem hatası.");
        }
    };

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setSubmitError(null);

        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (key === 'phone' && typeof value === 'string') {
                formData.append(key, value.replace(/\s/g, ''));
            } else {
                formData.append(key, value?.toString() || '');
            }
        });

        if (sessionToken) formData.append('sessionToken', sessionToken);
        formData.append('campaignId', campaignId);

        try {
            const result = await submitCreditApplication({ success: false }, formData);

            if (result.success) {
                setSubmitSuccess(true);
                reset();
                setStage('INIT');
                setSessionToken(null);
            } else {
                setSubmitError(result.message || "İşlem başarısız oldu.");
                toast.error(result.message);
            }
        } catch {
            setSubmitError("Sunucu hatası.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitSuccess) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-xl border-2 border-green-100 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-3">
                    Başvurunuz Alındı!
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                    Kredi talebiniz alınmıştır. Denizbank Yeşilköy Şubesi en kısa sürede sizinle iletişime geçecektir.
                </p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-8 py-3 bg-[#002855] text-white rounded-xl hover:bg-[#003366] transition-all font-semibold"
                >
                    Ana Sayfaya Dön
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 max-w-2xl mx-auto">
            <div className="mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-bold text-center text-[#002855]">
                    Kredi Başvuru Formu
                </h2>
                <p className="text-gray-500 mt-2 text-center text-sm">
                    Lütfen bilgilerinizi eksiksiz doldurunuz.
                </p>
            </div>

            {submitError && (
                <div className="mb-6">
                    <Alert variant="destructive" title="Hata">
                        {submitError}
                    </Alert>
                </div>
            )}

            {stage === 'INIT' && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">TC Kimlik Numaranız?</label>
                        <div className="flex gap-2">
                            <input
                                {...register('tckn')}
                                type="text"
                                maxLength={11}
                                className={clsx(
                                    "flex-1 px-4 py-3 border rounded-xl focus:outline-none transition-all text-gray-900 text-lg tracking-wide",
                                    errors.tckn ? "border-red-500" : "border-gray-300 focus:ring-2 focus:ring-[#002855]"
                                )}
                                placeholder="11 haneli TCKN giriniz"
                            />
                            <button
                                onClick={handleTcknCheck}
                                disabled={isCheckingTckn}
                                type="button"
                                className="bg-[#002855] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#003366] min-w-[120px] flex items-center justify-center transition-colors"
                            >
                                {isCheckingTckn ? (
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : 'Devam Et'}
                            </button>
                        </div>
                        {errors.tckn && <p className="mt-2 text-sm text-red-500 font-medium">{errors.tckn.message}</p>}
                    </div>
                </div>
            )}

            {stage === 'FORM' && (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#002855] text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">TC</div>
                        <div>
                            <span className="block text-xs text-gray-500 font-semibold uppercase">TC Kimlik No</span>
                            <span className="text-lg font-bold text-[#002855] tracking-wider">{currentTckn}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. Adınız soyadınız?</label>
                        <input {...register('fullName')} className="w-full px-4 py-3 border rounded-xl text-gray-900 focus:ring-2 focus:ring-[#002855] border-gray-300" placeholder="Ad Soyad" />
                        {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">2. Telefon numaranız?</label>
                        <input
                            {...register('phone')}
                            onChange={handlePhoneChange}
                            className="w-full px-4 py-3 border rounded-xl text-gray-900 focus:ring-2 focus:ring-[#002855] border-gray-300"
                            placeholder="5XX XXX XX XX"
                        />
                        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">3. Denizbank müşteri durumunuz?</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={clsx(
                                "border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all hover:bg-gray-50",
                                watch('isDenizbankCustomer') === 'yes' ? "border-[#002855] bg-blue-50/30 ring-1 ring-[#002855]" : "border-gray-200"
                            )}>
                                <input type="radio" value="yes" {...register('isDenizbankCustomer')} className="w-5 h-5 accent-[#002855]" />
                                <span className="text-gray-900">Evet, müşteriyim</span>
                            </label>
                            <label className={clsx(
                                "border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all hover:bg-gray-50",
                                watch('isDenizbankCustomer') === 'no' ? "border-[#002855] bg-blue-50/30 ring-1 ring-[#002855]" : "border-gray-200"
                            )}>
                                <input type="radio" value="no" {...register('isDenizbankCustomer')} className="w-5 h-5 accent-[#002855]" />
                                <span className="text-gray-900">Hayır, değilim</span>
                            </label>
                        </div>
                        {errors.isDenizbankCustomer && <p className="text-xs text-red-500 mt-1">{errors.isDenizbankCustomer.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">4. Talep ettiğiniz kredi tutarı?</label>
                        <div className="space-y-2">
                            {['1_000_000', '2_000_000', '5_000_000', 'other'].map((opt) => (
                                <label key={opt} className={clsx(
                                    "border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all hover:bg-gray-50",
                                    watch('requestedAmount') === opt ? "border-[#002855] bg-blue-50/30 ring-1 ring-[#002855]" : "border-gray-200"
                                )}>
                                    <input type="radio" value={opt} {...register('requestedAmount')} className="w-5 h-5 accent-[#002855]" />
                                    <span className="text-gray-900 font-medium">
                                        {opt === 'other' ? 'Diğer' : `${opt.replace(/_/g, '.')} TL`}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {errors.requestedAmount && <p className="text-xs text-red-500 mt-1">{errors.requestedAmount.message}</p>}
                    </div>

                    <div className="pt-4 border-t border-gray-100 bg-gray-50 p-4 rounded-xl space-y-4">
                        <div className="flex items-start">
                            <input type="checkbox" {...register('phoneSharingConsent')} className="w-5 h-5 mt-0.5 accent-[#002855] rounded shrink-0" />
                            <div className="ml-3">
                                <label className="text-sm text-gray-800 font-medium block">
                                    Tarafımla iletişime geçilebilmesi için telefon numaramın Denizbank Yeşilköy Şubesi ile paylaşılmasını onaylıyorum.
                                </label>
                                {errors.phoneSharingConsent && <p className="text-xs text-red-500 mt-1">{errors.phoneSharingConsent.message}</p>}
                            </div>
                        </div>

                        <div className="flex items-start">
                            <input type="checkbox" {...register('tcknSharingConsent')} className="w-5 h-5 mt-0.5 accent-[#002855] rounded shrink-0" />
                            <div className="ml-3">
                                <label className="text-sm text-gray-800 font-medium block">
                                    Adıma kredi teklifi sunulabilmesi için TC Kimlik numaramın Denizbank Yeşilköy şubesi ile paylaşılmasını onaylıyorum.
                                </label>
                                {errors.tcknSharingConsent && <p className="text-xs text-red-500 mt-1">{errors.tcknSharingConsent.message}</p>}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={clsx(
                            "w-full py-4 px-4 rounded-xl text-white font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5",
                            isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-[#002855] to-[#004e8b]"
                        )}
                    >
                        {isSubmitting ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
                    </button>

                    <button type="button" onClick={() => setStage('INIT')} className="w-full text-center text-sm text-gray-500 py-2 hover:text-[#002855]">
                        Geri Dön
                    </button>
                </form>
            )}
        </div>
    );
}
