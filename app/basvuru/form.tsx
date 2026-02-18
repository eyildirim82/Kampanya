'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { submitApplication, verifyTcknAction } from './actions';
import { toast } from 'sonner';
import { Alert } from '@/components/theme/Alert';
import Link from 'next/link';
import { CampaignRecord } from './campaign';
import DynamicFormRenderer, { FormField } from '@/components/DynamicFormRenderer';
import Card from '@/components/theme/Card';
import Button from '@/components/theme/Button';
import Input from '@/components/theme/Input';
import Icon from '@/components/theme/Icon';

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

    // Phone Masking Handler (Not used directly here but kept for logic if needed in dynamic form?)
    // Actually dynamic form handles phone? No, dynamic form handles *extra* fields.
    // Base fields like phone are in...? Wait. 
    // The previous form.tsx had handlePhoneChange but it was not attached to an input in the visible JSX.
    // It seems 'phone' is part of the baseSchema but might be rendered by DynamicFormRenderer if included there,
    // OR it was missing from the previous JSX entirely!
    // Viewing the previous file, 'phone' was in baseSchema but I didn't see a phone input in the JSX for 'FORM' stage.
    // It says `<DynamicFormRenderer ... schema={campaign.extra_fields_schema ...} />`.
    // If 'phone' is not in extra_fields_schema, it's not being rendered.
    // However, I am only porting the theme, not fixing logic bugs unless crucial.
    // I will preserve the existing logic structure.

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
            <Card variant="dark" className="max-w-xl mx-auto mt-8 animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)] border border-emerald-500/20">
                        <Icon name="check" size="xl" className="text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-3">
                        Başvurunuz Alındı!
                    </h3>
                    <p className="text-slate-400 mb-6 max-w-md leading-relaxed">
                        Kampanya başvurunuz başarıyla sistemimize kaydedilmiştir.
                        <br />
                        <strong className="text-white">Private Kart</strong> avantajlarınız için bilgilendirme e-postası tarafınıza gönderilmiştir.
                    </p>
                    <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 mb-6 max-w-md">
                        <p className="text-sm text-blue-200">
                            <strong>Sonraki Adımlar:</strong> DenizBank Yeşilköy Şubesi sizinle iletişime geçecektir.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full">
                        <Link href="/" className="w-full sm:w-auto">
                            <Button fullWidth variant="primary">
                                Ana Sayfaya Dön
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>
        );
    }

    // RENDER
    return (
        <Card variant="dark" className="max-w-2xl mx-auto mt-8">
            <div className="mb-8 border-b border-white/10 pb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                        <Icon name="flight_takeoff" size="md" className="text-white -rotate-45" />
                    </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-center">
                    <span className="bg-gradient-to-r from-white via-blue-100 to-slate-300 bg-clip-text text-transparent">
                        Kampanya Başvuru Formu
                    </span>
                </h2>
                <p className="text-slate-400 mt-2 text-center text-sm">Lütfen bilgilerinizi doğrulayarak başlayınız.</p>
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
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">T.C. Kimlik Numarası</label>
                        <div className="flex gap-3 items-start">
                            <div className="flex-1">
                                <Input
                                    {...register('tckn')}
                                    placeholder="11 haneli T.C. Kimlik No"
                                    maxLength={11}
                                    error={errors.tckn?.message}
                                />
                            </div>
                            <Button
                                onClick={handleTcknCheck}
                                disabled={isCheckingTckn}
                                isLoading={isCheckingTckn}
                                type="button"
                                variant="primary"
                                className="h-11" // Match Input height
                            >
                                Doğrula
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* STAGE: FORM (Main Form) */}
            {stage === 'FORM' && (
                <div className="mt-6 animate-in slide-in-from-bottom-2 fade-in">
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
                            className="text-sm text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto group"
                        >
                            <Icon name="chevron_left" size="sm" className="group-hover:-translate-x-0.5 transition-transform" />
                            Çıkış / Başa Dön
                        </button>
                    </div>
                </div>
            )}

            {/* Disclaimer Section */}
            <div className="mt-8 p-5 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <Icon name="search" size="sm" className="text-amber-500" />
                    Önemli Uyarı ve Sorumluluk Reddi
                </h4>
                <div className="text-xs text-slate-500 leading-relaxed space-y-2">
                    <p>
                        Bu kampanyada yer alan hiçbir husus <strong className="text-slate-400">TALPA</strong>&apos;nın resmi görüşü kabul edilemez.
                        TALPA&apos;nın bu kampanyada yer alan reklam ve ilanların, reklam vereni, reklama konu mal ya da hizmet,
                        reklamın içeriği vs. gibi konuların hiçbirisi üzerinde doğrudan kontrol hakkı ve olanağı bulunmamaktadır.
                    </p>
                    <p>
                        Bir başka ifade ile TALPA&apos;nın iş bu kampanyada yer alan reklamların yayımlanması dışında söz konusu reklam
                        içeriği ve/veya reklamveren ile herhangi bir bağlantısı işbirliği veya ortaklığı bulunmamaktadır.
                    </p>
                    <p className="font-semibold text-slate-400">
                        Reklam ve ilanlara konu mal veya hizmet sunulması ile ilgili her türlü hukuki veya cezai sorumluluk
                        reklam verene aittir.
                    </p>
                </div>
            </div>
        </Card>
    );
}
