'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    size?: 'sm' | 'md';
    disabled?: boolean;
    className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    checked,
    onChange,
    label,
    description,
    size = 'md',
    disabled = false,
    className,
}) => {
    const trackSizes = {
        sm: 'w-9 h-5',
        md: 'w-12 h-7',
    };

    const dotSizes = {
        sm: 'w-3.5 h-3.5 top-[3px] left-[3px] peer-checked:translate-x-4',
        md: 'w-5 h-5 top-1 left-1 peer-checked:translate-x-5',
    };

    if (label || description) {
        return (
            <label className={twMerge(
                'flex items-center justify-between group cursor-pointer',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}>
                <div className="flex-1 mr-4">
                    {label && (
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                            {label}
                        </span>
                    )}
                    {description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
                    )}
                </div>
                <div className="relative inline-flex items-center shrink-0">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                        disabled={disabled}
                    />
                    <div className={twMerge(
                        'rounded-full bg-gray-300 dark:bg-gray-700 peer-checked:bg-primary transition-colors duration-200',
                        trackSizes[size]
                    )} />
                    <div className={twMerge(
                        'absolute bg-white rounded-full shadow-sm transition-transform duration-200',
                        dotSizes[size]
                    )} />
                </div>
            </label>
        );
    }

    return (
        <label className={twMerge(
            'relative inline-flex items-center cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed',
            className
        )}>
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
            />
            <div className={twMerge(
                'rounded-full bg-gray-300 dark:bg-gray-700 peer-checked:bg-primary transition-colors duration-200',
                trackSizes[size]
            )} />
            <div className={twMerge(
                'absolute bg-white rounded-full shadow-sm transition-transform duration-200',
                dotSizes[size]
            )} />
        </label>
    );
};

export default ToggleSwitch;
