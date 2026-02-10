import React from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    multiline?: boolean;
    rows?: number;
}

export const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
    (
        {
            label,
            error,
            helperText,
            leftIcon,
            rightIcon,
            multiline = false,
            rows = 3,
            className = '',
            disabled,
            ...props
        },
        ref
    ) => {
        const baseInputStyles = clsx(
            'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            'placeholder:text-gray-400',
            {
                'border-red-300 focus:border-red-500 focus:ring-red-200': error,
                'border-gray-200 focus:border-[#0066cc] focus:ring-[#e6f2ff]': !error,
                'bg-gray-100 cursor-not-allowed': disabled,
                'pl-11': leftIcon,
                'pr-11': rightIcon,
            }
        );

        const InputElement = multiline ? 'textarea' : 'input';

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {label}
                    </label>
                )}

                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {leftIcon}
                        </div>
                    )}

                    <InputElement
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ref={ref as any}
                        className={`${baseInputStyles} ${className}`}
                        disabled={disabled}
                        rows={multiline ? rows : undefined}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        {...(props as any)}
                    />

                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {rightIcon}
                        </div>
                    )}
                </div>

                {error && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </p>
                )}

                {helperText && !error && (
                    <p className="mt-1.5 text-sm text-gray-500">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
