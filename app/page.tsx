'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/basvuru');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-[#002855] mb-4">TALPA</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002855] mx-auto"></div>
        <p className="mt-4 text-gray-500">Yönlendiriliyorsunuz...</p>
      </div>
    </div>
  );
}
