'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';
import Icon from '@/components/theme/Icon';
import Button from '@/components/theme/Button';
import Badge from '@/components/theme/Badge';

interface HeroSectionProps {
    variant?: 'radar' | 'image' | 'text';
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    badge?: string;
    primaryCta?: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
    stats?: { value: string; label: string }[];
    className?: string;
}

const HeroImage: React.FC<{ src: string }> = ({ src }) => {
    const [error, setError] = useState(false);
    if (error) {
        return (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-background-dark flex items-center justify-center">
                <Icon name="campaign" size="xl" className="text-white/20" />
            </div>
        );
    }
    return (
        <Image
            src={src}
            alt=""
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="100vw"
            unoptimized
            onError={() => setError(true)}
        />
    );
};

const HeroSection: React.FC<HeroSectionProps> = ({
    variant = 'radar',
    title,
    subtitle,
    description,
    imageUrl,
    badge,
    primaryCta,
    secondaryCta,
    stats,
    className,
}) => {
    if (variant === 'text') {
        return (
            <section className={twMerge("relative bg-background-dark py-20 overflow-hidden border-b border-white/10", className)}>
                <div className="container mx-auto px-8 relative z-10 text-center">
                    <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-6 text-white font-display">
                        {title}
                    </h2>
                    {description && (
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">{description}</p>
                    )}
                    {(primaryCta || secondaryCta) && (
                        <div className="flex items-center justify-center gap-4">
                            {primaryCta && (
                                <Badge variant="feature" size="lg" icon="check_circle">Hızlı Başvuru</Badge>
                            )}
                            {secondaryCta && (
                                <Badge variant="outline" size="lg" icon="lock">Giriş Gerekmez</Badge>
                            )}
                        </div>
                    )}
                </div>
            </section>
        );
    }

    if (variant === 'image') {
        return (
            <section className={twMerge("relative rounded-xl overflow-hidden min-h-[320px] flex flex-col justify-center px-12 group cursor-pointer", className)}>
                {imageUrl && (
                    <HeroImage src={imageUrl} />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                <div className="relative z-10 max-w-lg">
                    {badge && (
                        <Badge variant="feature" size="sm" className="mb-4">{badge}</Badge>
                    )}
                    <h2 className="text-3xl font-black text-white mb-3 font-display">{title}</h2>
                    {description && <p className="text-slate-300 mb-6">{description}</p>}
                    {(primaryCta || secondaryCta) && (
                        <div className="flex gap-3">
                            {primaryCta && (
                                <a href={primaryCta.href}>
                                    <Button variant="primary" size="md" icon="arrow_forward" iconPosition="right">{primaryCta.label}</Button>
                                </a>
                            )}
                            {secondaryCta && (
                                <a href={secondaryCta.href}>
                                    <Button variant="secondary" size="md">{secondaryCta.label}</Button>
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </section>
        );
    }

    // Radar variant (default)
    return (
        <section className={twMerge("relative pt-32 pb-20 overflow-hidden min-h-[85vh] flex items-center justify-center bg-background-dark", className)}>
            {/* Radar Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-dot-grid opacity-50" />
                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0%,rgba(17,82,212,0.06)_10%,transparent_20%)] animate-radar-spin" />
                <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-accent-glow/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                {badge && (
                    <Badge variant="feature" size="md" icon="flight_takeoff" className="mb-6 animate-float">{badge}</Badge>
                )}
                {subtitle && (
                    <p className="text-sm text-primary-light font-bold uppercase tracking-widest mb-4">{subtitle}</p>
                )}
                <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight font-display leading-tight">
                    {title}
                </h1>
                {description && (
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">{description}</p>
                )}
                {(primaryCta || secondaryCta) && (
                    <div className="flex items-center justify-center gap-4">
                        {primaryCta && (
                            <a href={primaryCta.href}>
                                <Button variant="primary" size="lg" icon="east" iconPosition="right" animated>{primaryCta.label}</Button>
                            </a>
                        )}
                        {secondaryCta && (
                            <a href={secondaryCta.href}>
                                <Button variant="secondary" size="lg">{secondaryCta.label}</Button>
                            </a>
                        )}
                    </div>
                )}
                {stats && stats.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-10 mt-16">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-3xl font-bold text-white">{stat.value}</div>
                                <div className="text-sm text-slate-500 uppercase tracking-wider mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default HeroSection;
