'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '@/components/theme/Icon';

interface NavItem {
    to: string;
    icon: string;
    label: string;
}

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const mainNavItems: NavItem[] = [
    { to: '/admin', icon: 'dashboard', label: 'Genel Bakış' },
    { to: '/admin/campaigns', icon: 'campaign', label: 'Kampanyalar' },
    { to: '/admin/interests', icon: 'group_add', label: 'Talepler' },
];

const systemNavItems: NavItem[] = [
    { to: '/admin/whitelist', icon: 'verified_user', label: 'Üye Listesi' },
    { to: '/admin/fields', icon: 'dynamic_form', label: 'Alan Kütüphanesi' },
    { to: '/admin/settings', icon: 'settings', label: 'Genel Ayarlar' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        router.push('/admin/login');
    };

    const isActive = (to: string) => pathname === to || pathname?.startsWith(`${to}/`);

    const SidebarNavItem = ({ item }: { item: NavItem }) => {
        const active = isActive(item.to);
        return (
            <Link
                href={item.to}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    active
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-blue-100 hover:bg-white/5'
                }`}
            >
                <Icon name={item.icon} size="sm" className={active ? 'text-white' : 'text-blue-200 group-hover:text-white'} />
                <span className="text-sm">{item.label}</span>
                {active && <Icon name="chevron_right" size="xs" className="ml-auto opacity-50" />}
            </Link>
        );
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-sidebar-backdrop bg-slate-900/50 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />
            )}

            <aside className={`fixed inset-y-0 left-0 z-sidebar w-72 bg-primary text-white transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            } shadow-2xl`}>
                {/* Logo */}
                <div className="p-6 flex items-center gap-3">
                    <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center shadow-lg">
                        <Icon name="flight_takeoff" className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-none tracking-tight">TALPA</h1>
                        <span className="text-xs text-blue-200/70">Admin Portal</span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="md:hidden ml-auto text-blue-200 hover:text-white">
                        <Icon name="close" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-1 py-2">
                    <div className="text-[10px] font-bold text-blue-300/70 uppercase tracking-widest mb-3 px-4">Yönetim</div>
                    {mainNavItems.map((item) => (
                        <SidebarNavItem key={item.to} item={item} />
                    ))}

                    <div className="border-t border-blue-800/50 my-4" />

                    <div className="text-[10px] font-bold text-blue-300/70 uppercase tracking-widest mb-3 px-4">Sistem</div>
                    {systemNavItems.map((item) => (
                        <SidebarNavItem key={item.to} item={item} />
                    ))}
                </nav>

                {/* User Profile */}
                <div className="bg-blue-900/40 rounded-xl p-4 mx-4 mb-4 border border-blue-800/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="size-10 rounded-full bg-blue-800 flex items-center justify-center text-sm font-bold border border-blue-700">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">Admin User</div>
                            <div className="text-xs text-blue-300/70 truncate">admin@talpa.org</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-200 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors"
                    >
                        <Icon name="logout" size="sm" />
                        Çıkış Yap
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
