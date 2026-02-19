import React from 'react';
import { twMerge } from 'tailwind-merge';

interface GlassPanelProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'card' | 'light' | 'header';
    blur?: 'sm' | 'md' | 'lg';
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    rounded?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const GlassPanel: React.FC<GlassPanelProps> = ({
    children,
    className,
    variant = 'default',
    blur = 'md',
    padding = 'md',
    rounded = 'xl',
}) => {
    const variants = {
        default: 'bg-[rgba(25,34,51,0.7)] border border-[rgba(0,45,114,0.1)] shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        card: 'bg-[rgba(255,255,255,0.04)] border border-[rgba(0,45,114,0.1)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(0,45,114,0.2)] transition-all duration-300',
        light: 'bg-white/70 border border-[rgba(0,45,114,0.1)] shadow-[0_8px_32px_rgba(0,0,0,0.08)]',
        header: 'bg-[rgba(0,45,114,0.08)] border-b border-[rgba(0,45,114,0.1)]',
    };

    const blurs = {
        sm: 'backdrop-blur-[8px]',
        md: 'backdrop-blur-[12px]',
        lg: 'backdrop-blur-xl',
    };

    const paddings = {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
    };

    const roundedMap = {
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl',
    };

    return (
        <div className={twMerge(
            variants[variant],
            blurs[blur],
            paddings[padding],
            roundedMap[rounded],
            className
        )}>
            {children}
        </div>
    );
};

export default GlassPanel;
