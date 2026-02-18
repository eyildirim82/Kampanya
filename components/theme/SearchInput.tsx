'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import Icon from './Icon';

interface SearchInputProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    variant?: 'default' | 'rounded' | 'glass';
    size?: 'sm' | 'md';
    expanding?: boolean;
    className?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    placeholder = 'Ara...',
    variant = 'default',
    size = 'md',
    expanding = false,
    className,
}) => {
    const variantStyles = {
        default: 'bg-slate-100 dark:bg-surface-dark border-transparent focus-within:border-primary/20 focus-within:ring-2 focus-within:ring-primary/10',
        rounded: 'bg-slate-100 dark:bg-surface-dark border-transparent rounded-full focus-within:border-primary/20 focus-within:ring-2 focus-within:ring-primary/10',
        glass: 'bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/20',
    };

    const sizeStyles = {
        sm: 'h-9 text-xs',
        md: 'h-10 text-sm',
    };

    return (
        <div className={twMerge(
            'relative flex items-center border rounded-lg transition-all',
            variantStyles[variant],
            sizeStyles[size],
            expanding && 'w-48 focus-within:w-64',
            className
        )}>
            <Icon name="search" size="sm" className="absolute left-3 text-slate-400" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder}
                className={twMerge(
                    'w-full h-full pl-10 pr-4 bg-transparent border-none outline-none focus:ring-0 text-current',
                    sizeStyles[size]
                )}
            />
        </div>
    );
};

export default SearchInput;
