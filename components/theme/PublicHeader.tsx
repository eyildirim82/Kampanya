'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, Plane, Lock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from './Button';
import { twMerge } from 'tailwind-merge';

const PublicHeader: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={twMerge(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b",
                scrolled
                    ? 'bg-talpa-bg/80 backdrop-blur-xl border-white/10 py-2'
                    : 'bg-transparent border-transparent py-6'
            )}
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

                {/* Logo Area */}
                <Link href="/" className="flex items-center gap-4 group">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white shadow-[0_0_15px_rgba(0,40,85,0.5)] transition-all duration-300 group-hover:border-talpa-accent/50 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                        <Plane className="h-6 w-6 transform -rotate-45" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold leading-none text-white tracking-tighter">TALPA</span>
                        <span className="text-[10px] font-mono text-talpa-accent/70 uppercase tracking-[0.2em]">Kampanya Portalı</span>
                    </div>
                </Link>

                {/* Desktop Nav - HUD Style */}
                <nav className="hidden md:flex items-center gap-1">
                    <Link
                        href="/"
                        className={twMerge(
                            "relative px-4 py-2 text-sm font-medium transition-all rounded-md overflow-hidden",
                            isActive('/')
                                ? 'text-white bg-white/10 border border-white/5'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <span className="relative z-10">KAMPANYALAR</span>
                        {isActive('/') && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-deniz-red"></div>}
                    </Link>
                </nav>

                {/* Action Area */}
                <div className="hidden md:flex items-center gap-4">
                    <div className="h-6 w-px bg-white/10 mx-2"></div>
                    <Link href="/admin/login">
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" leftIcon={<Lock className="h-3 w-3" />}>
                            PERSONEL GİRİŞİ
                        </Button>
                    </Link>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {isOpen && (
                <div className="md:hidden border-t border-white/10 bg-talpa-bg/95 backdrop-blur-xl px-4 py-6 space-y-2 animate-in slide-in-from-top-2">
                    <Link
                        href="/"
                        onClick={() => setIsOpen(false)}
                        className="block text-sm font-bold text-slate-300 hover:text-white hover:bg-white/10 p-3 rounded-lg uppercase tracking-widest border border-transparent hover:border-white/10 transition-all"
                    >
                        Kampanyalar
                    </Link>
                    <div className="h-px bg-white/10 my-4"></div>
                    <Link href="/admin/login" onClick={() => setIsOpen(false)}>
                        <Button fullWidth variant="secondary" leftIcon={<Lock className="h-4 w-4" />}>
                            YÖNETİCİ PORTALI
                        </Button>
                    </Link>
                </div>
            )}
        </header>
    );
};

export default PublicHeader;
