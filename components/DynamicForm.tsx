'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { submitDynamicApplication } from '../app/actions';

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
    initialData?: Record<string, unknown>;
}

export default function DynamicForm({ schema, campaignId }: DynamicFormProps) {
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

        try {
            const result = await submitDynamicApplication(campaignId, data);

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
            <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
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
                    className="mt-8 text-sm font-medium text-[#002855] hover:text-[#004080] underline underline-offset-4"
                >
                    Yeni Başvuru Yap
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {schema.map((field) => {
                    const widthClass =
                        field.width === 'half' ? 'md:col-span-1' :
                            field.width === 'third' ? 'md:col-span-1 lg:col-span-1' :
                                'md:col-span-2';

                    const hasError = !!errors[field.name];

                    return (
                        <div key={field.id} className={`${widthClass} col-span-1`}>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === 'textarea' ? (
                                <textarea
                                    {...register(field.name)}
                                    placeholder={field.placeholder}
                                    rows={4}
                                    className={`w-full border rounded-lg px-4 py-2.5 outline-none transition-all ${hasError
                                            ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                                            : 'border-gray-300 focus:border-[#002855] focus:ring-2 focus:ring-[#002855]/20'
                                        }`}
                                />
                            ) : field.type === 'select' ? (
                                <div className="relative">
                                    <select
                                        {...register(field.name)}
                                        className={`w-full border rounded-lg px-4 py-2.5 outline-none appearance-none bg-white transition-all ${hasError
                                                ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                                                : 'border-gray-300 focus:border-[#002855] focus:ring-2 focus:ring-[#002855]/20'
                                            }`}
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
                            ) : field.type === 'checkbox' ? (
                                <div className="flex items-start gap-3 mt-1 p-1">
                                    <div className="flex items-center h-5">
                                        <input
                                            type="checkbox"
                                            {...register(field.name)}
                                            id={`field_${field.id}`}
                                            className={`w-4 h-4 text-[#002855] border-gray-300 rounded focus:ring-[#002855] ${hasError ? 'border-red-500' : ''
                                                }`}
                                        />
                                    </div>
                                    <div className="text-sm">
                                        <label htmlFor={`field_${field.id}`} className="font-medium text-gray-700 select-none cursor-pointer">
                                            {field.placeholder || field.label}
                                        </label>
                                        {hasError && <p className="text-red-500 text-xs mt-1">{errors[field.name]?.message as string}</p>}
                                    </div>
                                </div>
                            ) : (
                                <input
                                    type={field.type}
                                    {...register(field.name)}
                                    placeholder={field.placeholder}
                                    className={`w-full border rounded-lg px-4 py-2.5 outline-none transition-all ${hasError
                                            ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                                            : 'border-gray-300 focus:border-[#002855] focus:ring-2 focus:ring-[#002855]/20'
                                        }`}
                                />
                            )}

                            {field.type !== 'checkbox' && hasError && (
                                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {errors[field.name]?.message as string}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="pt-6">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#002855] text-white font-bold py-3.5 px-6 rounded-xl hover:bg-[#003366] active:scale-[0.99] transition-all disabled:opacity-70 disabled:active:scale-100 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            İşleniyor...
                        </>
                    ) : (
                        'Başvuruyu Tamamla'
                    )}
                </button>
            </div>
        </form>
    );
}
