'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/app/admin/actions';

export async function createCampaignAction(formData: FormData) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) {
        return { success: false, message: 'Oturum bulunamadı veya yetkisiz erişim.' };
    }

    const title = formData.get('title') as string;
    const campaignCode = formData.get('campaignCode') as string;

    if (!title) {
        return { success: false, message: 'Kampanya başlığı zorunludur.' };
    }

    // Generate slug from title if not provided/auto
    const slug = title
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const code = campaignCode || `CMP-${Date.now()}`;

    const { data, error } = await adminSupabase
        .from('campaigns')
        .insert({
            name: title,
            campaign_code: code,
            slug: slug,
            is_active: false, // Default to draft/inactive
            status: 'draft',
            form_schema: [], // Empty schema
            page_content: {}
        })
        .select('id')
        .single();

    if (error) {
        console.error('Create Campaign Error:', error);
        return { success: false, message: 'Oluşturma hatası: ' + error.message };
    }

    revalidatePath('/admin/campaigns');
    return { success: true, message: 'Kampanya oluşturuldu.', campaignId: data.id };
}
