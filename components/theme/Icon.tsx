import React from 'react';
import { twMerge } from 'tailwind-merge';

interface IconProps {
    name: string;
    className?: string;
    filled?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    style?: React.CSSProperties;
}

const sizeMap: Record<string, string> = {
    xs: 'text-[14px]',
    sm: 'text-[18px]',
    md: 'text-[24px]',
    lg: 'text-[32px]',
    xl: 'text-[40px]',
    '2xl': 'text-[48px]',
};

const Icon: React.FC<IconProps> = ({ name, className, filled = false, size = 'md', style }) => {
    return (
        <span
            className={twMerge(
                'material-symbols-outlined select-none leading-none',
                sizeMap[size],
                className
            )}
            style={{
                ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}),
                ...style,
            }}
        >
            {name}
        </span>
    );
};

export default Icon;
