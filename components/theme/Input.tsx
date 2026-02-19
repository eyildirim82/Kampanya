import React, { InputHTMLAttributes, forwardRef, useId } from 'react';
import { twMerge } from 'tailwind-merge';
import Icon from './Icon';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    errorMessage?: string;
    helperText?: string;
    leftIcon?: string | React.ReactNode;
    rightIcon?: string | React.ReactNode;
    variant?: 'default' | 'glass' | 'rounded';
    inputSize?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, errorMessage, helperText, className = '', id, leftIcon, rightIcon, variant = 'default', inputSize = 'md', ...props }, ref) => {
        const generatedId = useId();
        const inputId = id || props.name || generatedId;
        const hasError = !!(error || errorMessage);
        const displayError = error || errorMessage;

        const variantStyles = {
            default: 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#002D72] focus-visible:ring-2 focus-visible:ring-[#002D72]/25',
            glass: 'bg-slate-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-[#002D72] focus-visible:ring-2 focus-visible:ring-[#002D72]/30',
            rounded: 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-900 dark:text-white placeholder:text-slate-400 rounded-full focus:border-[#002D72] focus-visible:ring-2 focus-visible:ring-[#002D72]/25',
        };

        const sizeStyles = {
            sm: 'h-9 px-3 text-sm',
            md: 'h-11 px-4 text-sm',
            lg: 'h-14 px-4 py-3.5 text-base',
        };

        const renderIcon = (iconProp: string | React.ReactNode, isError = false) => {
            if (typeof iconProp === 'string') {
                return <Icon name={iconProp} size="sm" className={twMerge('text-slate-400 transition-colors group-focus-within:text-primary', isError && 'text-red-400')} />;
            }
            return iconProp;
        };

        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                    >
                        {label}
                        {props.required && <span className="text-primary ml-1">*</span>}
                    </label>
                )}
                <div className="relative group">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                            {renderIcon(leftIcon)}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={twMerge(
                            "flex w-full rounded-lg border ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                            variantStyles[variant],
                            sizeStyles[inputSize],
                            leftIcon ? 'pl-11' : '',
                            rightIcon ? 'pr-11' : '',
                            hasError ? 'border-red-500/50 focus-visible:ring-red-500/30' : '',
                            className
                        )}
                        aria-invalid={hasError}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {renderIcon(rightIcon, hasError)}
                        </div>
                    )}
                </div>
                {displayError && (
                    <p className="text-[10px] font-medium text-red-400 ml-1 flex items-center gap-1" role="alert">
                        <Icon name="error" size="xs" />
                        {displayError}
                    </p>
                )}
                {helperText && !hasError && (
                    <p className="text-xs text-slate-500 ml-1">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
export default Input;
