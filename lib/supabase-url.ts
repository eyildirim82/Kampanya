/**
 * Supabase URL tek kaynak. Server-side: SUPABASE_INTERNAL_URL (varsa) veya NEXT_PUBLIC_SUPABASE_URL.
 * Client/edge'de sadece NEXT_PUBLIC_SUPABASE_URL kullanılmalı.
 */
export function getSupabaseUrl(): string {
  const internal = process.env.SUPABASE_INTERNAL_URL?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const url = internal || publicUrl;
  if (!url) {
    throw new Error('Supabase URL is not set (SUPABASE_INTERNAL_URL or NEXT_PUBLIC_SUPABASE_URL).');
  }
  return url;
}
