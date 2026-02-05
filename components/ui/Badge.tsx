import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'talpa' | 'denizbank';
    size?: 'sm' | 'md' | 'lg';
    dot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    (
        {
            children,
            variant = 'default',
            size = 'md',
            dot = false,
            className = '',
            ...props
        },
        ref
    ) => {
        const baseStyles = 'inline-flex items-center font-semibold rounded-full transition-all';

        const variants = {
            default: 'bg-gray-100 text-gray-700',
            success: 'bg-green-100 text-green-700',
            warning: 'bg-yellow-100 text-yellow-700',
            error: 'bg-red-100 text-red-700',
            info: 'bg-blue-100 text-blue-700',
            talpa: 'bg-gradient-to-r from-[#002855] to-[#0066cc] text-white',
            denizbank: 'bg-[#E30613] text-white pulse-badge',
        };

        const sizes = {
            sm: 'px-2 py-0.5 text-xs gap-1',
            md: 'px-3 py-1 text-sm gap-1.5',
            lg: 'px-4 py-1.5 text-base gap-2',
        };

        const variantClass = variants[variant];
        const sizeClass = sizes[size];

        return (
            <span
                ref={ref}
                className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
                {...props}
            >
                {dot && (
                    <span className="w-2 h-2 rounded-full bg-current opacity-75" />
                )}
                {children}
            </span>
        );
    }
);

Badge.displayName = 'Badge';
