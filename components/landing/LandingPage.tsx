'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import Icon from '@/components/theme/Icon';
import Button from '@/components/theme/Button';
import Badge from '@/components/theme/Badge';
import GlassPanel from '@/components/theme/GlassPanel';
import PageBackground from '@/components/layout/PageBackground';

interface QuickLinkCardProps {
    icon: string;
    label: string;
    href?: string;
}

export const QuickLinkCard: React.FC<QuickLinkCardProps> = ({ icon, label, href = '#' }) => (
    <a href={href} className="glass-card p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center group">
        <Icon name={icon} className="text-white/60 group-hover:text-primary transition-colors" />
        <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">{label}</span>
    </a>
);

interface WeatherWidgetProps {
    className?: string;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ className }) => (
    <div className={twMerge("glass-card rounded-2xl p-6 border-l-4 border-l-primary", className)}>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="cloud" size="sm" className="text-primary" />
            Havacılık Hava Durumu
        </h3>
        <div className="space-y-4">
            {/* Airport 1 */}
            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <div>
                    <div className="text-xs text-slate-500 uppercase">LTBA</div>
                    <div className="text-2xl font-bold text-white">12°C</div>
                </div>
                <div className="text-right">
                    <Icon name="sunny" className="text-amber-400" size="lg" />
                    <div className="text-[10px] text-slate-500 mt-1">VFR</div>
                </div>
            </div>
            {/* Airport 2 */}
            <div className="flex justify-between items-end">
                <div>
                    <div className="text-xs text-slate-500 uppercase">LTFM</div>
                    <div className="text-2xl font-bold text-white">10°C</div>
                </div>
                <div className="text-right">
                    <Icon name="cloud" className="text-slate-400" size="lg" />
                    <div className="text-[10px] text-slate-500 mt-1">MVFR</div>
                </div>
            </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-slate-500">NOTAMs güncel</span>
        </div>
    </div>
);

export const OperationalBadge: React.FC = () => (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold animate-float">
        <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        System Operational
    </div>
);

interface CampaignCardCompact {
    title: string;
    description?: string;
    brandColor?: string;
    status?: string;
    ctaLabel?: string;
    ctaHref?: string;
}

interface LandingPageProps {
    campaigns?: CampaignCardCompact[];
    quickLinks?: QuickLinkCardProps[];
    children?: React.ReactNode;
}

const defaultQuickLinks: QuickLinkCardProps[] = [
    { icon: 'article', label: 'Uçuş Kayıtları' },
    { icon: 'gavel', label: 'Hukuk Desteği' },
    { icon: 'diversity_3', label: 'Topluluk' },
    { icon: 'settings', label: 'Ayarlar' },
];

const LandingPage: React.FC<LandingPageProps> = ({
    campaigns = [],
    quickLinks = defaultQuickLinks,
    children,
}) => {
    return (
        <PageBackground pattern="grid" orbs dark>
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Operational Badge */}
                <div className="flex justify-center mb-8">
                    <OperationalBadge />
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    {/* Weather Widget */}
                    <WeatherWidget className="lg:col-span-1" />

                    {/* Campaign Cards */}
                    <div className="lg:col-span-2 space-y-4">
                        {campaigns.map((campaign, i) => (
                            <div key={i} className="glass-card rounded-2xl p-6 relative overflow-hidden group">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        {campaign.status && (
                                            <Badge variant={campaign.status === 'New' ? 'live' : 'feature'} size="sm" className="mb-2">
                                                {campaign.status}
                                            </Badge>
                                        )}
                                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                                            {campaign.title}
                                        </h3>
                                        {campaign.description && (
                                            <p className="text-sm text-slate-400 mt-1">{campaign.description}</p>
                                        )}
                                    </div>
                                    {campaign.ctaHref && (
                                        <a href={campaign.ctaHref}>
                                            <Button variant="secondary" size="sm" icon="arrow_forward" iconPosition="right">
                                                {campaign.ctaLabel || 'Başvur'}
                                            </Button>
                                        </a>
                                    )}
                                </div>
                                {/* Hover gradient */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl pointer-events-none"
                                    style={{ background: `linear-gradient(135deg, ${campaign.brandColor || '#1152d4'}, transparent)` }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {quickLinks.map((link, i) => (
                        <QuickLinkCard key={i} {...link} />
                    ))}
                </div>

                {/* Extra Content */}
                {children}
            </div>
        </PageBackground>
    );
};

export default LandingPage;
