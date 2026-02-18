import React from 'react';
import { twMerge } from 'tailwind-merge';
import Icon from './Icon';

type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'destructive' | 'default';

interface AlertProps {
    variant?: AlertVariant;
    title?: string;
    children: React.ReactNode;
    className?: string;
    glass?: boolean;
}

const resolveVariant = (variant: AlertVariant): 'info' | 'success' | 'warning' | 'error' => {
    if (variant === 'destructive') return 'error';
    if (variant === 'default') return 'info';
    return variant;
};

const Alert: React.FC<AlertProps> = ({
    variant = 'info',
    title,
    children,
    className = '',
    glass = false,
}) => {
    const resolved = resolveVariant(variant);

    const styles = {
        info: glass ? 'bg-blue-500/10 text-blue-200 border-blue-500/20' : 'bg-blue-50 text-blue-900 border-blue-200',
        success: glass ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20' : 'bg-green-50 text-green-900 border-green-200',
        warning: glass ? 'bg-amber-500/10 text-amber-200 border-amber-500/20' : 'bg-amber-50 text-amber-900 border-amber-200',
        error: glass ? 'bg-red-500/10 text-red-200 border-red-500/20' : 'bg-red-50 text-red-900 border-red-200',
    };

    const iconNames: Record<string, string> = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        error: 'error',
    };

    const iconColors = {
        info: glass ? 'text-blue-400' : 'text-blue-600',
        success: glass ? 'text-emerald-400' : 'text-green-600',
        warning: glass ? 'text-amber-400' : 'text-amber-600',
        error: glass ? 'text-red-400' : 'text-red-600',
    };

    return (
        <div className={twMerge(
            'rounded-xl border p-4 flex gap-3',
            glass && 'backdrop-blur-md',
            styles[resolved],
            className
        )} role="alert">
            <div className="shrink-0 pt-0.5">
                <Icon name={iconNames[resolved]} className={iconColors[resolved]} size="sm" />
            </div>
            <div className="flex-1">
                {title && <h5 className="mb-1 font-bold text-sm leading-none tracking-tight">{title}</h5>}
                <div className="text-sm opacity-90">{children}</div>
            </div>
        </div>
    );
};

export { Alert };
export default Alert;
