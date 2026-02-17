import React from 'react';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'error' | 'outline' | 'ghost' | 'info' | 'default' | 'talpa' | 'denizbank';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    className
}) => {
    const variants = {
        primary: 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm',
        secondary: 'bg-slate-100 text-slate-800 border-slate-200',
        success: 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm',
        warning: 'bg-amber-100 text-amber-800 border-amber-200',
        danger: 'bg-red-100 text-red-800 border-red-200',
        error: 'bg-red-100 text-red-800 border-red-200', // Alias for danger
        outline: 'bg-transparent border-slate-300 text-slate-600',
        ghost: 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100',
        info: 'bg-blue-100 text-blue-800 border-blue-200',
        default: 'bg-slate-100 text-slate-800 border-slate-200', // Alias for secondary
        talpa: 'bg-gradient-to-r from-talpa-navy to-talpa-blue-600 text-white border-transparent',
        denizbank: 'bg-deniz-red text-white border-transparent animate-pulse'
    };

    const sizes = {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-xs px-2.5 py-0.5',
        lg: 'text-sm px-3 py-1'
    };

    return (
        <span className={twMerge(
            'inline-flex items-center justify-center font-medium rounded-full border',
            variants[variant],
            sizes[size],
            className
        )}>
            {children}
        </span>
    );
};

export default Badge;
