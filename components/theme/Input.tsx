import React, { InputHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = '', id, leftIcon, ...props }, ref) => {
        // Generate a secure random ID if not provided, for accessibility linking
        const inputId = id || props.name || Math.random().toString(36).substr(2, 9);
        const hasError = !!error;

        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                        {label}
                        {props.required && <span className="text-deniz-red ml-1">*</span>}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={twMerge(
                            "flex h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-talpa-navy focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all text-slate-900",
                            leftIcon ? 'pl-10' : '',
                            hasError ? 'border-deniz-red focus-visible:ring-deniz-red' : 'border-slate-200 focus:border-talpa-navy',
                            className
                        )}
                        aria-invalid={hasError}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="text-sm font-medium text-deniz-red animate-pulse" role="alert">
                        {error}
                    </p>
                )}
                {helperText && !error && (
                    <p className="text-xs text-slate-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
