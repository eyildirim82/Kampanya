'use client';

import React from 'react';
import Icon from '@/components/theme/Icon';
import Input from '@/components/theme/Input';
import Button from '@/components/theme/Button';
import ToggleSwitch from '@/components/theme/ToggleSwitch';
import GlassPanel from '@/components/theme/GlassPanel';
import Badge from '@/components/theme/Badge';

interface ApplicationFormProps {
    title?: string;
    subtitle?: string;
    variant?: 'glass' | 'default';
    onSubmit?: (e: React.FormEvent) => void;
    children?: React.ReactNode;
    showProgress?: boolean;
    currentStep?: number;
    totalSteps?: number;
}

export const FormDivider: React.FC = () => (
    <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2" />
);

export const ConsentRow: React.FC<{
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
    <ToggleSwitch
        checked={checked}
        onChange={onChange}
        label={label}
        description={description}
    />
);

export const SecurityBadges: React.FC = () => (
    <div className="flex justify-center items-center gap-2 mt-4">
        <Icon name="lock" size="xs" className="text-gray-500" />
        <span className="text-[10px] text-gray-500">256-bit SSL ile güvence altında</span>
    </div>
);

const ApplicationForm: React.FC<ApplicationFormProps> = ({
    title = 'Başvuru Formu',
    subtitle,
    variant = 'default',
    onSubmit,
    children,
    showProgress = false,
    currentStep = 1,
    totalSteps = 3,
}) => {
    const Wrapper = variant === 'glass' ? GlassPanel : 'div';
    const wrapperProps = variant === 'glass' ? { padding: 'lg' as const, rounded: 'xl' as const } : {};

    return (
        <Wrapper {...wrapperProps} className={variant === 'default' ? 'bg-white dark:bg-surface-dark rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-800' : ''}>
            {/* Progress */}
            {showProgress && (
                <div className="flex items-center gap-4 mb-6">
                    {Array.from({ length: totalSteps }, (_, i) => (
                        <React.Fragment key={i}>
                            <div className={`size-2 rounded-full ${i < currentStep ? 'bg-primary w-8' : 'bg-gray-600'} transition-all`} />
                        </React.Fragment>
                    ))}
                    <span className="text-xs text-slate-500 ml-2">Adım {currentStep} / {totalSteps}</span>
                </div>
            )}

            {/* Header */}
            {title && (
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                    {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
                </div>
            )}

            {/* Form Content */}
            <form onSubmit={(e) => { e.preventDefault(); onSubmit?.(e); }} className="space-y-5">
                {children}
            </form>

            <SecurityBadges />
        </Wrapper>
    );
};

export default ApplicationForm;
