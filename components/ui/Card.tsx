import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'stat' | 'interactive' | 'dark';
    interactive?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    (
        {
            children,
            variant = 'default',
            interactive = false,
            padding = 'md',
            className = '',
            ...props
        },
        ref
    ) => {
        const baseStyles = 'rounded-2xl transition-all duration-300';

        const variants = {
            default: 'bg-white shadow-lg border border-gray-100',
            glass: 'glass',
            stat: 'bg-white shadow-lg border border-gray-100 hover:shadow-md transition-shadow',
            interactive: 'bg-white shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer',
            dark: 'bg-slate-800 border border-slate-700 shadow-2xl',
        };

        const paddingStyles = {
            none: '',
            sm: 'p-4',
            md: 'p-6',
            lg: 'p-8',
        };

        const interactiveStyles = interactive
            ? 'hover:shadow-2xl hover:-translate-y-1 cursor-pointer'
            : '';

        const variantClass = variants[variant];
        const paddingClass = paddingStyles[padding];

        return (
            <div
                ref={ref}
                className={`${baseStyles} ${variantClass} ${paddingClass} ${interactiveStyles} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

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
        <div className={`mb-4 ${className}`} {...props}>
            {title && (
                <h3 className="text-2xl font-bold text-[#002855] mb-1">
                    {title}
                </h3>
            )}
            {subtitle && (
                <p className="text-gray-700 text-sm">{subtitle}</p>
            )}
            {children}
        </div>
    );
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> { }

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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> { }

export const CardFooter: React.FC<CardFooterProps> = ({
    children,
    className = '',
    ...props
}) => {
    return (
        <div className={`mt-6 pt-4 border-t border-gray-100 ${className}`} {...props}>
            {children}
        </div>
    );
};
