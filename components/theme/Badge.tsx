import React from 'react';
import { twMerge } from 'tailwind-merge';
import Icon from './Icon';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'error' | 'outline' | 'ghost' | 'info' | 'default' | 'talpa' | 'denizbank' | 'feature' | 'live';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    icon?: string;
    dot?: boolean;
}

export const StatusBadge: React.FC<{
    status: 'approved' | 'pending' | 'rejected' | 'waiting' | 'draft' | 'active' | 'paused' | 'closed';
    className?: string;
}> = ({ status, className }) => {
    const statusStyles = {
        approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        rejected: 'bg-rose-100 text-rose-700 border-rose-200',
        waiting: 'bg-blue-100 text-blue-700 border-blue-200',
        draft: 'bg-slate-100 text-slate-600 border-slate-200',
        active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        paused: 'bg-amber-100 text-amber-700 border-amber-200',
        closed: 'bg-slate-100 text-slate-600 border-slate-200',
    };

    const statusIcons = {
        approved: 'check_circle',
        pending: 'schedule',
        rejected: 'cancel',
        waiting: 'hourglass_empty',
        draft: 'edit_note',
        active: 'play_circle',
        paused: 'pause_circle',
        closed: 'lock',
    };

    const statusLabels: Record<string, string> = {
        approved: 'Onaylandı',
        pending: 'Beklemede',
        rejected: 'Reddedildi',
        waiting: 'İşlemde',
        draft: 'Taslak',
        active: 'Aktif',
        paused: 'Duraklatıldı',
        closed: 'Kapalı',
    };

    return (
        <span className={twMerge(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border',
            statusStyles[status],
            className
        )}>
            <Icon name={statusIcons[status]} size="xs" />
            {statusLabels[status]}
        </span>
    );
};

const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    className,
    icon,
    dot = false,
}) => {
    const variants: Record<string, string> = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        secondary: 'bg-slate-100 text-slate-700 border-slate-200',
        success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-100 text-amber-700 border-amber-200',
        danger: 'bg-red-100 text-red-700 border-red-200',
        error: 'bg-red-100 text-red-700 border-red-200',
        outline: 'bg-transparent border-slate-300 text-slate-600 dark:border-white/20 dark:text-slate-300',
        ghost: 'bg-transparent border-transparent text-slate-500',
        info: 'bg-blue-100 text-blue-700 border-blue-200',
        default: 'bg-slate-100 text-slate-700 border-slate-200',
        talpa: 'bg-gradient-to-r from-talpa-navy to-primary text-white border-transparent',
        denizbank: 'bg-deniz-red text-white border-transparent',
        feature: 'bg-primary/10 border-primary/20 text-primary',
        live: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    };

    const sizes: Record<string, string> = {
        sm: 'text-[10px] px-2 py-0.5 gap-1',
        md: 'text-xs px-2.5 py-0.5 gap-1.5',
        lg: 'text-sm px-3 py-1 gap-2',
    };

    const iconSizeMap: Record<string, 'xs' | 'sm'> = {
        sm: 'xs',
        md: 'xs',
        lg: 'sm',
    };

    return (
        <span className={twMerge(
            'inline-flex items-center justify-center font-bold rounded-full border uppercase tracking-wider',
            variants[variant],
            sizes[size],
            className
        )}>
            {dot && (
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                </span>
            )}
            {icon && <Icon name={icon} size={iconSizeMap[size]} />}
            {children}
        </span>
    );
};

export { Badge };
export default Badge;
