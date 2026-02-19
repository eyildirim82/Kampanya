'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import PublicHeader from '@/components/theme/PublicHeader';
import Footer from '@/components/theme/Footer';

interface AppShellProps {
  children: ReactNode;
}

const mainVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <PublicHeader />
      <motion.main
        className="flex-grow"
        initial="hidden"
        animate="visible"
        variants={mainVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {children}
      </motion.main>
      <Footer />
    </>
  );
}

