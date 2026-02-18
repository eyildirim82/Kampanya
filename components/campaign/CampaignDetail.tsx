'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Icon from '@/components/theme/Icon';
import Badge from '@/components/theme/Badge';
import GlassPanel from '@/components/theme/GlassPanel';

interface FeatureItem {
    icon: string;
    title: string;
    description: string;
}

const CampaignBannerImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
    const [error, setError] = useState(false);
    if (error) {
        return <div className="w-full h-full bg-gradient-to-br from-primary/30 to-background-dark" />;
    }
    return (
        <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized
            onError={() => setError(true)}
        />
    );
};

const PartnerLogoImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
    const [error, setError] = useState(false);
    if (error) {
        return <Icon name="account_balance" className="w-full h-full text-slate-400" size="lg" />;
    }
    return (
        <Image
            src={src}
            alt={alt}
            width={64}
            height={64}
            className="w-full h-full object-contain"
            unoptimized
            onError={() => setError(true)}
        />
    );
};

interface CampaignDetailProps {
    title: string;
    description?: string;
    imageUrl?: string;
    badge?: string;
    features?: FeatureItem[];
    conditions?: string[];
    partnerName?: string;
    partnerLogo?: string;
    partnerVerified?: boolean;
    children?: React.ReactNode;
}

const CampaignDetail: React.FC<CampaignDetailProps> = ({
    title,
    description,
    imageUrl,
    badge,
    features,
    conditions,
    partnerName,
    partnerLogo,
    partnerVerified,
    children,
}) => {
    return (
        <div className="min-h-screen bg-background-dark text-white">
            {/* Hero Banner */}
            <section className="relative w-full h-[400px] overflow-hidden">
                {imageUrl ? (
                    <CampaignBannerImage src={imageUrl} alt={title} />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-background-dark" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background-dark/80 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-8 max-w-7xl mx-auto">
                    {badge && <Badge variant="feature" size="sm" className="mb-3">{badge}</Badge>}
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight font-display">{title}</h1>
                    {description && <p className="text-lg text-slate-300 mt-3 max-w-2xl">{description}</p>}
                </div>
            </section>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Left: Details */}
                    <div className="flex-1 space-y-10">
                        {/* Features Grid */}
                        {features && features.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold mb-6">Kampanya Avantajları</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {features.map((feature, i) => (
                                        <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/5 space-y-3 hover:border-primary/30 transition-colors">
                                            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <Icon name={feature.icon} className="text-primary" />
                                            </div>
                                            <h4 className="font-bold text-white">{feature.title}</h4>
                                            <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Partner Banner */}
                        {partnerName && (
                            <div className="p-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {partnerLogo && (
                                        <div className="size-16 rounded-xl bg-white p-2">
                                            <PartnerLogoImage src={partnerLogo} alt={partnerName} />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{partnerName}</h3>
                                        {partnerVerified && (
                                            <span className="flex items-center gap-1 text-xs text-primary">
                                                <Icon name="verified" size="xs" /> Doğrulanmış Partner
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Conditions */}
                        {conditions && conditions.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold mb-4">Kampanya Koşulları</h2>
                                <ul className="space-y-2">
                                    {conditions.map((condition, i) => (
                                        <li key={i} className="flex items-start gap-2 text-slate-400 text-sm">
                                            <Icon name="check" size="xs" className="text-primary mt-0.5 shrink-0" />
                                            {condition}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Right: Sticky Form */}
                    <div className="lg:w-[420px] shrink-0">
                        <div className="sticky top-28">
                            <GlassPanel padding="lg" rounded="xl" className="shadow-2xl">
                                {children}
                            </GlassPanel>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignDetail;
