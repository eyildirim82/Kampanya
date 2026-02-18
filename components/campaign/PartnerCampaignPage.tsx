'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';
import Icon from '@/components/theme/Icon';
import Button from '@/components/theme/Button';
import Badge from '@/components/theme/Badge';
import GlassPanel from '@/components/theme/GlassPanel';

interface BenefitItem {
    icon: string;
    title: string;
    description: string;
}

interface ChecklistItem {
    text: string;
}

interface PartnerCampaignPageProps {
    variant?: 'hero' | 'split';
    title: string;
    description?: string;
    partnerName: string;
    partnerLogo?: string;
    partnerColor?: string;
    imageUrl?: string;
    benefits?: BenefitItem[];
    checklist?: ChecklistItem[];
    stepCount?: number;
    currentStep?: number;
    children?: React.ReactNode;
}

export const StepProgressIndicator: React.FC<{ steps: number; current: number; color?: string }> = ({
    steps,
    current,
    color = 'var(--primary)',
}) => {
    return (
        <div className="flex items-center gap-2">
            {Array.from({ length: steps }, (_, i) => (
                <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-colors"
                    style={{
                        backgroundColor: i < current ? color : `${color}20`,
                    }}
                />
            ))}
        </div>
    );
};

const PartnerLogoImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
    const [error, setError] = useState(false);
    if (error) {
        return <Icon name="account_balance" className="w-full h-full object-contain text-slate-400" size="lg" />;
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

const CampaignHeroImage: React.FC<{ src: string }> = ({ src }) => {
    const [error, setError] = useState(false);
    if (error) {
        return (
            <div className="rounded-2xl shadow-2xl w-full aspect-video bg-white/5 flex items-center justify-center">
                <Icon name="campaign" size="xl" className="text-white/30" />
            </div>
        );
    }
    return (
        <Image
            src={src}
            alt=""
            width={600}
            height={400}
            className="rounded-2xl shadow-2xl w-full h-auto"
            unoptimized
            onError={() => setError(true)}
        />
    );
};

export const BenefitCard: React.FC<BenefitItem> = ({ icon, title, description }) => (
    <div className="group p-8 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-background-dark hover:border-primary/50 transition-all duration-300">
        <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Icon name={icon} className="text-primary" size="lg" />
        </div>
        <h3 className="text-xl font-bold mb-3 dark:text-white">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
);

const PartnerCampaignPage: React.FC<PartnerCampaignPageProps> = ({
    variant = 'hero',
    title,
    description,
    partnerName,
    partnerLogo,
    partnerColor = '#1152d4',
    imageUrl,
    benefits,
    checklist,
    stepCount = 3,
    currentStep = 1,
    children,
}) => {
    if (variant === 'split') {
        return (
            <div className="min-h-screen bg-background-dark text-white">
                <main className="flex-grow relative flex flex-col items-center justify-center py-12 px-4 overflow-hidden bg-flight-path">
                    <div className="max-w-5xl w-full grid lg:grid-cols-12 gap-12 relative z-10 items-start">
                        {/* Info Sidebar */}
                        <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24">
                            {partnerLogo && (
                                <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                                    <div className="size-16 rounded-xl bg-white p-2">
                                        <PartnerLogoImage src={partnerLogo} alt={partnerName} />
                                    </div>
                                    <span className="text-xs text-slate-400 uppercase tracking-wider">İş Ortağı Kampanyası</span>
                                </div>
                            )}
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight font-display">
                                TALPA Üyelerine Özel <span style={{ color: partnerColor }}>{partnerName}</span> Ayrıcalıkları
                            </h1>
                            {description && <p className="text-slate-400 leading-relaxed">{description}</p>}
                            {checklist && checklist.length > 0 && (
                                <div className="space-y-4">
                                    {checklist.map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 text-slate-300">
                                            <div className="size-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${partnerColor}15` }}>
                                                <Icon name="check" size="sm" style={{ color: partnerColor }} />
                                            </div>
                                            <span className="text-sm font-medium">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Form Panel */}
                        <div className="lg:col-span-7">
                            <GlassPanel padding="lg" rounded="3xl" className="shadow-2xl">
                                <StepProgressIndicator steps={stepCount} current={currentStep} color={partnerColor} />
                                <div className="mt-8">
                                    {children}
                                </div>
                            </GlassPanel>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Hero variant (default)
    return (
        <div className="min-h-screen bg-background-dark text-white relative overflow-hidden bg-flight-path">
            {/* Hero Section */}
            <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 px-4">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div>
                        <Badge variant="feature" size="sm" icon="verified" className="mb-6">Partner Exclusive</Badge>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight font-display mb-6">{title}</h1>
                        {description && <p className="text-lg text-slate-400 mb-8 leading-relaxed">{description}</p>}
                        <div className="flex gap-4">
                            <Button variant="primary" size="lg" icon="arrow_forward" iconPosition="right">Başvur</Button>
                            <Button variant="secondary" size="lg">Detaylar</Button>
                        </div>
                    </div>

                    {/* Right Image */}
                    {imageUrl && (
                        <div className="relative">
                            <CampaignHeroImage src={imageUrl} />
                            <div className="absolute -bottom-4 -right-4 w-40 h-40 bg-primary/20 rounded-full blur-[60px]" />
                        </div>
                    )}
                </div>
            </section>

            {/* Benefits Grid */}
            {benefits && benefits.length > 0 && (
                <section className="py-20 px-4">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-2xl font-bold text-center mb-12">Kampanya Avantajları</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            {benefits.map((benefit, i) => (
                                <BenefitCard key={i} {...benefit} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Application Form */}
            {children && (
                <section className="py-24 relative">
                    <div className="max-w-4xl mx-auto px-4">
                        <GlassPanel padding="xl" rounded="3xl">
                            {children}
                        </GlassPanel>
                    </div>
                </section>
            )}
        </div>
    );
};

export default PartnerCampaignPage;
