'use client';

import React from 'react';
import Icon from '@/components/theme/Icon';
import SearchInput from '@/components/theme/SearchInput';
import { useTheme } from '@/components/theme/ThemeProvider';

interface HeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: { label: string; href?: string }[];
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, breadcrumbs, onMenuClick }) => {
    const { resolvedTheme, toggleTheme } = useTheme();

    return (
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0 z-header sticky top-0">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-surface-dark rounded-lg"
                    aria-label="Menüyü aç"
                >
                    <Icon name="menu" />
                </button>
                <div className="flex flex-col gap-0.5">
                    {breadcrumbs && breadcrumbs.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                            {breadcrumbs.map((crumb, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <span className="text-slate-300 dark:text-slate-600">/</span>}
                                    {crumb.href ? (
                                        <a href={crumb.href} className="hover:text-primary transition-colors">
                                            {crumb.label}
                                        </a>
                                    ) : (
                                        <span className="font-medium text-slate-600 dark:text-slate-300">{crumb.label}</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                    <h2 className="text-base sm:text-lg font-semibold sm:font-bold text-slate-800 dark:text-white leading-tight">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
                <SearchInput placeholder="Ara..." size="sm" className="hidden sm:flex w-64" />
                <button
                    onClick={toggleTheme}
                    className="size-9 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-dark flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                    aria-label={resolvedTheme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
                    title={resolvedTheme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
                >
                    <Icon name={resolvedTheme === 'dark' ? 'light_mode' : 'dark_mode'} size="sm" />
                </button>
                <button
                    className="size-9 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-dark flex items-center justify-center text-slate-400 hover:text-primary dark:hover:text-primary transition-colors relative"
                    aria-label="Bildirimler"
                >
                    <Icon name="notifications" size="sm" />
                    <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                </button>
                <button
                    className="size-9 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-dark flex items-center justify-center text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                    aria-label="Yardım"
                >
                    <Icon name="help" size="sm" />
                </button>
            </div>
        </header>
    );
};

export default Header;
