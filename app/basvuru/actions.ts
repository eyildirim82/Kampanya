'use server';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { resolveCampaignId } from './campaign';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are missing.');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// HMAC Secret for Session Tokens
const DEFAULT_SECRET = 'temp_secret_change_me_in_prod';
const SESSION_SECRET = process.env.SESSION_SECRET || DEFAULT_SECRET;

if (process.env.NODE_ENV === 'production' && SESSION_SECRET === DEFAULT_SECRET) {
    throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET is not set in production environment.');
}

// ----------------------------------------------------------------------
// HELPER: TCKN Validation (Mod10/Mod11)
// ----------------------------------------------------------------------
function validateTckn(tckn: string): boolean {
    if (!tckn || tckn.length !== 11) return false;
    if (!/^[1-9][0-9]*$/.test(tckn)) return false;

    const digits = tckn.split('').map(Number);

    // Algoritma Adım 1: 1, 3, 5, 7, 9. hanelerin toplamı t1
    // 2, 4, 6, 8. hanelerin toplamı t2
    const current13579 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const current2468 = digits[1] + digits[3] + digits[5] + digits[7];

    // 10. hane kontrolü: (t1 * 7 - t2) % 10
    const digit10 = ((current13579 * 7) - current2468) % 10;
    if (digit10 !== digits[9]) return false;

    // 11. hane kontrolü: İlk 10 hanenin toplamı % 10
    let total10 = 0;
    for (let i = 0; i < 10; i++) total10 += digits[i];

    if ((total10 % 10) !== digits[10]) return false;

    return true;
}



// ----------------------------------------------------------------------
// HELPER: Session Token (HMAC Signed JSON)
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


// Validation Schema
const formSchema = z.object({
    tckn: z.string().length(11, "TCKN 11 haneli olmalıdır."),
    fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
    phone: z.string()
        .length(10, "Telefon numarası 10 haneli olmalıdır (başında 0 olmadan)")
        .regex(/^[1-9][0-9]{9}$/, "Telefon numarası başında 0 olmadan yazılmalıdır"),
    email: z.string().email("Geçerli bir e-posta adresi giriniz.").optional(),
    address: z.string().optional(),
    deliveryMethod: z.enum(['branch', 'address']),
    // New Consents
    addressSharingConsent: z.boolean(),
    cardApplicationConsent: z.boolean().refine(val => val === true, "Kart başvurusu onayı zorunludur."),
    tcknPhoneSharingConsent: z.boolean().refine(val => val === true, "TC kimlik ve telefon paylaşım onayı zorunludur."),
    sessionToken: z.string().min(1, "Oturum süreniz dolmuş.") // REQUIRED for Security
}).superRefine((data, ctx) => {
    // Custom Error Messages for Enums
    if (!data.deliveryMethod) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Teslimat yöntemi seçiniz.", path: ["deliveryMethod"] });
    }

    // TCKN Validation
    if (!validateTckn(data.tckn)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Geçersiz T.C. Kimlik Numarası.",
            path: ["tckn"]
        });
    }


    if (data.deliveryMethod === 'address') {
        if (!data.address || data.address.length < 10) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Teslimat adresi için geçerli bir adres giriniz (en az 10 karakter, tam adres).",
                path: ["address"]
            });
        }
        // Address sharing consent validation
        if (!data.addressSharingConsent) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Adres paylaşımı onayı zorunludur.",
                path: ["addressSharingConsent"]
            });
        }
    }
});

export type FormState = {
    success: boolean;
    message?: string;
    errors?: Record<string, string[]>;
};



