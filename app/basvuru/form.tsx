'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { submitApplication, verifyTcknAction } from './actions';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { CampaignRecord } from './campaign';
import DynamicFormRenderer, { FormField } from '@/components/DynamicFormRenderer';

// Base Schema with updated fields
const baseSchema = z.object({
    tckn: z.string().length(11, "TCKN 11 haneli olmalıdır."),
    fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
    phone: z.string()
        .min(10, "Telefon numarası eksik girildi")
        .max(14, "Telefon numarası çok uzun") // 10 digits + 4 spaces
        .regex(/^5[0-9]{2}\s[0-9]{3}\s[0-9]{2}\s[0-9]{2}$|^5[0-9]{9}$/, "Telefon numarası 5XX XXX XX XX formatında olmalıdır"),
    email: z.string().email("Geçerli bir e-posta adresi giriniz.").optional(),

    // Address field - required if delivery is 'address'
    address: z.string().optional(),

    // Delivery Method
    deliveryMethod: z.enum(['branch', 'address']),

    // New Consents (3 fields only)
    addressSharingConsent: z.boolean(),
    cardApplicationConsent: z.boolean().refine(val => val === true,
        "Kart başvurusu onayı zorunludur."),
    tcknPhoneSharingConsent: z.boolean().refine(val => val === true,
        "TC kimlik ve telefon paylaşım onayı zorunludur."),
}).superRefine((data, ctx) => {
    // Delivery method validation
    if (!data.deliveryMethod) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Teslimat yöntemi seçiniz.",
            path: ["deliveryMethod"]
        });
    }

    // If delivery is 'address', address field is required
    if (data.deliveryMethod === 'address') {
        if (!data.address || data.address.length < 10) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Teslimat adresi için geçerli bir adres giriniz (en az 10 karakter, tam adres).",
                path: ["address"]
            });
        }
        // Address sharing consent is required if delivery is 'address'
        if (!data.addressSharingConsent) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Adres paylaşımı onayı zorunludur.",
                path: ["addressSharingConsent"]
            });
        }
    }
});

type FormData = z.infer<typeof baseSchema>;

