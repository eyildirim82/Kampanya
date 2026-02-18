import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'default' | 'glass' | 'stat' | 'interactive' | 'dark';
    interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({
    children,
    className = '',
    padding = 'md',
    variant = 'default',
    interactive = false,
    ...props
}, ref) => {
    const paddings = {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
    };

    const variants = {
        default: 'bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 shadow-sm',
        glass: 'glass-panel rounded-xl',
        stat: 'bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow',
        interactive: 'bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer',
        dark: 'bg-navy-card border border-navy-border rounded-xl shadow-2xl',
    };

    const interactiveClasses = interactive
        ? 'hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer'
        : '';

    return (
        <div
            ref={ref}
            className={twMerge(
                'relative overflow-hidden',
                variants[variant],
                paddings[padding],
                interactiveClasses,
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
});

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    subtitle?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
    title,
    subtitle,
    children,
    className = '',
    ...props
}) => {
    return (
        <div className={twMerge('mb-4', className)} {...props}>
            {title && (
                <h3 className="text-2xl font-bold text-talpa-navy dark:text-white mb-1">
                    {title}
                </h3>
            )}
            {subtitle && (
                <p className="text-gray-700 dark:text-slate-400 text-sm">{subtitle}</p>
            )}
            {children}
        </div>
    );
};

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody: React.FC<CardBodyProps> = ({
    children,
    className = '',
    ...props
}) => {
    return (
        <div className={className} {...props}>
            {children}
        </div>
    );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter: React.FC<CardFooterProps> = ({
    children,
    className = '',
    ...props
}) => {
    return (
        <div className={twMerge('mt-6 pt-4 border-t border-gray-100 dark:border-white/10', className)} {...props}>
            {children}
        </div>
    );
};

export { Card };
export default Card;
