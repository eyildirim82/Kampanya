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
        default: 'bg-[rgba(25,34,51,0.7)] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]',
        card: 'bg-[rgba(255,255,255,0.03)] border border-white/8 hover:bg-[rgba(255,255,255,0.08)] hover:border-primary transition-all duration-300',
        light: 'bg-white/70 border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)]',
        header: 'bg-[rgba(16,22,34,0.8)] border-b border-white/10',
    };

    const blurs = {
        sm: 'backdrop-blur-sm',
        md: 'backdrop-blur-md',
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
