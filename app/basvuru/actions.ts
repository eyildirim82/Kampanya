'use server';

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/smtp';
import { z } from 'zod';
import { getUserEmailTemplate, getAdminEmailTemplate, getGenericEmailTemplate } from '@/lib/email-templates';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()!;
const supabase = createClient(supabaseUrl, supabaseKey);

// HMAC Secret for Session Tokens (Use Env or fallback to generated one for runtime)
const SESSION_SECRET = process.env.SESSION_SECRET || 'temp_secret_change_me_in_prod';

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
    } catch (e) {
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



// Helper to get default active campaign
async function getDefaultCampaignId(): Promise<string | null> {
    const { data } = await supabase
        .from('campaigns')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    return data?.id || null;
}

// ----------------------------------------------------------------------
// ACTION: Check TCKN Status (Start Flow)
// ----------------------------------------------------------------------
export async function checkTcknStatus(tckn: string) {
    if (!validateTckn(tckn)) return { status: 'INVALID', message: 'Geçersiz TCKN (Algoritma).' };

    const targetCampaignId = await getDefaultCampaignId();
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

        const memberId = memberStatus[0].id;

        // 2. Check Existing Application (Using RPC to bypass RLS)
        const { data: checkResult, error: checkError } = await supabase.rpc('check_existing_application', {
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
        return { status: 'ERROR', message: 'Beklenmedik bir hata oluştu.' };
    }
}



export async function submitApplication(prevState: FormState, formData: FormData): Promise<FormState> {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';

    // Parse
    const rawData: any = {};
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

    // 1. Campaign Check (Force Active Campaign)
    // Ignore passed campaignId, always use active one
    const activeCampaignId = await getDefaultCampaignId();
    if (!activeCampaignId) return { success: false, message: 'Aktif kampanya yok.' };

    // Assign to data object for DB insert
    const campaignId = activeCampaignId;

    // 2. Validate Schema
    const validated = formSchema.safeParse(rawData);
    if (!validated.success) {
        return { success: false, errors: validated.error.flatten().fieldErrors, message: 'Form hatalı.' };
    }
    const data = validated.data;

    try {
        // 3. Rate Limit
        const { data: isAllowed } = await supabase.rpc('check_rate_limit', {
            p_ip_address: ip, p_endpoint: 'submit_application', p_max_requests: 100, p_window_minutes: 60
        });
        if (!isAllowed) return { success: false, message: 'Çok fazla deneme.' };

        // 4. Encrypt TCKN (Wait, we need to pass Encrypted TCKN to secure RPC too?)
        // Yes, `submit_application_secure` needs keys.
        const encryptionKey = process.env.TCKN_ENCRYPTION_KEY || 'mysecretkey';
        const { data: encryptedTckn } = await supabase.rpc('encrypt_tckn', { p_tckn: data.tckn, p_key: encryptionKey });
        if (!encryptedTckn) return { success: false, message: 'Şifreleme hatası.' };

        // 5. Submit (Secure RPC)
        const consentMetadata = {
            ip,
            userAgent: headersList.get('user-agent') || 'Unknown',
            timestamp: new Date().toISOString(),
            consentVersion: 'v1.0'
        };

        const { data: rpcResult, error: dbError } = await supabase.rpc('submit_application_secure', {
            p_tckn_plain: data.tckn,
            p_campaign_id: campaignId,
            p_encrypted_tckn: encryptedTckn,
            p_form_data: {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                address: data.address,
                deliveryMethod: data.deliveryMethod,
                // Consents (only 3 new ones)
                addressSharingConsent: data.addressSharingConsent || false,
                cardApplicationConsent: data.cardApplicationConsent,
                tcknPhoneSharingConsent: data.tcknPhoneSharingConsent
            },
            p_consent_metadata: consentMetadata
        });

        if (dbError || !rpcResult?.success) {
            console.error('Submit Error:', dbError, rpcResult);
            // #region agent log
            fetch('http://127.0.0.1:7247/ingest/f93d5c7d-e15e-4725-83b1-8e8a375674f4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'actions.ts:293', message: 'Submit failed', data: { dbError: dbError?.message, rpcResult }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
            // #endregion
            return { success: false, message: rpcResult?.message || 'Kaydedilemedi.' };
        }

        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/f93d5c7d-e15e-4725-83b1-8e8a375674f4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'actions.ts:297', message: 'Application saved successfully', data: { applicationId: rpcResult?.application_id, email: data.email, hasEmail: !!data.email }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion

        // ------------------------------------------------------------------
        // DEBUG FALLBACK: Trigger email edge function directly (bypasses DB trigger)
        // This is to gather runtime evidence for edge function reachability and SMTP.
        // ------------------------------------------------------------------
        try {
            const fnBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
            const fnUrl = fnBaseUrl ? `${fnBaseUrl}/functions/v1/process-email` : null;
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
            const jwtParts = serviceRoleKey ? serviceRoleKey.split('.').length : 0;
            const isJwtLike = jwtParts === 3;

            const safeDecodeJwt = (jwt?: string) => {
                try {
                    if (!jwt) return null;
                    const parts = jwt.split('.');
                    if (parts.length !== 3) return { parts: parts.length };
                    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
                    const json = Buffer.from(padded, 'base64').toString('utf8');
                    const payload = JSON.parse(json);
                    // Only return non-sensitive fields useful for debugging key/project mismatch
                    return {
                        iss: payload?.iss,
                        role: payload?.role,
                        exp: payload?.exp,
                        iat: payload?.iat,
                        aud: payload?.aud,
                    };
                } catch {
                    return { decodeError: true };
                }
            };

            // #region agent log
            fetch('http://127.0.0.1:7247/ingest/f93d5c7d-e15e-4725-83b1-8e8a375674f4', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    location: 'actions.ts:edge_email_fallback:pre',
                    message: 'Preparing to call process-email edge function (fallback)',
                    data: {
                        hasFnUrl: !!fnUrl,
                        fnUrl,
                        hasServiceRoleKey: !!serviceRoleKey,
                        isJwtLike,
                        hasAnonKey: !!anonKey,
                        serviceRoleClaims: safeDecodeJwt(serviceRoleKey),
                        anonClaims: safeDecodeJwt(anonKey),
                        applicationId: rpcResult?.application_id,
                        email: data.email
                    },
                    timestamp: Date.now(),
                    sessionId: 'debug-session',
                    runId: 'run1',
                    hypothesisId: 'B'
                })
            }).catch(() => { });
            // #endregion

            const authKeysToTry = [
                { name: 'service_role', key: serviceRoleKey },
                { name: 'anon', key: anonKey },
            ].filter(x => !!x.key) as Array<{ name: string; key: string }>;

            if (fnUrl && authKeysToTry.length > 0) {
                const payload = {
                    type: 'INSERT',
                    table: 'applications',
                    schema: 'public',
                    old_record: null,
                    record: {
                        id: rpcResult?.application_id,
                        email: data.email,
                        full_name: data.fullName,
                        tckn: data.tckn,
                        phone: data.phone,
                        address: data.address || '',
                        form_data: {
                            deliveryMethod: data.deliveryMethod,
                            addressSharingConsent: data.addressSharingConsent,
                            cardApplicationConsent: data.cardApplicationConsent,
                            tcknPhoneSharingConsent: data.tcknPhoneSharingConsent
                        },
                        campaign_id: campaignId,
                        created_at: new Date().toISOString()
                    }
                };

                for (const auth of authKeysToTry) {
                    const resp = await fetch(fnUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': auth.key,
                            'Authorization': `Bearer ${auth.key}`
                        },
                        body: JSON.stringify(payload)
                    });

                    const respText = await resp.text();

                    // #region agent log
                    fetch('http://127.0.0.1:7247/ingest/f93d5c7d-e15e-4725-83b1-8e8a375674f4', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            location: 'actions.ts:edge_email_fallback:post',
                            message: 'process-email edge function response (fallback)',
                            data: {
                                auth: auth.name,
                                status: resp.status,
                                ok: resp.ok,
                                responseSnippet: respText?.slice(0, 500)
                            },
                            timestamp: Date.now(),
                            sessionId: 'debug-session',
                            runId: 'run1',
                            hypothesisId: resp.ok ? 'E' : 'F'
                        })
                    }).catch(() => { });
                    // #endregion

                    if (resp.ok) break;
                }
            }
        } catch (e) {
            // #region agent log
            fetch('http://127.0.0.1:7247/ingest/f93d5c7d-e15e-4725-83b1-8e8a375674f4', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    location: 'actions.ts:edge_email_fallback:error',
                    message: 'Fallback edge email call failed',
                    data: { error: (e as any)?.message || String(e) },
                    timestamp: Date.now(),
                    sessionId: 'debug-session',
                    runId: 'run1',
                    hypothesisId: 'F'
                })
            }).catch(() => { });
            // #endregion
        }

        // 6. Async Actions (Email)
        // Moved to Edge Function (triggered by Database Webhook on 'applications' INSERT)
        /*
        try {
             await sendEmail({
                 to: data.email,
                 subject: 'TALPA Başvuru Alındı',
                 html: getGenericEmailTemplate('Başvurunuz başarıyla alınmıştır.')
             });
        } catch(e) {
             console.error('Legacy Email Send Error', e);
             // Non-blocking
        }
        */

        return { success: true, message: 'Başvurunuz başarıyla alınmıştır.' };

    } catch (e) {
        logger.error('Submit Panic', e as Error);
        return { success: false, message: 'Sunucu hatası.' };
    }
}
