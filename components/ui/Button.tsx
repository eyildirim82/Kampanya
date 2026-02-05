import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            className = '',
            disabled,
            ...props
        },
        ref
    ) => {
        const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

        const variants = {
            primary: 'bg-gradient-to-r from-[#002855] to-[#0066cc] text-white hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-[#0066cc]',
            secondary: 'bg-white text-[#002855] border-2 border-[#002855] hover:bg-[#e6eef5] hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-[#002855]',
            ghost: 'bg-transparent text-[#002855] hover:bg-[#e6eef5] focus-visible:ring-[#002855]',
            danger: 'bg-gradient-to-r from-[#E30613] to-[#b60512] text-white hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-[#E30613]',
        };

        const sizes = {
            sm: 'px-4 py-2 text-sm gap-2',
            md: 'px-6 py-3 text-base gap-2',
            lg: 'px-8 py-4 text-lg gap-3',
        };

        const variantClass = variants[variant];
        const sizeClass = sizes[size];

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <>
                        <svg
                            className="animate-spin h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        <span>Yükleniyor...</span>
                    </>
                ) : (
                    <>
                        {leftIcon && <span className="flex items-center">{leftIcon}</span>}
                        {children}
                        {rightIcon && <span className="flex items-center">{rightIcon}</span>}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';
