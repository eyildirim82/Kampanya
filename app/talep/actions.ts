'use server';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { headers } from 'next/headers';
import { tcknSchema, fullNameSchema } from '@/lib/schemas';
import { resolveCampaignId } from '../basvuru/campaign';
import { getSupabaseClient } from '@/lib/supabase-client';

const interestSchema = z.object({
    tckn: tcknSchema,
    fullName: fullNameSchema,
    email: z.string().email("Geçerli bir e-posta adresi giriniz."),
    phone: z.string().optional().or(z.literal('')),
    note: z.string().optional(),
    campaignId: z.string().uuid("Geçersiz kampanya ID."),
});

type InterestState = {
    success: boolean;
    message?: string;
    errors?: Record<string, string[]>;
};


// Added whitelist check
export async function submitInterest(prevState: InterestState, formData: FormData): Promise<InterestState> {
    const supabase = getSupabaseClient();
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    // Parse Data
    const rawData = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        tckn: formData.get('tckn'),
        note: formData.get('note'),
        campaignId: formData.get('campaignId'),
    };

    // Validate Schema
    const validated = interestSchema.safeParse(rawData);
    if (!validated.success) {
        return { success: false, errors: validated.error.flatten().fieldErrors, message: 'Lütfen form alanlarını kontrol ediniz.' };
    }
    const data = validated.data;

    // TCKN Validation (Mandatory now)
    if (!data.tckn || data.tckn.length !== 11) {
        return { success: false, message: 'Geçersiz T.C. Kimlik Numarası.' };
    }

    try {
        // 0. Whitelist / Membership Check
        const { data: memberStatus, error: memberError } = await supabase
            .rpc('verify_member', { p_tckn_plain: data.tckn });

        if (memberError || !memberStatus || memberStatus.length === 0 || memberStatus[0].status === 'NOT_FOUND') {
            return { success: false, message: 'TALPA üye listesinde kaydınız bulunamadı. Lütfen TALPA ile iletişime geçiniz.' };
        }

        if (memberStatus[0].status === 'DEBTOR') {
            return { success: false, message: 'Derneğimizde bulunan borcunuz nedeniyle işleminize devam edilememektedir.' };
        }

        // 1. Rate limiting: max 3 requests per hour per TCKN/action
        const { data: isAllowed, error: rateError } = await supabase.rpc('check_rate_limit', {
            p_tckn: data.tckn,
            p_action: 'submit_interest',
        });

        if (rateError) {
            console.error('Rate Limit Error:', rateError);
            return { success: false, message: 'İşlem sınırı kontrolü yapılamadı.' };
        }

        if (!isAllowed) {
            return { success: false, message: 'Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyiniz.' };
        }

        // 2. Insert into interests
        const { error: insertError } = await supabase
            .from('interests')
            .insert({
                campaign_id: data.campaignId,
                full_name: data.fullName,
                email: data.email,
                phone: data.phone || null,
                tckn: data.tckn, // Now mandatory
                note: data.note || null
            });

        if (insertError) {
            // Handle Unique Constraint (Duplicate)
            if (insertError.code === '23505') { // unique_violation
                return { success: false, message: 'Bu e-posta adresi ile zaten bir talebiniz bulunmaktadır.' };
            }
            console.error('Insert Error:', insertError);
            return { success: false, message: 'Kayıt sırasında bir hata oluştu.' };
        }

        return { success: true, message: 'Talebiniz başarıyla alınmıştır. Teşekkür ederiz.' };

    } catch (error) {
        console.error('Submit Interest Panic:', error);
        return { success: false, message: 'Beklenmedik bir hata oluştu.' };
    }
}
