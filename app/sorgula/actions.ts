'use server';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { getSupabaseUrl } from '@/lib/supabase-url';
import { tcknSchema, phoneSchema } from '@/lib/schemas';

const sorgulaFormSchema = z.object({ tckn: tcknSchema, phone: phoneSchema });

export async function checkApplicationStatus(prevState: unknown, formData: FormData) {
    const tckn = String(formData.get('tckn') || '').trim();
    const phone = String(formData.get('phone') || '').trim();

    const parsed = sorgulaFormSchema.safeParse({ tckn, phone });
    if (!parsed.success) {
        const first = parsed.error.flatten().fieldErrors;
        const tcknErr = first.tckn?.[0];
        const phoneErr = first.phone?.[0];
        const message = tcknErr ?? phoneErr ?? 'Lütfen form alanlarını kontrol ediniz.';
        return { success: false, message };
    }
    const { tckn: validTckn, phone: validPhone } = parsed.data;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        return { success: false, message: 'Sistem hatası: Konfigürasyon eksik.' };
    }

    const client = createClient(getSupabaseUrl(), serviceRoleKey);

    const { data: rows, error } = await client.rpc('get_application_status_by_tckn_phone', {
        p_tckn: validTckn,
        p_phone: validPhone,
    });

    if (error) {
        return { success: false, message: 'Sorgulama sırasında bir hata oluştu.' };
    }

    if (!rows || rows.length === 0) {
        return { success: false, message: 'Bu bilgilerle eşleşen bir başvuru bulunamadı.' };
    }

    const results = rows.map((row: { id: string; created_at: string; status: string; campaign_name: string }) => ({
        id: row.id,
        date: new Date(row.created_at).toLocaleDateString('tr-TR'),
        campaignName: row.campaign_name || 'Genel Başvuru',
        status: row.status,
    }));

    return { success: true, data: results };
}
