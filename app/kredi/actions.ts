'use server';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
// For Docker networking: Use internal URL for server-side requests if available
const supabaseInternalUrl = process.env.SUPABASE_INTERNAL_URL || supabaseUrl;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are missing.');
}
const supabase = createClient(supabaseInternalUrl || '', supabaseKey || '');

// HMAC Secret for Session Tokens
const SESSION_SECRET = process.env.SESSION_SECRET || 'temp_secret_change_me_in_prod';

// Credit Campaign Code
// Helper to format amount
function formatAmount(val: string) {
    if (val === 'other') return 'Diğer / Belirtilmemiş';
    return parseInt(val.replace(/_/g, '')).toLocaleString('tr-TR') + ' TL';
}

const CREDIT_CAMPAIGN_CODE = 'CREDIT_2026';

// ----------------------------------------------------------------------
// HELPER: TCKN Validation
// ----------------------------------------------------------------------
function validateTckn(tckn: string): boolean {
    if (!tckn || tckn.length !== 11) return false;
    if (!/^[1-9][0-9]*$/.test(tckn)) return false;

    const digits = tckn.split('').map(Number);
    const current13579 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const current2468 = digits[1] + digits[3] + digits[5] + digits[7];
    const digit10 = ((current13579 * 7) - current2468) % 10;
    if (digit10 !== digits[9]) return false;
    let total10 = 0;
    for (let i = 0; i < 10; i++) total10 += digits[i];
    if ((total10 % 10) !== digits[10]) return false;
    return true;
}

// ----------------------------------------------------------------------
// HELPER: Session Token
// ----------------------------------------------------------------------
function createSessionToken(tckn: string): string {
    const payload = {
        tckn,
        exp: Date.now() + 15 * 60 * 1000 // 15 Minutes
    };
    const data = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
    return `${Buffer.from(data).toString('base64')}.${signature}`;
}

function verifySessionToken(token: string): string | null {
    try {
        const [b64Data, signature] = token.split('.');
        if (!b64Data || !signature) return null;
        const data = Buffer.from(b64Data, 'base64').toString();
        const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
        if (signature !== expectedSignature) return null;
        const payload = JSON.parse(data);
        if (Date.now() > payload.exp) return null;
        return payload.tckn;
    } catch {
        return null;
    }
}

// ----------------------------------------------------------------------
// HELPER: Get Credit Campaign ID
// ----------------------------------------------------------------------
async function getCreditCampaignId(preferredCampaignId?: string): Promise<string | null> {
    if (preferredCampaignId) {
        const { data: explicitCampaign } = await supabase
            .from('campaigns')
            .select('id, is_active')
            .eq('id', preferredCampaignId)
            .eq('is_active', true)
            .maybeSingle();

        if (explicitCampaign?.id) return explicitCampaign.id;
    }

    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    const activeCampaigns = (campaigns || []) as Array<{
        id: string;
        campaign_code?: string | null;
        name?: string | null;
        title?: string | null;
    }>;

    const byCode = activeCampaigns.find((campaign) => campaign.campaign_code === CREDIT_CAMPAIGN_CODE);
    if (byCode) return byCode.id;

    const byName = activeCampaigns.find((campaign) =>
        (campaign.name || campaign.title || '').toLocaleLowerCase('tr-TR').includes('kredi')
    );
    return byName?.id || activeCampaigns[0]?.id || null;
}

// ----------------------------------------------------------------------
// ACTION: Check Credit TCKN Status
// ----------------------------------------------------------------------
export async function checkCreditTcknStatus(tckn: string, campaignId?: string) {
    if (!validateTckn(tckn)) return { status: 'INVALID', message: 'Geçersiz TCKN (Algoritma).' };

    const targetCampaignId = await getCreditCampaignId(campaignId);
    if (!targetCampaignId) return { status: 'ERROR', message: 'Aktif kredi kampanyası bulunamadı.' };

    try {
        // 1. TALPA Membership Check
        const { data: memberStatus, error: memberError } = await supabase
            .rpc('verify_member', { p_tckn_plain: tckn });

        if (memberError || !memberStatus || memberStatus.length === 0 || memberStatus[0].status === 'NOT_FOUND') {
            return { status: 'NOT_FOUND', message: 'TALPA üyeliğiniz doğrulanamadı.' };
        }

        const memberId = memberStatus[0].id;

        // 2. Check Existing Credit Application
        const { data: checkResult } = await supabase.rpc('check_existing_application', {
            p_tckn_plain: tckn,
            p_campaign_id: targetCampaignId,
            p_member_id: memberId
        });

        if (checkResult?.exists) {
            return {
                status: 'EXISTS',
                message: 'Bu kampanya için zaten başvurunuz bulunmaktadır.'
            };
        }

        // 3. Generate Session
        const sessionToken = createSessionToken(tckn);
        return { status: 'NEW_MEMBER', message: 'Başarılı', sessionToken };

    } catch (error) {
        console.error('Credit Check Error:', error);
        return { status: 'ERROR', message: 'Sistem hatası.' };
    }
}