// ----------------------------------------------------------------------
// ACTION: Check TCKN Status (Start Flow)
// ----------------------------------------------------------------------
export async function checkTcknStatus(tckn: string, campaignId?: string) {
    if (!validateTckn(tckn)) return { status: 'INVALID', message: 'Geçersiz TCKN (Algoritma).' };

    const targetCampaignId = await resolveCampaignId(campaignId);
    if (!targetCampaignId) return { status: 'ERROR', message: 'Aktif başvuru dönemi bulunamadı.' };

    try {
        // 1. TALPA Üyelik Kontrolü (Whitelist) - verify_member RPC (plaintext TCKN alır)
        const { data: memberStatus, error: memberError } = await supabase
            .rpc('verify_member', { p_tckn_plain: tckn });

        // The RPC returns TABLE(id UUID, status TEXT) - rows
        // If empty -> Not found.
        if (memberError || !memberStatus || memberStatus.length === 0 || memberStatus[0].status === 'NOT_FOUND') {
            return { status: 'NOT_FOUND', message: 'TALPA listesinde kaydınız bulunamadı. Lütfen TALPA ile iletişime geçiniz.' };
        }

        // Check for DEBTOR status
        if (memberStatus[0].status === 'DEBTOR') {
            return {
                status: 'BLOCKED',
                message: 'Derneğimizde bulunan borcunuz nedeniyle işleminize devam edilememektedir. Lütfen muhasebe birimi ile iletişime geçiniz.'
            };
        }

        const memberId = memberStatus[0].id;

        // 2. Check Existing Application (Using RPC to bypass RLS)
        const { data: checkResult } = await supabase.rpc('check_existing_application', {
            p_tckn_plain: tckn,
            p_campaign_id: targetCampaignId,
            p_member_id: memberId
        });

        if (checkResult?.exists) {
            // EXISTS -> STRICT BLOCK
            return {
                status: 'EXISTS',
                message: 'Bu T.C. Kimlik Numarası ile daha önce yapılmış bir başvuru bulunmaktadır. Mükerrer başvuru yapılamaz.'
            };
        } else {
            // NEW -> Proceed
            const sessionToken = createSessionToken(tckn); // Generate Token
            return { status: 'NEW_MEMBER', message: 'Yeni başvuru.', memberId: memberId, sessionToken };
        }
    } catch (error) {
        console.error('Check Error:', error);
        return { status: 'ERROR', message: 'Sorgulama sırasında teknik bir aksaklık oluştu. Lütfen kısa bir süre sonra tekrar deneyiniz.' };
    }
}



export async function submitApplication(prevState: FormState, formData: FormData): Promise<FormState> {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';

    // Parse
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
        if (!key.startsWith('$ACTION')) rawData[key] = value;
    }

    // Convert Booleans
    ['addressSharingConsent', 'cardApplicationConsent', 'tcknPhoneSharingConsent'].forEach(k => {
        rawData[k] = rawData[k] === 'on' || rawData[k] === 'true';
    });

    // 0. SESSION CHECK
    if (!rawData.sessionToken) return { success: false, message: 'Oturum bilgisi bulunamadı.' };
    const sessionTckn = verifySessionToken(rawData.sessionToken);

    if (!sessionTckn) return { success: false, message: 'Oturum süreniz dolmuş (15dk). Lütfen sayfayı yenileyip tekrar giriş yapınız.' };
    if (sessionTckn !== rawData.tckn) return { success: false, message: 'Kimlik doğrulama hatası.' };

    // 1. Campaign Check (Prefer explicit campaignId, fallback to default active campaign)
    const requestedCampaignId = typeof rawData.campaignId === 'string' ? rawData.campaignId : undefined;
    const targetCampaignId = await resolveCampaignId(requestedCampaignId);
    if (!targetCampaignId) return { success: false, message: 'Aktif kampanya yok.' };

    // 2. Validate Schema
    const validated = formSchema.safeParse(rawData);
    if (!validated.success) {
        return { success: false, errors: validated.error.flatten().fieldErrors, message: 'Form hatalı.' };
    }
    const data = validated.data;

    try {
        // 3. Submit (Secure RPC)
        const consentMetadata = {
            ip,
            userAgent: headersList.get('user-agent') || 'Unknown',
            timestamp: new Date().toISOString(),
            consentVersion: 'v1.0'
        };

        const { data: rpcResult, error: dbError } = await supabase.rpc('submit_dynamic_application_secure', {
            p_campaign_id: targetCampaignId,
            p_tckn: data.tckn,
            p_form_data: {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                address: data.address,
                deliveryMethod: data.deliveryMethod,
                // Consents (only 3 new ones)
                addressSharingConsent: data.addressSharingConsent || false,
                cardApplicationConsent: data.cardApplicationConsent,
                tcknPhoneSharingConsent: data.tcknPhoneSharingConsent,
                // Meta
                consent_metadata: consentMetadata
            },
            p_client_ip: ip
        });

        if (dbError || !rpcResult?.success) {
            console.error('Submit Error:', dbError, rpcResult);
            return { success: false, message: rpcResult?.message || 'Kaydedilemedi. Lütfen tekrar deneyiniz.' };
        }

        return { success: true, message: 'Başvurunuz başarıyla alınmıştır.' };

    } catch (e) {
        logger.error('Submit Panic', e as Error);
        return { success: false, message: 'Başvurunuz işlenirken teknik bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.' };
    }
}
