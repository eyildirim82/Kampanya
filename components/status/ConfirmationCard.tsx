import React from 'react';
import Icon from '@/components/theme/Icon';
import Button from '@/components/theme/Button';
import Badge from '@/components/theme/Badge';
import Card from '@/components/theme/Card';

interface ConfirmationCardProps {
    title?: string;
    message?: string;
    referenceNo?: string;
    trackingSteps?: { label: string; active: boolean }[];
    onGoBack?: () => void;
    onBrowseCampaigns?: () => void;
}

export const ProgressTracker: React.FC<{ steps: { label: string; active: boolean }[] }> = ({ steps }) => (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
        {steps.map((step, i) => (
            <div key={i}>
                <div className={`h-1.5 w-full rounded-full ${step.active ? 'bg-primary' : 'bg-white/10'}`} />
                <span className="text-[10px] text-slate-500 mt-1 block">{step.label}</span>
            </div>
        ))}
    </div>
);

export const SystemStatusDot: React.FC = () => (
    <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] text-slate-500 font-medium">Sistem Aktif</span>
    </div>
);

const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
    title = 'Başvurunuz Alındı!',
    message = 'Başvurunuz başarıyla kaydedildi. Başvuru durumunuzu referans numaranız ile takip edebilirsiniz.',
    referenceNo,
    trackingSteps = [
        { label: 'Başvuru', active: true },
        { label: 'İnceleme', active: true },
        { label: 'Sonuç', active: false },
    ],
    onGoBack,
    onBrowseCampaigns,
}) => {
    return (
        <Card variant="dark" padding="none" className="w-full max-w-2xl shadow-2xl overflow-hidden">
            {/* Top Bar */}
            <div className="h-2 bg-primary w-full" />

            {/* Content */}
            <div className="p-8 md:p-12 text-center">
                {/* Success Icon */}
                <div className="relative mx-auto mb-6 w-fit">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                    <div className="relative size-24 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/30">
                        <Icon name="check_circle" size="2xl" className="text-primary" />
                    </div>
                </div>

                <h1 className="text-2xl font-black text-white mb-3 font-display">{title}</h1>
                <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto mb-8">{message}</p>

                {/* Progress Tracker */}
                <div className="mb-8">
                    <ProgressTracker steps={trackingSteps} />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {onGoBack && (
                        <Button variant="outline" size="lg" onClick={onGoBack}>
                            Geri Dön
                        </Button>
                    )}
                    {onBrowseCampaigns && (
                        <Button variant="primary" size="lg" icon="explore" onClick={onBrowseCampaigns}>
                            Diğer Kampanyalara Göz At
                        </Button>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-navy-deep/50 border-t border-navy-border p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                {referenceNo && (
                    <div className="flex items-center gap-2">
                        <Icon name="info" size="xs" className="text-slate-500" />
                        <span className="text-xs text-slate-400">Takip No: <span className="font-bold text-white font-mono">{referenceNo}</span></span>
                    </div>
                )}
                <SystemStatusDot />
            </div>
        </Card>
    );
};

export default ConfirmationCard;
