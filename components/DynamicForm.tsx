'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { submitDynamicApplication } from '../app/actions';
import Input from './theme/Input';
import Button from './theme/Button';
import Alert from './theme/Alert';

interface DynamicFormProps {
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
    campaignId?: string;
    /** Session token from TCKN step (required for /kampanya/[slug] flow) */
    sessionToken?: string;
    initialData?: Record<string, unknown>;
}

export default function DynamicForm({ schema, campaignId, sessionToken }: DynamicFormProps) {
    const [isSuccess, setIsSuccess] = useState(false);

    // Dynamic Schema Generation
    const formSchema = useMemo(() => {
        const shape: Record<string, z.ZodTypeAny> = {};

        schema.forEach((field) => {
            let validator: z.ZodTypeAny;

            switch (field.type) {
                case 'email':
                    validator = z.string().email('Geçerli bir e-posta adresi giriniz.');
                    break;
                case 'checkbox':
                    validator = z.boolean();
                    if (field.required) {
                        validator = validator.refine((val) => val === true, 'Bu alanı onaylamanız gerekmektedir.');
                    }
                    break;
                case 'number':
                    validator = z.string().regex(/^\d+$/, 'Sadece rakam giriniz.');
                    break;
                default:
                    validator = z.string();
            }

            if (field.required && field.type !== 'checkbox') {
                if (field.type === 'email' || field.type === 'text' || field.type === 'textarea' || field.type === 'select' || field.type === 'number') {
                    if (validator instanceof z.ZodString) {
                        validator = validator.min(1, `${field.label} zorunludur.`);
                    }
                }
            } else if (!field.required && field.type !== 'checkbox') {
                // Optional fields
                if (validator instanceof z.ZodString) {
                    validator = validator.optional().or(z.literal(''));
                }
            }

            // TCKN Validation Special Case
            if (field.name === 'tckn' || field.name === 'tc') {
                validator = z.string().length(11, 'TCKN 11 haneli olmalıdır.').regex(/^[1-9]\d{10}$/, 'Geçerli bir TCKN giriniz.');
                if (!field.required) {
                    validator = validator.optional().or(z.literal(''));
                }
            }

            // Phone Validation Special Case
            if (field.name === 'phone') {
                validator = z.string().min(10, 'Telefon numarası en az 10 haneli olmalıdır.');
                if (!field.required) {
                    validator = validator.optional().or(z.literal(''));
                }
            }

            shape[field.name] = validator;
        });

        return z.object(shape);
    }, [schema]);

    type FormData = z.infer<typeof formSchema>;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: schema.reduce((acc, field) => {
            if (field.type === 'checkbox') acc[field.name] = false;
            else acc[field.name] = '';
            return acc;
        }, {} as Record<string, any>)
    });

    const onSubmit = async (data: FormData) => {
        if (!campaignId) {
            toast.error('Kampanya ID bulunamadı.');
            return;
        }
        if (!sessionToken) {
            toast.error('Lütfen önce T.C. Kimlik No ile doğrulama yapınız.');
            return;
        }

        try {
            const result = await submitDynamicApplication(campaignId, data, sessionToken);

            if (result.success) {
                toast.success(result.message);
                setIsSuccess(true);
                reset();
            } else {
                toast.error(result.message || 'Bir hata oluştu.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Beklenmedik bir hata oluştu.');
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center py-10 animate-fade-in-up">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Başvurunuz Alındı!</h3>
                <p className="text-lg text-gray-600 max-w-md mx-auto">
                    Başvurunuz başarıyla sistemimize kaydedilmiştir. İlginiz için teşekkür ederiz.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 text-sm font-medium text-talpa-blue-600 hover:text-talpa-blue-800 underline underline-offset-4 transition-colors"
                >
                    Yeni Başvuru Yap
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {schema.map((field) => {
                    const widthClass =
                        field.width === 'half' ? 'md:col-span-1' :
                            field.width === 'third' ? 'md:col-span-1 lg:col-span-1' :
                                'md:col-span-2';

                    const hasError = !!errors[field.name];
                    const errorMessage = errors[field.name]?.message as string;

                    return (
                        <div key={field.id ?? field.name} className={`${widthClass} col-span-1`}>
                            {field.type === 'textarea' ? (
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="text-sm font-medium text-slate-700">
                                        {field.label} {field.required && <span className="text-deniz-red ml-1">*</span>}
                                    </label>
                                    <textarea
                                        {...register(field.name)}
                                        placeholder={field.placeholder}
                                        rows={4}
                                        className={`flex w-full rounded-lg border bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-talpa-navy focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all text-slate-900 ${hasError ? 'border-deniz-red focus-visible:ring-deniz-red' : 'border-slate-200 focus:border-talpa-navy'}`}
                                        aria-invalid={hasError}
                                    />
                                    {hasError && <p className="text-sm font-medium text-deniz-red animate-pulse">{errorMessage}</p>}
                                </div>
                            ) : field.type === 'select' ? (
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="text-sm font-medium text-slate-700">
                                        {field.label} {field.required && <span className="text-deniz-red ml-1">*</span>}
                                    </label>
                                    <div className="relative">
                                        <select
                                            {...register(field.name)}
                                            className={`flex h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-talpa-navy focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all text-slate-900 appearance-none ${hasError ? 'border-deniz-red focus-visible:ring-deniz-red' : 'border-slate-200 focus:border-talpa-navy'}`}
                                            aria-invalid={hasError}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {field.options?.map((opt, i) => (
                                                <option key={i} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                    {hasError && <p className="text-sm font-medium text-deniz-red animate-pulse">{errorMessage}</p>}
                                </div>
                            ) : field.type === 'checkbox' ? (
                                <div className="flex items-start gap-3 mt-1 p-1">
                                    <div className="flex items-center h-5">
                                        <input
                                            type="checkbox"
                                            {...register(field.name)}
                                            id={`field_${field.id ?? field.name}`}
                                            className={`w-4 h-4 text-talpa-navy border-gray-300 rounded focus:ring-talpa-navy cursor-pointer ${hasError ? 'border-deniz-red' : ''}`}
                                        />
                                    </div>
                                    <div className="text-sm">
                                        <label htmlFor={`field_${field.id ?? field.name}`} className="font-medium text-gray-700 select-none cursor-pointer">
                                            {field.placeholder || field.label}
                                        </label>
                                        {hasError && <p className="text-deniz-red text-xs mt-1 font-medium">{errorMessage}</p>}
                                    </div>
                                </div>
                            ) : (
                                <Input
                                    label={field.label}
                                    type={field.type}
                                    placeholder={field.placeholder}
                                    error={errorMessage}
                                    required={field.required}
                                    {...register(field.name)}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="pt-6">
                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                >
                    Başvuruyu Tamamla
                </Button>
            </div>
        </form>
    );
}
