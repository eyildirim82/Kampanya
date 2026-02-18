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

/**
 * Service role client'ı oluşturur. Yalnızca server-side, güvenli RPC çağrıları için kullanılmalıdır.
 * Service role RLS'yi bypass eder, bu yüzden dikkatli kullanılmalıdır.
 */
export function getServiceRoleClient() {
    const url = getSupabaseUrl();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!key) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is missing. This is required for secure RPC calls.');
    }
    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
