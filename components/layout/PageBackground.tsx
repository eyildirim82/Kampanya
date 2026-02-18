import React from 'react';
import { twMerge } from 'tailwind-merge';

interface PageBackgroundProps {
    children: React.ReactNode;
    pattern?: 'dots' | 'radar' | 'grid' | 'flight-path' | 'none';
    orbs?: boolean;
    className?: string;
    dark?: boolean;
}

const PageBackground: React.FC<PageBackgroundProps> = ({
    children,
    pattern = 'none',
    orbs = false,
    className,
    dark = true,
}) => {
    const patternClasses: Record<string, string> = {
        dots: 'bg-dot-grid',
        radar: 'radar-sweep',
        grid: 'bg-grid-lines',
        'flight-path': 'bg-flight-path',
        none: '',
    };

    return (
        <div className={twMerge(
            'relative min-h-screen overflow-hidden',
            dark ? 'bg-background-dark text-white' : 'bg-background-light text-slate-900',
            patternClasses[pattern],
            className
        )}>
            {orbs && (
                <>
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute top-3/4 left-3/4 w-48 h-48 bg-accent-glow/5 rounded-full blur-[80px] pointer-events-none" />
                </>
            )}

            {pattern === 'radar' && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0%,rgba(17,82,212,0.06)_10%,transparent_20%)] animate-radar-spin" />
                </div>
            )}

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};

export default PageBackground;
