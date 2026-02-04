'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { submitApplication, checkTcknStatus, verifyOtpAndGetData } from './actions';
import clsx from 'clsx';

// Base Schema with new fields
const baseSchema = z.object({
    tckn: z.string().length(11, "TCKN 11 haneli olmalıdır."),
    fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
    phone: z.string().min(10, "Geçerli bir telefon numarası giriniz."),
    email: z.string().email("Geçerli bir e-posta adresi giriniz."),

    // Address is strictly required if delivery is 'address' - handled in refinement
    // Address is strictly required if delivery is 'address' - handled in refinement
    address: z.string().optional(),

    city: z.string().optional(),
    district: z.string().optional(),

    // Denizbank Config
    isDenizbankCustomer: z.enum(['yes', 'no'], { errorMap: () => ({ message: "Denizbank müşteri durumunuzu seçiniz." }) }),
    deliveryMethod: z.enum(['branch', 'address'], { errorMap: () => ({ message: "Teslimat yöntemi seçiniz." }) }),

    // Consents
    denizbankConsent: z.boolean().refine(val => val === true, "Denizbank Paylaşım İzni'ni onaylamanız gerekmektedir."),
    talpaDisclaimer: z.boolean().refine(val => val === true, "TALPA Sorumluluk Reddi'ni onaylamanız gerekmektedir."),

    kvkkConsent: z.boolean().refine(val => val === true, "KVKK Metni'ni onaylamanız gerekmektedir."),
    openConsent: z.boolean().refine(val => val === true, "Açık Rıza Metni'ni onaylamanız gerekmektedir."),
    communicationConsent: z.boolean().refine(val => val === true, "İletişim İzni'ni onaylamanız gerekmektedir."),
}).superRefine((data, ctx) => {
    if (data.deliveryMethod === 'address') {
        if (!data.address || data.address.length < 5) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Teslimat adresi için geçerli bir adres giriniz (en az 5 karakter).",
                path: ["address"]
            });
        }
        if (!data.city || data.city.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "İl seçiniz.",
                path: ["city"]
            });
        }
        if (!data.district || data.district.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "İlçe seçiniz.",
                path: ["district"]
            });
        }
    }
});

type FormData = z.infer<typeof baseSchema>;

