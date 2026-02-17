import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'tech' | 'glass' | 'solid';
    interactive?: boolean;
}

const Card: React.FC<CardProps> = ({
    children,
    className = '',
    padding = 'md',
    variant = 'tech',
    interactive = false
}) => {
    const paddings = {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10'
    };

    const variants = {
        // High-End Aviation Tech Look
        tech: 'bg-talpa-surface/40 backdrop-blur-md border border-white/10 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.3)]',
        // Standard Glass
        glass: 'bg-white/5 backdrop-blur-sm border border-white/5',
        // Solid for heavy contrast
        solid: 'bg-slate-900 border border-slate-800'
    };

    const interactiveClasses = interactive
        ? 'transition-all duration-500 hover:scale-[1.01] hover:border-white/20 hover:shadow-[0_0_30px_-5px_rgba(56,189,248,0.1)] cursor-pointer'
        : '';

    return (
        <div className={twMerge(
            'relative group rounded-xl overflow-hidden',
            variants[variant],
            paddings[padding],
            interactiveClasses,
            className
        )}>

            {/* Aviation "Crosshair" Corners for Tech Variant */}
            {variant === 'tech' && (
                <>
                    {/* Top Left */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-white/20 rounded-tl-sm transition-colors group-hover:border-talpa-accent/50 pointer-events-none" />
                    {/* Top Right */}
                    <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-white/20 rounded-tr-sm transition-colors group-hover:border-talpa-accent/50 pointer-events-none" />
                    {/* Bottom Left */}
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-white/20 rounded-bl-sm transition-colors group-hover:border-talpa-accent/50 pointer-events-none" />
                    {/* Bottom Right */}
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-white/20 rounded-br-sm transition-colors group-hover:border-talpa-accent/50 pointer-events-none" />
                </>
            )}

            <div className="relative z-10 text-white">
                {children}
            </div>

            {/* Subtle Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>
    );
};

export default Card;
