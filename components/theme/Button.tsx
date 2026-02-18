'use client';

import React, { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import Icon from './Icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    isLoading?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    icon?: string;
    iconPosition?: 'left' | 'right';
    animated?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    icon,
    iconPosition = 'left',
    animated = false,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-bold tracking-tight transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-xl relative overflow-hidden";

    const variants = {
        primary: "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]",
        secondary: "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-md",
        ghost: "text-primary hover:bg-primary/5 dark:text-primary-light dark:hover:bg-primary/10",
        danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
        outline: "border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5",
    };

    const sizes = {
        xs: "h-7 px-2.5 text-[10px] uppercase tracking-wider rounded-lg gap-1",
        sm: "h-9 px-4 text-xs uppercase tracking-wider gap-1.5",
        md: "h-11 px-6 text-sm gap-2",
        lg: "h-14 px-8 text-base gap-2.5",
        xl: "h-16 px-10 text-lg gap-3",
    };

    const iconSizeMap: Record<string, string> = {
        xs: 'xs',
        sm: 'sm',
        md: 'sm',
        lg: 'md',
        xl: 'md',
    };

    const widthClass = fullWidth ? "w-full" : "";

    const renderIcon = () => {
        if (icon) {
            return <Icon name={icon} size={iconSizeMap[size] as 'xs' | 'sm' | 'md'} />;
        }
        return null;
    };

    const buttonClass = twMerge(baseStyles, variants[variant], sizes[size], widthClass, className);

    return (
        <button
            className={buttonClass}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <Icon name="progress_activity" className="animate-spin" size={iconSizeMap[size] as 'xs' | 'sm' | 'md'} />
            )}
            {!isLoading && iconPosition === 'left' && (leftIcon || renderIcon())}
            {!isLoading && leftIcon && !icon && iconPosition === 'left' && null}
            <span className="relative z-10">{children}</span>
            {!isLoading && iconPosition === 'right' && (rightIcon || (icon && iconPosition === 'right' ? renderIcon() : null))}

            {animated && variant === 'primary' && !isLoading && !disabled && (
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            )}
        </button>
    );
};

export { Button };
export default Button;
