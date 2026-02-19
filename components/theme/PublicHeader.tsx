'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import Icon from './Icon';
import Button from './Button';

interface PublicHeaderProps {
    variant?: 'glass' | 'minimal';
}

const PublicHeader: React.FC<PublicHeaderProps> = ({ variant = 'glass' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    const isAdmin = pathname?.startsWith('/admin');
    const isActive = (path: string) => pathname === path;

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (isAdmin) return null;

    return (
        <header
            className={twMerge(
                "fixed top-0 left-0 right-0 z-header transition-all duration-500 border-b",
                variant === 'glass'
                    ? scrolled
                        ? 'bg-[rgba(0,45,114,0.06)] backdrop-blur-md border-b border-[rgba(0,45,114,0.1)] py-2'
                        : 'bg-transparent border-transparent py-3'
                    : scrolled
                        ? 'bg-white/95 backdrop-blur-md border-[rgba(0,45,114,0.08)] py-2'
                        : 'bg-white border-slate-100/80 py-2.5'
            )}
        >
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className={twMerge(
                        "relative flex size-9 items-center justify-center rounded-lg transition-all duration-300",
                        variant === 'glass'
                            ? 'bg-white/5 border border-[rgba(0,45,114,0.15)] shadow-[0_0_12px_rgba(0,45,114,0.2)] group-hover:border-primary/40 group-hover:shadow-[0_0_16px_rgba(0,45,114,0.3)]'
                            : 'bg-primary/10 border border-primary/20 group-hover:bg-primary/20'
                    )}>
                        <Icon name="flight_takeoff" className={variant === 'glass' ? 'text-white' : 'text-primary'} />
                    </div>
                    <span className={twMerge(
                        "text-lg font-bold leading-none tracking-tight font-display",
                        variant === 'glass' ? 'text-white' : 'text-slate-900'
                    )}>TALPA</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {[
                        { href: '/', label: 'Kampanyalar' },
                        { href: '/sorgula', label: 'Başvuru Sorgula' },
                    ].map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={twMerge(
                                "relative px-4 py-2 text-sm font-medium transition-all rounded-lg",
                                variant === 'glass'
                                    ? isActive(link.href)
                                        ? 'text-white bg-[rgba(0,45,114,0.15)] border border-[rgba(0,45,114,0.2)]'
                                        : 'text-slate-400 hover:text-white hover:bg-[rgba(0,45,114,0.08)]'
                                    : isActive(link.href)
                                        ? 'text-primary bg-primary/5'
                                        : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                            )}
                        >
                            {link.label}
                            {isActive(link.href) && (
                                <div className={twMerge(
                                    "absolute bottom-0 left-2 right-2 h-0.5 rounded-full",
                                    variant === 'glass' ? 'bg-primary' : 'bg-primary'
                                )} />
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Action Area */}
                <div className="hidden md:flex items-center gap-3">
                    <Link href="/admin/login">
                        <Button
                            variant={variant === 'glass' ? 'secondary' : 'outline'}
                            size="sm"
                            icon="lock"
                        >
                            Personel Girişi
                        </Button>
                    </Link>
                </div>

                {/* Mobile Toggle */}
                <button
                    className={twMerge(
                        "md:hidden p-2 rounded-lg transition-colors border border-transparent hover:border-white/10",
                        variant === 'glass'
                            ? 'text-slate-300 hover:text-white hover:bg-white/10'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    )}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Icon name={isOpen ? 'close' : 'menu'} />
                </button>
            </div>

            {/* Mobile Menu */}
            {
                isOpen && (
                    <div className={twMerge(
                        "md:hidden border-t px-4 py-5 space-y-2",
                        variant === 'glass'
                            ? 'border-[rgba(0,45,114,0.1)] bg-[rgba(5,8,22,0.97)] backdrop-blur-md'
                            : 'border-[rgba(0,45,114,0.08)] bg-white/98 backdrop-blur-md'
                    )}>
                        <Link
                            href="/"
                            onClick={() => setIsOpen(false)}
                            className={twMerge(
                                "block text-sm font-medium p-3 rounded-lg transition-all",
                                variant === 'glass' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-primary hover:bg-primary/5'
                            )}
                        >
                            Kampanyalar
                        </Link>
                        <Link
                            href="/sorgula"
                            onClick={() => setIsOpen(false)}
                            className={twMerge(
                                "block text-sm font-medium p-3 rounded-lg transition-all",
                                variant === 'glass' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-primary hover:bg-primary/5'
                            )}
                        >
                            Başvuru Sorgula
                        </Link>
                        <div className={twMerge("h-px my-4", variant === 'glass' ? 'bg-white/10' : 'bg-slate-200')} />
                        <Link href="/admin/login" onClick={() => setIsOpen(false)}>
                            <Button fullWidth variant={variant === 'glass' ? 'secondary' : 'outline'} icon="lock">
                                Personel Girişi
                            </Button>
                        </Link>
                    </div>
                )
            }
        </header >
    );
};

export default PublicHeader;
