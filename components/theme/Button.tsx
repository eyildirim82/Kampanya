import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-medium tracking-tight transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-talpa-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none rounded-lg active:scale-95 relative overflow-hidden";

    const variants = {
        // Primary: Deniz Red for Critical Actions (Cockpit Switch feel)
        primary: "bg-deniz-red text-white hover:bg-deniz-dark border border-transparent shadow-[0_0_15px_rgba(227,6,19,0.4)] hover:shadow-[0_0_25px_rgba(227,6,19,0.6)]",
        // Secondary: Glass/Navy for Navigation/Info
        secondary: "bg-white/10 text-white backdrop-blur-md border border-white/10 hover:bg-white/20 hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]",
        // Danger: Darker red
        danger: "bg-red-900/50 text-red-200 border border-red-800 hover:bg-red-900",
        // Ghost: Text only
        ghost: "text-slate-400 hover:text-white hover:bg-white/5",
        // Outline: Tech Blue
        outline: "border border-talpa-accent/50 text-talpa-accent hover:bg-talpa-accent/10 hover:border-talpa-accent"
    };

    const sizes = {
        sm: "h-8 px-3 text-xs uppercase tracking-wider font-bold",
        md: "h-11 px-6 text-sm",
        lg: "h-14 px-8 text-base font-semibold"
    };

    const widthClass = fullWidth ? "w-full" : "";

    // Merge classes using twMerge to handle conflicts elegantly
    const buttonClass = twMerge(baseStyles, variants[variant], sizes[size], widthClass, className);

    return (
        <button
            className={buttonClass}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoading && leftIcon && <span className="mr-2.5 opacity-90">{leftIcon}</span>}
            <span className="relative z-10">{children}</span>
            {!isLoading && rightIcon && <span className="ml-2.5 opacity-90">{rightIcon}</span>}

            {/* Shine Effect for Primary */}
            {variant === 'primary' && !isLoading && !disabled && (
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
            )}
        </button>
    );
};

export default Button;
