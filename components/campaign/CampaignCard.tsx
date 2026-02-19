'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';
import Icon from '@/components/theme/Icon';
import Badge from '@/components/theme/Badge';
import Button from '@/components/theme/Button';

interface CampaignCardProps {
    campaign: {
        id: string;
        slug?: string;
        title: string;
        description?: string;
        imageUrl?: string;
        brandColor?: string;
        status?: string;
        endDate?: string;
    };
    variant?: 'glass' | 'branded' | 'compact';
    className?: string;
}

const CampaignImage: React.FC<{
    src: string;
    alt: string;
    className?: string;
}> = ({ src, alt, className }) => {
    const [error, setError] = useState(false);
    if (error) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Icon name="campaign" size="xl" className="text-white/20" />
            </div>
        );
    }
    return (
        <Image
            src={src}
            alt={alt}
            fill
            className={className}
            sizes="(max-width: 768px) 100vw, 400px"
            unoptimized
            onError={() => setError(true)}
        />
    );
};

const CampaignCard: React.FC<CampaignCardProps> = ({
    campaign,
    variant = 'glass',
    className,
}) => {
    const href = campaign.slug ? `/kampanya/${campaign.slug}` : `/kampanya/${campaign.id}`;
    const brandColor = campaign.brandColor || '#002D72';

    if (variant === 'compact') {
        return (
            <Link href={href} className={twMerge("glass-card rounded-xl p-8 relative overflow-hidden group transition-all duration-300", className)}>
                <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}20` }}>
                        <Icon name="campaign" style={{ color: brandColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        {campaign.status && (
                            <Badge variant="live" size="sm" dot className="mb-2">{campaign.status}</Badge>
                        )}
                        <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors truncate">{campaign.title}</h3>
                        {campaign.description && (
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{campaign.description}</p>
                        )}
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-end">
                    <Button variant="secondary" size="xs" icon="arrow_forward" iconPosition="right">
                        Detay
                    </Button>
                </div>
            </Link>
        );
    }

    if (variant === 'branded') {
        return (
            <div
                className={twMerge(
                    "bg-white dark:bg-surface-dark rounded-xl overflow-hidden border border-[rgba(0,45,114,0.1)] shadow-[0_8px_30px_rgba(0,45,114,0.08)] hover:shadow-[0_12px_40px_rgba(0,45,114,0.12)] transition-all duration-300 group flex flex-col border-t-4",
                    className
                )}
                style={{ borderTopColor: brandColor }}
            >
                {/* Image */}
                <div className="h-48 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {campaign.imageUrl ? (
                        <div className="absolute inset-0">
                            <CampaignImage
                                src={campaign.imageUrl}
                                alt={campaign.title}
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${brandColor}20, ${brandColor}05)` }}>
                            <Icon name="campaign" size="xl" style={{ color: brandColor }} className="opacity-30" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-8 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mb-2" style={{ ['--hover-color' as string]: brandColor }}>
                        {campaign.title}
                    </h3>
                    {campaign.description && (
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 line-clamp-2">{campaign.description}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-4">
                        {campaign.endDate && (
                            <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Son: {campaign.endDate}</span>
                        )}
                        <Link href={href}>
                            <button
                                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                                style={{ backgroundColor: brandColor }}
                            >
                                Hemen Başvur
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Glass variant (default) - premium spacing and soft hover
    return (
        <div className={twMerge("glass-card rounded-xl overflow-hidden flex flex-col group transition-all duration-300", className)}>
            {/* Image */}
            <div className="h-48 relative overflow-hidden">
                {campaign.imageUrl ? (
                    <div className="absolute inset-0">
                        <CampaignImage
                            src={campaign.imageUrl}
                            alt={campaign.title}
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Icon name="campaign" size="xl" className="text-white/20" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>

            {/* Content */}
            <div className="p-8 flex-1 flex flex-col">
                <h3 className="text-lg font-bold tracking-tight text-white mb-2 group-hover:text-primary/90 transition-colors">{campaign.title}</h3>
                {campaign.description && (
                    <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2">{campaign.description}</p>
                )}
                <Link href={href} className="mt-auto">
                    <button
                        className="w-full py-3 rounded-lg font-bold text-white transition-all duration-300 hover:opacity-90"
                        style={{ backgroundColor: brandColor }}
                    >
                        Detayları İncele
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default CampaignCard;
