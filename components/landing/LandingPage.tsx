'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';
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
            <div className="relative overflow-hidden">
                {/* Hero background orb */}
                <div className="pointer-events-none absolute -top-40 -right-32 h-[420px] w-[420px] bg-gradient-to-br from-primary/40 via-sky-200/25 to-transparent blur-[120px]" />

                {/* HERO – split layout */}
                <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-16 lg:pt-24 lg:pb-20">
                    <div className="mb-6 md:mb-8">
                        <OperationalBadge />
                    </div>

                    <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16">
                        {/* Left – typography */}
                        <div className="flex-1 space-y-5 md:space-y-6">
                            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
                                <Icon name="flight_takeoff" size="xs" />
                                TALPA · DenizBank Private
                            </p>

                            <motion.h1
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight md:tracking-tighter leading-tight text-foreground"
                            >
                                <span className="font-heading block">
                                    Pilotlar için tasarlanmış
                                </span>
                                <span className="font-heading block">
                                    <span className="gradient-text-hero">
                                        yeni nesil
                                    </span>{' '}
                                    finansal kokpit
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
                                className="max-w-xl text-sm md:text-base text-gray-700/90 dark:text-gray-300"
                            >
                                Uçuş saatlerinizi, harcamalarınızı ve kampanyalarınızı tek bakışta görün.
                                TALPA ve DenizBank işbirliğiyle, private bankacılık seviyesindeki deneyim
                                pilotlara özel yeniden tasarlandı.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.25 }}
                                className="flex flex-wrap items-center gap-4"
                            >
                                <Button size="lg" variant="primary" icon="arrow_forward" iconPosition="right">
                                    Kampanyaları Keşfet
                                </Button>
                                <Button size="lg" variant="outline">
                                    Limitini Hesapla
                                </Button>
                                <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Bugün {campaigns.length || 12}+ aktif kampanya</span>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right – floating composition */}
                        <div className="flex-1 w-full lg:w-[420px]">
                            <div className="relative h-[320px] md:h-[380px] lg:h-[420px]">
                                {/* Card – credit card mockup */}
                                <motion.div
                                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.65, ease: 'easeOut', delay: 0.1 }}
                                    className="surface-card-premium absolute inset-x-4 top-4 md:inset-x-8 md:top-6 p-5 md:p-6"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="text-[11px] uppercase tracking-[0.16em] text-gray-600/80">
                                            TALPA PRIVATE
                                        </span>
                                        <Icon name="flight" className="text-primary" size="sm" />
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-xs text-gray-600/80 mb-1">
                                                Toplam Miles
                                            </div>
                                            <div className="text-2xl md:text-3xl font-semibold tracking-tight">
                                                328.450
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-600/80 mb-1">Aylık Harcama</div>
                                            <div className="text-lg font-semibold">₺ 74.230</div>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-center justify-between text-[11px] text-gray-600/80">
                                        <span>DenizBank · Private</span>
                                        <span>•• 3421</span>
                                    </div>
                                </motion.div>

                                {/* Glass notification badge */}
                                <motion.div
                                    initial={{ opacity: 0, x: 40, y: 40 }}
                                    animate={{ opacity: 1, x: 0, y: 0 }}
                                    transition={{ duration: 0.65, ease: 'easeOut', delay: 0.2 }}
                                    className="glass-card absolute right-4 md:right-8 top-32 md:top-40 rounded-2xl px-4 py-3 flex items-center gap-3"
                                >
                                    <div className="size-8 rounded-full bg-emerald-400/10 flex items-center justify-center">
                                        <Icon name="check_circle" className="text-emerald-400" size="sm" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-foreground mb-0.5">
                                            Yeni kampanya onaylandı
                                        </p>
                                        <p className="text-[10px] text-gray-600/80">
                                            TALPA Miles+ için %25 ek kazanç
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Mini chart card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 40, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.65, ease: 'easeOut', delay: 0.3 }}
                                    className="glass-card absolute left-4 md:left-10 bottom-4 md:bottom-8 rounded-2xl px-4 py-3 w-[68%] md:w-[60%]"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] text-gray-500 uppercase tracking-[0.15em]">
                                            Harcama Trendi
                                        </span>
                                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                                            <Icon name="trending_up" size="xs" />
                                            %18
                                        </span>
                                    </div>
                                    <div className="h-14 flex items-end gap-1.5">
                                        {[30, 48, 38, 62, 54, 78, 68].map((h, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 rounded-full bg-gradient-to-t from-primary/10 via-primary/60 to-primary/90"
                                                style={{ height: `${h}%` }}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trust / Social proof marquee */}
                <section className="border-y border-white/10 bg-white/40 dark:bg-white/5/40 backdrop-blur-sm/60">
                    <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-6 text-xs uppercase tracking-[0.18em] text-gray-500">
                        <span className="hidden md:inline text-[11px] text-gray-500">
                            Güvenilen partnerler
                        </span>
                        <div className="relative overflow-hidden flex-1">
                            <motion.div
                                className="flex items-center gap-10 opacity-60"
                                initial={{ x: 0 }}
                                animate={{ x: '-50%' }}
                                transition={{ ease: 'linear', duration: 22, repeat: Infinity }}
                            >
                                {['DenizBank', 'TALPA', 'IATA', 'EASA', 'Private Banking', 'Miles+'].map((name) => (
                                    <div key={name} className="flex items-center gap-2 whitespace-nowrap">
                                        <span className="h-px w-6 bg-gray-400/60" />
                                        <span>{name}</span>
                                    </div>
                                ))}
                                {['DenizBank', 'TALPA', 'IATA', 'EASA', 'Private Banking', 'Miles+'].map((name) => (
                                    <div key={`${name}-clone`} className="flex items-center gap-2 whitespace-nowrap">
                                        <span className="h-px w-6 bg-gray-400/60" />
                                        <span>{name}</span>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Features – Bento grid */}
                <section className="max-w-6xl mx-auto px-6 py-14 lg:py-18 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-2">
                                Özellikler
                            </p>
                            <h2 className="text-2xl md:text-3xl font-heading tracking-tight text-foreground">
                                Bento grid ile akışkan bir kontrol paneli.
                            </h2>
                        </div>
                        <p className="max-w-md text-xs md:text-sm text-gray-600 dark:text-gray-300">
                            Uçuş kayıtları, kampanyalar ve harcama içgörüleri; premium bir finans ürününden
                            bekleyeceğiniz seviyede, tek bakışta.
                        </p>
                    </div>

                    <div className="grid auto-rows-[minmax(170px,1fr)] gap-6 md:grid-cols-4">
                        {/* Large analytics tile */}
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.35 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="col-span-4 md:col-span-2 row-span-2 surface-card-premium p-6 flex flex-col justify-between"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                    Kümülatif avantaj
                                </div>
                                <Badge variant="live" size="sm">
                                    Gerçek zamanlı
                                </Badge>
                            </div>
                            <div className="space-y-4">
                                <div className="text-sm text-gray-600 dark:text-gray-200">
                                    Son 12 ayda kazandığınız toplam nakit iade ve mil değeri.
                                </div>
                                <div className="flex items-end gap-6">
                                    <div>
                                        <div className="text-[11px] text-gray-500 mb-1 uppercase tracking-[0.16em]">
                                            Toplam değer
                                        </div>
                                        <div className="text-3xl md:text-4xl font-semibold tracking-tight">
                                            ₺ 182.450
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-gray-500 mb-1 uppercase tracking-[0.16em]">
                                            Potansiyel
                                        </div>
                                        <div className="text-lg font-semibold text-emerald-400">
                                            + ₺ 24.900
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Tall rectangle – Flight & weather */}
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.35 }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
                            className="col-span-4 md:col-span-2 md:row-span-1 glass-panel rounded-3xl p-5 flex flex-col justify-between"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-300">
                                    <Icon name="radar" size="xs" />
                                    Uçuş & Hava durumu
                                </div>
                                <span className="text-[11px] text-emerald-300 flex items-center gap-1">
                                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Canlı
                                </span>
                            </div>
                            <WeatherWidget />
                        </motion.div>

                        {/* Wide rectangle – Quick links */}
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                            className="col-span-4 md:col-span-2 row-span-1 glass-card rounded-3xl p-4 flex flex-col gap-4"
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
                                    Hızlı aksiyonlar
                                </p>
                                <span className="text-[11px] text-gray-500">
                                    En çok kullanılan işlemler
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {quickLinks.map((link, i) => (
                                    <QuickLinkCard key={i} {...link} />
                                ))}
                            </div>
                        </motion.div>

                        {/* Compact campaigns list */}
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
                            className="col-span-4 md:col-span-2 row-span-1 glass-card rounded-3xl p-5 flex flex-col gap-3"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
                                    Canlı kampanyalar
                                </p>
                                <span className="text-[11px] text-gray-400">
                                    {campaigns.length || 3}+ fırsat
                                </span>
                            </div>
                            <div className="space-y-3">
                                {(campaigns.length ? campaigns : [
                                    { title: 'Avrupa uçuşlarında %20 ekstra mil', status: 'New' },
                                    { title: 'Shell Jet yakıt harcamalarında %5 iade', status: 'Live' },
                                    { title: 'Lounge erişimlerinde özel limit artışı', status: 'Live' },
                                ]).slice(0, 3).map((campaign, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start justify-between rounded-2xl bg-white/5 dark:bg-white/5 px-3 py-2"
                                    >
                                        <div className="flex-1 pr-3">
                                            {campaign.status && (
                                                <Badge
                                                    variant={campaign.status === 'New' ? 'live' : 'feature'}
                                                    size="xs"
                                                    className="mb-1"
                                                >
                                                    {campaign.status}
                                                </Badge>
                                            )}
                                            <p className="text-xs text-gray-100 leading-snug">
                                                {campaign.title}
                                            </p>
                                        </div>
                                        <Icon name="arrow_outward" size="xs" className="text-gray-400" />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Extra content from parent, if any */}
                    {children && (
                        <div className="mt-12">
                            {children}
                        </div>
                    )}
                </section>
            </div>
        </PageBackground>
    );
};

export default LandingPage;