// ----------------------------------------------------------------------
// FORM ACTIONS
// ----------------------------------------------------------------------
const formSchema = z.object({
    tckn: z.string().length(11),
    fullName: z.string().min(2),
    phone: z.string().min(10),
    isDenizbankCustomer: z.enum(['yes', 'no']),
    requestedAmount: z.enum(['1_000_000', '2_000_000', '5_000_000', 'other']),
    phoneSharingConsent: z.boolean(),
    tcknSharingConsent: z.boolean(),
});

export type FormState = {
    success: boolean;
    message?: string;
    errors?: Record<string, string[]>;
};

export async function submitCreditApplication(prevState: FormState, formData: FormData): Promise<FormState> {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
        if (!key.startsWith('$ACTION')) rawData[key] = value;
    }

    // Booleans
    ['phoneSharingConsent', 'tcknSharingConsent'].forEach(k => {
        rawData[k] = rawData[k] === 'on' || rawData[k] === 'true';
    });

    // 0. Session Auth
    if (!rawData.sessionToken) return { success: false, message: 'Oturum hatası.' };
    const sessionTckn = verifySessionToken(rawData.sessionToken);
    if (!sessionTckn || sessionTckn !== rawData.tckn) return { success: false, message: 'Oturum geçersiz.' };

    // 1. Validations
    const validated = formSchema.safeParse(rawData);
    if (!validated.success) return { success: false, message: 'Form hatalı.' };
    const data = validated.data;

    const requestedCampaignId = typeof rawData.campaignId === 'string' ? rawData.campaignId : undefined;
    const targetCampaignId = await getCreditCampaignId(requestedCampaignId);
    if (!targetCampaignId) return { success: false, message: 'Kampanya bulunamadı.' };

    try {
        // 2. No encryption (Plaintext storage)
        const encryptedTckn = data.tckn;

        // 3. Submit
        const consentMetadata = {
            ip,
            userAgent: headersList.get('user-agent') || 'Unknown',
            timestamp: new Date().toISOString(),
            consentVersion: 'v1.0-credit'
        };

        const { data: rpcResult, error: dbError } = await supabase.rpc('submit_application_secure', {
            p_tckn_plain: data.tckn,
            p_campaign_id: targetCampaignId,
            p_encrypted_tckn: encryptedTckn || 'enc_error', // fallback
            p_form_data: {
                fullName: data.fullName,
                phone: data.phone,
                email: 'no-email@denizbank-kredi.com', // Placeholder to satisfy DB constraint
                // These go to dynamic_data and will be shown in Admin
                musterisi_mi: data.isDenizbankCustomer === 'yes' ? 'Evet' : 'Hayır',
                talep_edilen_limit: formatAmount(data.requestedAmount),

                // Consents
                ozel_iletisim_izni: data.phoneSharingConsent ? '✅ Evet' : '❌ Hayır', // Communication/Phone Sharing merged logic
                tckn_paylasim_izni: data.tcknSharingConsent ? '✅ Evet' : '❌ Hayır',

                // Raw Data
                _raw_is_customer: data.isDenizbankCustomer,
                _raw_amount: data.requestedAmount
            },
            p_consent_metadata: consentMetadata
        });

        if (dbError || !rpcResult?.success) {
            console.error('Credit Submit Error:', dbError, rpcResult);
            return { success: false, message: rpcResult?.message || 'Kaydedilemedi.' };
        }

        return { success: true, message: 'Başvurunuz alınmıştır.' };

    } catch (e) {
        logger.error('Credit Submit Panic', e as Error);
        return { success: false, message: 'Sistem hatası.' };
    }
}
