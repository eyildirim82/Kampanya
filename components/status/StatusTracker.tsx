'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import Icon from '@/components/theme/Icon';
import Input from '@/components/theme/Input';
import Button from '@/components/theme/Button';
import Badge from '@/components/theme/Badge';
import GlassPanel from '@/components/theme/GlassPanel';
import PageBackground from '@/components/layout/PageBackground';

interface StepperStep {
    label: string;
    description?: string;
    timestamp?: string;
    status: 'completed' | 'active' | 'pending';
}

interface VerticalStepperProps {
    steps: StepperStep[];
}

export const VerticalStepper: React.FC<VerticalStepperProps> = ({ steps }) => {
    return (
        <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-white/10" />

            <div className="space-y-8">
                {steps.map((step, i) => {
                    const nodeStyles = {
                        completed: 'bg-primary ring-4 ring-background-dark',
                        active: 'bg-amber-500 ring-4 ring-background-dark animate-pulse',
                        pending: 'bg-white/10 border border-white/20 ring-4 ring-background-dark opacity-40',
                    };

                    const iconMap = {
                        completed: 'check',
                        active: 'sync',
                        pending: 'radio_button_unchecked',
                    };

                    return (
                        <div key={i} className={twMerge("relative flex gap-4", step.status === 'pending' && 'opacity-40')}>
                            <div className={twMerge('size-8 rounded-full flex items-center justify-center shrink-0 z-10', nodeStyles[step.status])}>
                                <Icon name={iconMap[step.status]} size="xs" className="text-white" />
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-sm font-bold text-white">{step.label}</h4>
                                {step.description && (
                                    <p className="text-xs text-slate-400 mt-1">{step.description}</p>
                                )}
                                {step.timestamp && (
                                    <span className="text-[10px] text-slate-500 mt-1 block">{step.timestamp}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const QueryFormCard: React.FC<{
    onSubmit?: (tckn: string, phone: string) => void;
    loading?: boolean;
}> = ({ onSubmit, loading }) => {
    const [tckn, setTckn] = React.useState('');
    const [phone, setPhone] = React.useState('');

    return (
        <GlassPanel padding="lg" rounded="xl" className="shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
                <Icon name="manage_search" className="text-primary" size="lg" />
                <div>
                    <h2 className="text-lg font-bold text-white">Başvuru Sorgula</h2>
                    <p className="text-xs text-slate-400">Başvuru durumunuzu kontrol edin</p>
                </div>
            </div>

            <div className="space-y-4">
                <Input
                    variant="glass"
                    leftIcon="fingerprint"
                    placeholder="T.C. Kimlik Numarası"
                    value={tckn}
                    onChange={(e) => setTckn(e.target.value)}
                    maxLength={11}
                    inputSize="lg"
                />
                <Input
                    variant="glass"
                    leftIcon="phone_iphone"
                    placeholder="Telefon Numarası"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputSize="lg"
                />
                <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon="arrow_forward"
                    iconPosition="right"
                    isLoading={loading}
                    onClick={() => onSubmit?.(tckn, phone)}
                >
                    Sorgula
                </Button>
            </div>

            <div className="flex justify-center items-center gap-2 mt-4 text-xs text-slate-500">
                <Icon name="lock" size="xs" />
                <span>256-bit SSL ile güvence altında</span>
            </div>
        </GlassPanel>
    );
};

export const SecurityBadgesRow: React.FC = () => (
    <div className="flex items-center justify-center gap-8 mt-8">
        {[
            { icon: 'verified_user', label: 'KVKK Uyumlu' },
            { icon: 'lock', label: '256-BIT SSL' },
            { icon: 'shield', label: 'TALPA Güvencesi' },
        ].map((badge, i) => (
            <div key={i} className="flex items-center gap-2 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                <Icon name={badge.icon} size="sm" className="text-slate-400" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{badge.label}</span>
            </div>
        ))}
    </div>
);

interface StatusTrackerProps {
    children?: React.ReactNode;
}

const StatusTracker: React.FC<StatusTrackerProps> = ({ children }) => {
    return (
        <PageBackground pattern="dots" orbs dark>
            <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
                <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {children}
                </div>
                <SecurityBadgesRow />
            </div>
        </PageBackground>
    );
};

export default StatusTracker;
