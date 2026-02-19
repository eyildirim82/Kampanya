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
            dark ? 'bg-background-dark text-white' : 'bg-background text-slate-900',
            patternClasses[pattern],
            className
        )}>
            {/* Subtle mesh gradient (Navy blue tones) - non-interactive depth */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: dark
                        ? 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,45,114,0.12) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0,45,114,0.06) 0%, transparent 45%)'
                        : 'radial-gradient(ellipse 70% 50% at 30% 0%, rgba(0,45,114,0.04) 0%, transparent 50%), radial-gradient(ellipse 50% 30% at 90% 80%, rgba(0,45,114,0.03) 0%, transparent 50%)',
                }}
            />
            {/* Very light noise texture (aviation / cockpit feel) */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-soft-light"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                }}
            />
            {orbs && (
                <>
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute top-3/4 left-3/4 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                </>
            )}

            {pattern === 'radar' && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0%,rgba(0,45,114,0.06)_10%,transparent_20%)] animate-radar-spin" />
                </div>
            )}

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};

export default PageBackground;
