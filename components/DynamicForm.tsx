'use client';

import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { checkTcknStatus, submitApplication } from '../app/basvuru/actions'; // Reuse existing actions for now, or create new dynamic ones?
// Actually we need a dynamic submission action. The existing submitApplication takes fixed FormData.
// We should probably update submitApplication or create a new one.
// Let's assume we update submitApplication to handle dynamic data later.
// For now, let's create a submit helper in this file or imported from a new actions file?
// To avoid circular deps or complex refactors, let's use a new action `submitDynamicApplication`.

import { submitDynamicApplication } from '../app/kampanya/actions'; // We will create this.

interface FormField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'checkbox' | 'textarea';
    required?: boolean;
    placeholder?: string;
    options?: { label: string; value: string }[]; // For select
    className?: string;
}

interface DynamicFormProps {
    schema: FormField[];
    campaignId: string;
    campaignSlug: string;
}

export default function DynamicForm({ schema, campaignId, campaignSlug }: DynamicFormProps) {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const onSubmit = async (data: any) => {
        try {
            const formData = new FormData();
            formData.append('campaignId', campaignId);
            formData.append('campaignSlug', campaignSlug);

            // Append all fields
            Object.entries(data).forEach(([key, value]) => {
                formData.append(key, String(value));
            });

            // We also need TCKN validation logic here ideally?
            // For now, let's just submit data.
            // If TCKN is a field, we might want to check it.

            const result = await submitDynamicApplication(formData);

            if (result.success) {
                setSubmitSuccess(true);
                toast.success('Başvurunuz alındı!');
                reset();
            } else {
                toast.error(result.message || 'Bir hata oluştu.');
            }
        } catch (e) {
            console.error(e);
            toast.error('Sunucu hatası.');
        }
    };

    if (submitSuccess) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center animate-in fade-in">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">Başvurunuz Alındı!</h3>
                <p className="text-green-700">Kaydınız başarıyla oluşturulmuştur.</p>
                <button
                    onClick={() => setSubmitSuccess(false)}
                    className="mt-6 text-green-600 hover:underline text-sm"
                >
                    Yeni Başvuru Yap
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {schema.map((field) => (
                <div key={field.name} className={field.className}>
                    {field.type === 'checkbox' ? (
                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                id={field.name}
                                {...register(field.name, { required: field.required })}
                                className="w-5 h-5 mt-0.5 text-[#002855] rounded focus:ring-[#002855]"
                            />
                            <label htmlFor={field.name} className="ml-3 text-sm text-gray-700">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === 'select' ? (
                                <select
                                    {...register(field.name, { required: field.required })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#002855] border-gray-300"
                                >
                                    <option value="">Seçiniz...</option>
                                    {field.options?.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : field.type === 'textarea' ? (
                                <textarea
                                    {...register(field.name, { required: field.required })}
                                    placeholder={field.placeholder}
                                    rows={4}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#002855] border-gray-300"
                                />
                            ) : (
                                <input
                                    type={field.type}
                                    {...register(field.name, { required: field.required })}
                                    placeholder={field.placeholder}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#002855] border-gray-300"
                                />
                            )}

                            {errors[field.name] && (
                                <p className="text-xs text-red-500 mt-1">Bu alan zorunludur.</p>
                            )}
                        </div>
                    )}
                </div>
            ))}

            <button
                type="submit"
                disabled={isSubmitting}
                className={clsx(
                    "w-full py-3 px-4 rounded-lg text-white font-medium text-lg transition-colors shadow-lg",
                    isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-[#002855] hover:bg-[#003366]"
                )}
            >
                {isSubmitting ? 'Gönderiliyor...' : 'Başvuruyu Tamamla'}
            </button>
        </form>
    );
}
