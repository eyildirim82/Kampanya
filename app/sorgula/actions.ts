'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function checkApplicationStatus(prevState: unknown, formData: FormData) {
    const tckn = String(formData.get('tckn') || '').trim();
    const phone = String(formData.get('phone') || '').trim();

    if (!tckn || tckn.length !== 11) {
        return { success: false, message: 'Lütfen geçerli bir T.C. Kimlik Numarası giriniz.' };
    }

    if (!phone || phone.length < 10) {
        return { success: false, message: 'Lütfen geçerli bir telefon numarası giriniz.' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query for application matching BOTH TCKN and Phone
    // We intentionally do NOT use the Service Role key here (or we limit query strictly)
    // But since RLS might be active, we might need Service Role if "anon" can't read.
    // However, "anon" usually can't read all applications. 
    // So we should use a controlled query with Service Role, OR a specific RPC.
    // For safety and simplicity in this architecture without user auth, 
    // we use Service Role but logic-bound to exact match.

    // Better: Use Service Role but select only status fields.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        return { success: false, message: 'Sistem hatası: Konfigürasyon eksik.' };
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: applications, error } = await adminClient
        .from('applications')
        .select(`
            id,
            created_at,
            status,
            campaign_id,
            campaigns ( name )
        `)
        .eq('tckn', tckn)
        .eq('phone', phone)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Status Query Error:', error);
        return { success: false, message: 'Sorgulama sırasında bir hata oluştu.' };
    }

    if (!applications || applications.length === 0) {
        return { success: false, message: 'Bu bilgilerle eşleşen bir başvuru bulunamadı.' };
    }

    // Map status to user friendly text
    const results = applications.map((app: any) => ({
        id: app.id,
        date: new Date(app.created_at).toLocaleDateString('tr-TR'),
        campaignName: app.campaigns?.name || 'Genel Başvuru',
        status: app.status
    }));

    return { success: true, data: results };
}
