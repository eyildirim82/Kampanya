'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import PublicHeader from '@/components/theme/PublicHeader';
import Footer from '@/components/theme/Footer';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    // Admin panel: sadece içerik, public header/footer yok
    return <>{children}</>;
  }

  return (
    <>
      <PublicHeader />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </>
  );
}