export default function ApplicationForm() {
    const searchParams = useSearchParams();
    const initialTckn = searchParams.get('tckn') || '';

    // Stages: 'INIT' -> 'OTP' -> 'FORM'
    const [stage, setStage] = useState<'INIT' | 'OTP' | 'FORM'>('INIT');
    const [otpCode, setOtpCode] = useState('');
    const [otpError, setOtpError] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [isCheckingTckn, setIsCheckingTckn] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isExistingMember, setIsExistingMember] = useState(false);

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
            isDenizbankCustomer: undefined, // undefined to force selection
            deliveryMethod: undefined,
            kvkkConsent: false,
            openConsent: false,
            communicationConsent: false,
            denizbankConsent: false,
            talpaDisclaimer: false
        } as any,
    });

    const currentTckn = watch('tckn');
    const deliveryMethod = watch('deliveryMethod');

    // Handle TCKN Check
    const handleTcknCheck = async () => {
        const isValid = !errors.tckn && currentTckn?.length === 11; // Basic checks
        if (!isValid) {
            trigger('tckn');
            return;
        }

        setIsCheckingTckn(true);
        // Pass empty campaign ID as we use default
        const result = await checkTcknStatus(currentTckn, '');
        setIsCheckingTckn(false);

        if (result.status === 'INVALID') {
            alert(result.message);
        } else if (result.status === 'NOT_FOUND') {
            alert(result.message);
        } else if (result.status === 'EXISTS_NEEDS_OTP') {
            setMaskedEmail(result.maskedEmail || '');
            setStage('OTP');
        } else if (result.status === 'NEW_MEMBER') {
            setIsExistingMember(false);
            setStage('FORM');
        } else {
            alert('Bir hata oluştu: ' + result.message);
        }
    };

    // Handle OTP Verify
    const handleOtpVerify = async () => {
        if (otpCode.length !== 6) {
            setOtpError('Lütfen 6 haneli kodu giriniz.');
            return;
        }

        setIsVerifyingOtp(true);
        setOtpError('');
        const result = await verifyOtpAndGetData(currentTckn, otpCode, '');
        setIsVerifyingOtp(false);

        if (result.success && result.data) {
            reset(result.data as any);
            setIsExistingMember(true);
            setStage('FORM');
        } else {
            setOtpError(result.message || 'Hatalı kod.');
        }
    };

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setSubmitError(null);

        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, value?.toString() || '');
        });

        // Backend handles default campaignId

        try {
            const result = await submitApplication({ success: false }, formData);

            if (result.success) {
                setSubmitSuccess(true);
                reset();
                setStage('INIT');
            } else {
                setSubmitError(result.message || "Bir hata oluştu.");
            }
        } catch (error) {
            setSubmitError("Beklenmedik bir hata oluştu. Lütfen tekrar deneyiniz.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitSuccess) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-lg border border-green-100 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Başvurunuz Alındı</h3>
                <p className="text-gray-600 mb-6">
                    Kampanya başvurunuz başarıyla sistemimize kaydedilmiştir. Bilgilendirme e-postası tarafınıza gönderilmiştir.
                </p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-2 bg-[#002855] text-white rounded-lg hover:bg-[#003366] transition-colors"
                >
                    Ana Sayfaya Dön
                </button>
            </div>
        );
    }

    // RENDER
    return (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 max-w-2xl mx-auto">
            <div className="mb-8 border-b border-gray-100 pb-4">
                <h2 className="text-2xl md:text-3xl font-bold text-[#002855]">Kampanya Başvuru Formu</h2>
                <p className="text-gray-500 mt-2">Lütfen bilgilerinizi doğrulayarak başlayınız.</p>
            </div>

            {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start text-red-700">
                    <span>{submitError}</span>
                </div>
            )}

            {/* STAGE: INIT (TCKN Entry) */}
            {(stage === 'INIT' || stage === 'OTP') && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">T.C. Kimlik Numarası</label>
                        <div className="flex gap-2">
                            <input
                                {...register('tckn')}
                                type="text"
                                maxLength={11}
                                disabled={stage === 'OTP'}
                                className={clsx(
                                    "flex-1 px-4 py-2 border rounded-lg focus:outline-none transition-all text-gray-900",
                                    errors.tckn ? "border-red-500" : "border-gray-300 focus:ring-2 focus:ring-[#002855]"
                                )}
                            />
                            {stage === 'INIT' && (
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
                            )}
                        </div>
                        {errors.tckn && <p className="mt-1 text-xs text-red-500">{errors.tckn.message}</p>}
                    </div>

                    {/* OTP SECTION */}
                    {stage === 'OTP' && (
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 animate-in slide-in-from-top-2">
                            <h4 className="font-semibold text-[#002855] mb-2">Doğrulama Kodu</h4>
                            <p className="text-sm text-gray-600 mb-4">
                                {maskedEmail} adresine gönderilen 6 haneli kodu giriniz.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="XXXXXX"
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center tracking-widest font-mono text-lg text-gray-900"
                                />
                                <button
                                    onClick={handleOtpVerify}
                                    disabled={isVerifyingOtp}
                                    type="button"
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 min-w-[100px]"
                                >
                                    {isVerifyingOtp ? '...' : 'Onayla'}
                                </button>
                            </div>
                            {otpError && <p className="text-xs text-red-600 mt-2 font-medium">{otpError}</p>}
                            <div className="mt-2 text-right">
                                <button onClick={() => setStage('INIT')} className="text-xs text-gray-500 underline">Farklı TCKN ile dene</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* STAGE: FORM (Main Form) */}
            {stage === 'FORM' && (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6 animate-in fade-in">

                    {/* INFO BLOCK */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">T.C. Kimlik Numarası</label>
                                <input {...register('tckn')} disabled className="w-full bg-transparent border-none p-0 font-semibold text-gray-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Ad Soyad</label>
                                {isExistingMember ? (
                                    <input {...register('fullName')} disabled className="w-full bg-transparent border-none p-0 font-semibold text-gray-700" />
                                ) : (
                                    <input {...register('fullName')} className="w-full px-4 py-2 border rounded-lg text-gray-900" placeholder="Ad Soyad" />
                                )}
                                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon {isExistingMember && <span className="text-xs text-gray-400">(Sabit)</span>}</label>
                            <input {...register('phone')} readOnly={isExistingMember} className={clsx("w-full px-4 py-2 border rounded-lg text-gray-900", isExistingMember && "bg-gray-100 text-gray-500")} />
                            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta {isExistingMember && <span className="text-xs text-gray-400">(Sabit)</span>}</label>
                            <input {...register('email')} readOnly={isExistingMember} className={clsx("w-full px-4 py-2 border rounded-lg text-gray-900", isExistingMember && "bg-gray-100 text-gray-500")} />
                            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                        </div>
                    </div>

                    {/* DENIZBANK SPECIFIC FIELDS */}
                    <div className="border-t border-gray-100 pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-[#002855] mb-4">Kart ve Banka Tercihleri</h3>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Denizbank Müşterisi misiniz?</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" value="yes" {...register('isDenizbankCustomer')} className="w-4 h-4 text-[#002855]" />
                                    <span className="text-gray-900 font-medium">Denizbank müşterisiyim</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" value="no" {...register('isDenizbankCustomer')} className="w-4 h-4 text-[#002855]" />
                                    <span className="text-gray-900 font-medium">Denizbank müşterisi değilim</span>
                                </label>
                            </div>
                            {errors.isDenizbankCustomer && <p className="text-xs text-red-500 mt-1">{errors.isDenizbankCustomer.message}</p>}
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Kartınızı nasıl teslim almak istersiniz?</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" value="branch" {...register('deliveryMethod')} className="w-4 h-4 text-[#002855]" />
                                    <span className="text-gray-900 font-medium">Denizbank Yeşilköy Şubesinden</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" value="address" {...register('deliveryMethod')} className="w-4 h-4 text-[#002855]" />
                                    <span className="text-gray-900 font-medium">İkamet adresime kargo ile</span>
                                </label>
                            </div>
                            {errors.deliveryMethod && <p className="text-xs text-red-500 mt-1">{errors.deliveryMethod.message}</p>}
                        </div>
                    </div>

                    {/* ADDRESS SECTION - Conditional */}
                    {(deliveryMethod === 'address' || !deliveryMethod) && (
                        <div className={clsx("animate-in fade-in transition-all duration-300", deliveryMethod !== 'address' && 'opacity-50 pointer-events-none hidden')}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teslimat Adresi</label>
                                <textarea
                                    {...register('address')}
                                    rows={3}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#002855] text-gray-900"
                                    placeholder="Tam adresinizi giriniz..."
                                />
                                {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">İl</label>
                                    <input {...register('city')} className="w-full px-4 py-2 border rounded-lg text-gray-900" />
                                    {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
                                    <input {...register('district')} className="w-full px-4 py-2 border rounded-lg text-gray-900" />
                                    {errors.district && <p className="text-xs text-red-500">{errors.district.message}</p>}
                                </div>
                            </div>
                        </div>
                    )}


                    {/* CONSENTS */}
                    <div className="space-y-4 pt-4 border-t border-gray-100 mt-6 bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-start">
                            <input type="checkbox" {...register('denizbankConsent')} className="w-5 h-5 mt-0.5 text-[#002855] rounded focus:ring-[#002855]" />
                            <div className="ml-3 text-sm">
                                <label className="font-medium text-gray-800">Denizbank Paylaşım İzni</label>
                                <p className="text-gray-600 text-xs mt-1">
                                    TC, cep telefonu ve Ad Soyad bilgilerimin <strong>Denizbank Yeşilköy Şubesi</strong> ile paylaşılmasını onaylıyorum.
                                </p>
                                {errors.denizbankConsent && <p className="text-xs text-red-500 mt-1">{errors.denizbankConsent.message}</p>}
                            </div>
                        </div>

                        <div className="flex items-start">
                            <input type="checkbox" {...register('talpaDisclaimer')} className="w-5 h-5 mt-0.5 text-[#002855] rounded focus:ring-[#002855]" />
                            <div className="ml-3 text-sm">
                                <label className="font-medium text-gray-800">TALPA Sorumluluk Reddi</label>
                                <p className="text-gray-600 text-xs mt-1">
                                    TALPA bu kampanyadan sorumlu tutulamaz.
                                </p>
                                {errors.talpaDisclaimer && <p className="text-xs text-red-500 mt-1">{errors.talpaDisclaimer.message}</p>}
                            </div>
                        </div>

                        <div className="flex items-start">
                            <input type="checkbox" {...register('kvkkConsent')} className="w-4 h-4 mt-1 text-[#002855] rounded" />
                            <div className="ml-3 text-sm">
                                <label className="font-medium text-gray-700">KVKK Metni</label>
                                <p className="text-gray-500 text-xs">Kişisel verilerimin işlenmesini onaylıyorum.</p>
                                {errors.kvkkConsent && <p className="text-xs text-red-500">{errors.kvkkConsent.message}</p>}
                            </div>
                        </div>
                        <div className="flex items-start">
                            <input type="checkbox" {...register('openConsent')} className="w-4 h-4 mt-1 text-[#002855] rounded" />
                            <div className="ml-3 text-sm">
                                <label className="font-medium text-gray-700">Açık Rıza Metni</label>
                                <p className="text-gray-500 text-xs">Onaylıyorum.</p>
                                {errors.openConsent && <p className="text-xs text-red-500">{errors.openConsent.message}</p>}
                            </div>
                        </div>
                        <div className="flex items-start">
                            <input type="checkbox" {...register('communicationConsent')} className="w-4 h-4 mt-1 text-[#002855] rounded" />
                            <div className="ml-3 text-sm">
                                <label className="font-medium text-gray-700">İletişim İzni</label>
                                <p className="text-gray-500 text-xs">Tarafımla iletişime geçilmesini onaylıyorum.</p>
                                {errors.communicationConsent && <p className="text-xs text-red-500">{errors.communicationConsent.message}</p>}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={clsx(
                            "w-full py-3 px-4 rounded-lg text-white font-medium text-lg transition-colors shadow-lg shadow-indigo-200",
                            isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-[#002855] hover:bg-[#003366]"
                        )}
                    >
                        {isSubmitting ? 'İşleniyor...' : (isExistingMember ? 'Bilgileri Güncelle ve Başvur' : 'Başvuruyu Tamamla')}
                    </button>

                    <div className="text-center">
                        <button type="button" onClick={() => setStage('INIT')} className="text-sm text-gray-500 underline hover:text-gray-800">Çıkış / Başa Dön</button>
                    </div>
                </form>
            )}
        </div>
    );
}
