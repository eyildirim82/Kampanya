'use client';

import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import clsx from 'clsx';
import Button from '@/components/theme/Button';
import Input from '@/components/theme/Input';
import { twMerge } from 'tailwind-merge';

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
                    const errorMessage = errors[field.id]?.message as string;

                    // For 'input' type, use our Theme Input component
                    if (field.type === 'input') {
                        return (
                            <Input
                                key={field.id}
                                label={field.label}
                                {...register(field.id)}
                                placeholder={field.placeholder}
                                error={errorMessage}
                                helperText={field.description}
                                required={field.is_required}
                            />
                        );
                    }

                    // For others, keep manual rendering but update styles
                    return (
                        <div key={field.id} className="w-full space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                {field.label}
                                {field.is_required && <span className="text-[var(--brand-primary)] ml-1">*</span>}
                            </label>

                            {field.type === 'textarea' ? (
                                <textarea
                                    {...register(field.id)}
                                    placeholder={field.placeholder}
                                    rows={4}
                                    className={twMerge(
                                        "w-full px-4 py-2.5 rounded-xl border transition-all outline-none resize-none bg-white text-slate-900",
                                        hasError
                                            ? "border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]"
                                            : "border-slate-200 focus:border-[var(--brand-secondary)] focus:ring-2 focus:ring-[var(--brand-secondary)]"
                                    )}
                                />
                            ) : (
                                <div className="relative group">
                                    <select
                                        {...register(field.id)}
                                        aria-label={field.label}
                                        className={twMerge(
                                            "w-full px-4 py-2.5 rounded-xl border transition-all outline-none appearance-none bg-white text-slate-900",
                                            hasError
                                                ? "border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]"
                                                : "border-slate-200 focus:border-[var(--brand-secondary)] focus:ring-2 focus:ring-[var(--brand-secondary)]"
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
                            )}

                            {field.description && (
                                <p className="text-xs text-slate-500 italic">
                                    {field.description}
                                </p>
                            )}

                            {hasError && (
                                <p className="text-sm font-medium text-[var(--brand-primary)]" role="alert">
                                    {errorMessage}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="pt-4">
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    fullWidth
                    variant="primary"
                    className="h-12 text-lg shadow-xl hover:shadow-2xl"
                >
                    {submitButtonText}
                </Button>
            </div>
        </form>
    );
}
