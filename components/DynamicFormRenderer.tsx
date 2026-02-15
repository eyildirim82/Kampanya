'use client';

import React, { useMemo } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import clsx from 'clsx';

export type FieldType = 'input' | 'select' | 'textarea';

export interface FormField {
    id: string;
    label: string;
    type: FieldType;
    is_required?: boolean;
    options?: string[];
    placeholder?: string;
    description?: string;
    validation_rules?: {
        min?: number;
        max?: number;
        pattern?: string;
        pattern_message?: string;
    };
}

interface DynamicFormRendererProps {
    schema: FormField[];
    onSubmit: (data: any) => void;
    isSubmitting?: boolean;
    submitButtonText?: string;
    initialData?: Record<string, any>;
}

/**
 * Utility to generate a Zod schema from the field definitions.
 */
function generateZodSchema(fields: FormField[]) {
    const shape: Record<string, z.ZodTypeAny> = {};

    fields.forEach((field) => {
        let validator: z.ZodTypeAny;

        switch (field.type) {
            case 'input':
            case 'textarea':
                validator = z.string();
                if (field.is_required) {
                    validator = (validator as z.ZodString).min(1, `${field.label} alanı zorunludur.`);
                } else {
                    validator = validator.optional().or(z.literal(''));
                }

                // Apply additional validation rules
                if (field.validation_rules) {
                    const { min, max, pattern, pattern_message } = field.validation_rules;
                    if (min !== undefined && validator instanceof z.ZodString) {
                        validator = validator.min(min, `${field.label} en az ${min} karakter olmalıdır.`);
                    }
                    if (max !== undefined && validator instanceof z.ZodString) {
                        validator = validator.max(max, `${field.label} en fazla ${max} karakter olmalıdır.`);
                    }
                    if (pattern && validator instanceof z.ZodString) {
                        validator = validator.regex(new RegExp(pattern), pattern_message || `${field.label} formatı geçersiz.`);
                    }
                }
                break;
            case 'select':
                validator = z.string();
                if (field.is_required) {
                    validator = (validator as z.ZodString).min(1, `${field.label} seçimi zorunludur.`);
                } else {
                    validator = validator.optional().or(z.literal(''));
                }
                break;
            default:
                validator = z.any();
        }

        shape[field.id] = validator;
    });

    return z.object(shape);
}

export default function DynamicFormRenderer({
    schema,
    onSubmit,
    isSubmitting = false,
    submitButtonText = 'Gönder',
    initialData = {}
}: DynamicFormRendererProps) {
    const formSchema = useMemo(() => generateZodSchema(schema), [schema]);

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: initialData
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 gap-6">
                {schema.map((field) => {
                    const hasError = !!errors[field.id];

                    return (
                        <div key={field.id} className="w-full">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                                {field.label}
                                {field.is_required && <span className="text-[#E30613] font-bold">*</span>}
                            </label>

                            {field.type === 'textarea' ? (
                                <textarea
                                    {...register(field.id)}
                                    placeholder={field.placeholder}
                                    rows={4}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border transition-all outline-none resize-none bg-white",
                                        hasError
                                            ? "border-[#E30613] bg-red-50/30 focus:ring-4 focus:ring-red-100"
                                            : "border-slate-200 focus:border-[#002855] focus:ring-4 focus:ring-[#002855]/10 hover:border-slate-300"
                                    )}
                                />
                            ) : field.type === 'select' ? (
                                <div className="relative group">
                                    <select
                                        {...register(field.id)}
                                        className={clsx(
                                            "w-full px-4 py-2.5 rounded-xl border transition-all outline-none appearance-none bg-white",
                                            hasError
                                                ? "border-[#E30613] bg-red-50/30 focus:ring-4 focus:ring-red-100"
                                                : "border-slate-200 focus:border-[#002855] focus:ring-4 focus:ring-[#002855]/10 group-hover:border-slate-300"
                                        )}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {field.options?.map((opt, idx) => (
                                            <option key={idx} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <input
                                    {...register(field.id)}
                                    type="text"
                                    placeholder={field.placeholder}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border transition-all outline-none bg-white",
                                        hasError
                                            ? "border-[#E30613] bg-red-50/30 focus:ring-4 focus:ring-red-100"
                                            : "border-slate-200 focus:border-[#002855] focus:ring-4 focus:ring-[#002855]/10 hover:border-slate-300"
                                    )}
                                />
                            )}

                            {field.description && (
                                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed italic">
                                    {field.description}
                                </p>
                            )}

                            {hasError && (
                                <p className="mt-1.5 text-sm text-[#E30613] font-medium flex items-center gap-1.5 animate-in slide-in-from-top-1">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {errors[field.id]?.message as string}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={clsx(
                        "w-full py-4 px-6 rounded-xl font-bold text-white transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2",
                        "bg-gradient-to-r from-[#002855] to-[#E30613] hover:brightness-110 shadow-indigo-900/20"
                    )}
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            İşleniyor...
                        </>
                    ) : (
                        submitButtonText
                    )}
                </button>
            </div>
        </form>
    );
}
