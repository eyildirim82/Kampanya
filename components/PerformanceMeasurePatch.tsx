'use client';

import { useEffect } from 'react';

/**
 * Next.js bilinen hatası (negative time stamp) için geçici yama.
 * Geliştirme ortamında performance.measure() hatalarını yakalayıp bastırır.
 * @see https://github.com/vercel/next.js/issues/86060
 */
export function PerformanceMeasurePatch() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return;
    const perf = window.performance;
    if (!perf?.measure || (perf as unknown as { __measurePatched?: boolean }).__measurePatched) return;

    const original = perf.measure.bind(perf);
    (perf as any).measure = function (name: string, startOrMeasureOptions?: string | PerformanceMeasureOptions, endMark?: string) {
      try {
        // @ts-ignore - overloading complexity
        return original(name, startOrMeasureOptions, endMark);
      } catch (err) {
        const msg = (err instanceof Error ? err.message : String(err)) ?? '';
        if (msg.includes('negative time stamp')) return;
        throw err;
      }
    };
    (perf as unknown as { __measurePatched?: boolean }).__measurePatched = true;
  }, []);

  return null;
}
