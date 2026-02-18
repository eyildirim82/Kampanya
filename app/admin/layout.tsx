'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    const isLoginPage = pathname === '/admin/login';

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex font-sans">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
                <Header
                    title="Dashboard"
                    subtitle="Hoşgeldiniz, sistem durum özeti aşağıdadır."
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-background-light dark:bg-background-dark">
                    {children}
                </div>
            </main>
        </div>
    );
}