export default function ApplicationForm({ campaign }: { campaign: CampaignRecord }) {
    const campaignId = campaign.id;
    const searchParams = useSearchParams();
    const initialTckn = searchParams.get('tckn') || '';

    // Stages: 'INIT' -> 'FORM'
    const [stage, setStage] = useState<'INIT' | 'FORM'>('INIT');
    const [isCheckingTckn, setIsCheckingTckn] = useState(false);

    // Session Security
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
        resolver: zodResolver(baseSchema),
        defaultValues: {
            tckn: initialTckn,
            deliveryMethod: undefined,
            addressSharingConsent: false,
            cardApplicationConsent: false,
            tcknPhoneSharingConsent: false
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
    });

    const currentTckn = watch('tckn');
    const deliveryMethod = watch('deliveryMethod');

    // Phone Masking Handler
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits

        // Ensure it starts with 5 if anything is typed
        if (value.length > 0 && value[0] !== '5') {
            // value = '5' + value; // Optionally force it, or just let user type. 
            // Better UX: limit length to 10 digits
        }
        if (value.length > 10) value = value.slice(0, 10);

        // Format: 5XX XXX XX XX
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

    // Handle TCKN Check
    const handleTcknCheck = async () => {
        const isValid = !errors.tckn && currentTckn?.length === 11; // Basic checks
        if (!isValid) {
            trigger('tckn');
            return;
        }

        setIsCheckingTckn(true);
        const result = await verifyTcknAction(currentTckn, campaignId);
        setIsCheckingTckn(false);

        if (result.status === 'RATE_LIMIT') {
            toast.error(result.message);
        } else if (result.status === 'INVALID') {
            toast.error(result.message);
        } else if (result.status === 'NOT_FOUND') {
            if (confirm(result.message + "\n\nÜyelik formuna gitmek ister misiniz?")) {
                window.location.href = 'https://talpa.org/uyelik';
            }
        } else if (result.status === 'EXISTS') {
            toast.warning(result.message);
        } else if (result.status === 'BLOCKED') {
            toast.error(result.message);
        } else if (result.status === 'SUCCESS') {
            if (result.sessionToken) setSessionToken(result.sessionToken);
            setStage('FORM');
        } else {
            toast.error('Sorgulama başarısız oldu: ' + (result.message || 'Bilinmeyen hata'));
        }
    };

    const handleDynamicSubmit = async (data: any) => {
        setIsSubmitting(true);
        setSubmitError(null);

        const formData = new FormData();
        // Add form fields
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, String(value ?? ''));
        });

        // Add orchestration fields
        if (sessionToken) formData.append('sessionToken', sessionToken);
        if (campaignId) formData.append('campaignId', campaignId);
        formData.append('tckn', currentTckn);

        try {
            const result = await submitApplication({ success: false }, formData);

            if (result.success) {
                setSubmitSuccess(true);
                reset();
                setStage('INIT');
                setSessionToken(null);
            } else {
                setSubmitError(result.message || "İşlem başarısız oldu. Lütfen tekrar deneyiniz.");
                toast.error(result.message);
            }
        } catch (err) {
            console.error(err);
            setSubmitError("Bağlantı hatası veya sunucu kaynaklı bir sorun oluştu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitSuccess) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-2xl border-2 border-green-200 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent mb-3">
                    Başvurunuz Alındı!
                </h3>
                <p className="text-gray-600 mb-6 max-w-md leading-relaxed">
                    Kampanya başvurunuz başarıyla sistemimize kaydedilmiştir.
                    <br />
                    <strong>Private Kart</strong> avantajlarınız için bilgilendirme e-postası tarafınıza gönderilmiştir.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md">
                    <p className="text-sm text-blue-800">
                        <strong>Sonraki Adımlar:</strong> DenizBank Yeşilköy Şubesi sizinle iletişime geçecektir.
                    </p>
                </div>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-8 py-3 bg-gradient-to-r from-[#002855] to-[#0066CC] text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                    Ana Sayfaya Dön
                </button>
            </div>
        );
    }

    // RENDER
    return (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 max-w-2xl mx-auto">
            <div className="mb-6 border-b border-gray-100 pb-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#002855] to-[#0066CC] rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-center">
                    <span className="bg-gradient-to-r from-[#002855] to-[#0066CC] bg-clip-text text-transparent">
                        Kampanya Başvuru Formu
                    </span>
                </h2>
                <p className="text-gray-500 mt-2 text-center">Lütfen bilgilerinizi doğrulayarak başlayınız.</p>
            </div>

            {submitError && (
                <div className="mb-6">
                    <Alert variant="destructive" title="Başvuru Hatası">
                        {submitError}
                    </Alert>
                </div>
            )}

            {/* STAGE: INIT (TCKN Entry) */}
            {stage === 'INIT' && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">T.C. Kimlik Numarası</label>
                        <div className="flex gap-2">
                            <input
                                {...register('tckn')}
                                type="text"
                                maxLength={11}
                                className={clsx(
                                    "flex-1 px-4 py-2 border rounded-lg focus:outline-none transition-all text-gray-900",
                                    errors.tckn ? "border-red-500" : "border-gray-300 focus:ring-2 focus:ring-[#002855]"
                                )}
                            />
                            <button
                                onClick={handleTcknCheck}
                                disabled={isCheckingTckn}
                                type="button"
                                className="bg-[#002855] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#003366] min-w-[100px] flex items-center justify-center"
                            >
                                {isCheckingTckn ? (
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : 'Doğrula'}
                            </button>
                        </div>
                        {errors.tckn && <p className="mt-1 text-xs text-red-500">{errors.tckn.message}</p>}
                    </div>
                </div>
            )}

            {/* STAGE: FORM (Main Form) */}
            {stage === 'FORM' && (
                <div className="mt-6">
                    <DynamicFormRenderer
                        schema={campaign.extra_fields_schema as FormField[] || []}
                        onSubmit={handleDynamicSubmit}
                        isSubmitting={isSubmitting}
                        submitButtonText="Başvuruyu Tamamla"
                        initialData={{ tckn: currentTckn }}
                    />
                    <div className="text-center mt-6">
                        <button
                            type="button"
                            onClick={() => setStage('INIT')}
                            className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto group"
                        >
                            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Çıkış / Başa Dön
                        </button>
                    </div>
                </div>
            )}

            {/* Disclaimer Section */}
            <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Önemli Uyarı ve Sorumluluk Reddi
                </h4>
                <div className="text-xs text-gray-600 leading-relaxed space-y-2">
                    <p>
                        Bu kampanyada yer alan hiçbir husus <strong>TALPA</strong>&apos;nın resmi görüşü kabul edilemez.
                        TALPA&apos;nın bu kampanyada yer alan reklam ve ilanların, reklam vereni, reklama konu mal ya da hizmet,
                        reklamın içeriği vs. gibi konuların hiçbirisi üzerinde doğrudan kontrol hakkı ve olanağı bulunmamaktadır.
                    </p>
                    <p>
                        Bir başka ifade ile TALPA&apos;nın iş bu kampanyada yer alan reklamların yayımlanması dışında söz konusu reklam
                        içeriği ve/veya reklamveren ile herhangi bir bağlantısı işbirliği veya ortaklığı bulunmamaktadır.
                    </p>
                    <p className="font-semibold text-gray-800">
                        Reklam ve ilanlara konu mal veya hizmet sunulması ile ilgili her türlü hukuki veya cezai sorumluluk
                        reklam verene aittir.
                    </p>
                </div>
            </div>
        </div >
    );
}
