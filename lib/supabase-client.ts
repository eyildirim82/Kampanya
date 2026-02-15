import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from '@/lib/supabase-url';

/**
 * Supabase anon client'ı sadece çağrıldığında oluşturur (lazy).
 * Build sırasında modül yüklenirken env olmayabilir; client yalnızca runtime'da istek içinde oluşturulmalı.
 */
export function getSupabaseClient() {
    const url = getSupabaseUrl();
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!key) throw new Error('Supabase environment variables are missing.');
    return createClient(url, key);
}
