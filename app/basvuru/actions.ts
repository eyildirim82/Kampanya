'use server';

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/smtp';
import { z } from 'zod';
import { getUserEmailTemplate, getAdminEmailTemplate, getOtpEmailTemplate, getGenericEmailTemplate } from '@/lib/email-templates';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

// Initialize Supabase Client
// Initialize Supabase Client (Using Anon Key - Service Key in env seems invalid/expired)
// Note: RLS policies are configured to allow Anon role to:
// 1. SELECT from member_whitelist (public policy)
// 2. INSERT/UPDATE applications (public permissions)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Resend - REMOVED for SMTP
// const resendApiKey = process.env.RESEND_API_KEY;
// const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Validation Schema
const formSchema = z.object({
    tckn: z.string().length(11, "TCKN 11 haneli olmalıdır."),
    fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
    phone: z.string().min(10, "Geçerli bir telefon numarası giriniz."),
    email: z.string().email("Geçerli bir e-posta adresi giriniz."),
    // Address is strictly required if delivery is 'address' - handled in refinement
    address: z.string().optional(),

    city: z.string().optional(),
    district: z.string().optional(),

    // New Fields
    isDenizbankCustomer: z.enum(['yes', 'no'], { errorMap: () => ({ message: "Denizbank müşteri durumunuzu seçiniz." }) }),
    deliveryMethod: z.enum(['branch', 'address'], { errorMap: () => ({ message: "Teslimat yöntemi seçiniz." }) }),

    // address is required if deliveryMethod is 'address'

    denizbankConsent: z.boolean().refine(val => val === true, "Denizbank Paylaşım İzni'ni onaylamanız gerekmektedir."),
    talpaDisclaimer: z.boolean().refine(val => val === true, "TALPA Sorumluluk Reddi'ni onaylamanız gerekmektedir."),

    kvkkConsent: z.boolean().refine(val => val === true, "KVKK Metni'ni onaylamanız gerekmektedir."),
    openConsent: z.boolean().refine(val => val === true, "Açık Rıza Metni'ni onaylamanız gerekmektedir."),
    communicationConsent: z.boolean().refine(val => val === true, "İletişim İzni'ni onaylamanız gerekmektedir."),
    campaignId: z.string().uuid("Geçersiz kampanya ID.").optional(),
}).superRefine((data, ctx) => {
    if (data.deliveryMethod === 'address') {
        if (!data.address || data.address.length < 5) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Teslimat adresi için geçerli bir adres giriniz (en az 5 karakter).",
                path: ["address"]
            });
        }
        if (!data.city || data.city.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "İl seçiniz.",
                path: ["city"]
            });
        }
        if (!data.district || data.district.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "İlçe seçiniz.",
                path: ["district"]
            });
        }
    }
});

export type FormState = {
    success: boolean;
    message?: string;
    errors?: Record<string, string[]>;
};

// New Helper: Generate 6 digit OTP
function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

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
export async function checkTcknStatus(tckn: string, campaignId: string) {
    if (!tckn || tckn.length !== 11) return { status: 'INVALID', message: 'Geçersiz TCKN' };

    // Resolve campaign ID
    const targetCampaignId = campaignId || await getDefaultCampaignId();

    if (!targetCampaignId) {
        return { status: 'ERROR', message: 'Aktif başvuru dönemi bulunamadı.' };
    }

    try {
        // 1. Check Whitelist (Get Member ID)
        console.log('Checking TCKN:', tckn);
        // Public RLS allows check by TCKN
        const { data: member, error: memberError } = await supabase
            .from('member_whitelist')
            .select('id, tckn')
            .eq('tckn', tckn.trim())
            .eq('is_active', true)
            .single();

        if (memberError) {
            console.error('Whitelist Check Error:', memberError);
        }

        if (memberError || !member) {
            console.log('Member not found or error. Data:', member);
            return { status: 'NOT_FOUND', message: 'TALPA listesinde kaydınız bulunamadı. Lütfen TALPA ile iletişime geçiniz.' };
        }

        // 2. Check Existing Application (RPC)
        const { data: application, error: appError } = await supabase
            .rpc('get_application_status_rpc', {
                p_tckn: tckn,
                p_campaign_id: targetCampaignId
            });

        // RPC returns data directly. If 'returns table', it returns array of objects.
        const appData = (application && Array.isArray(application) && application.length > 0) ? application[0] : null;

        if (appData) {
            // EXISTS -> Send OTP
            const code = generateOtp();

            const { error: otpError } = await supabase
                .from('otp_codes')
                .insert({
                    tckn: tckn,
                    code: code
                });

            if (otpError) {
                console.error('OTP Save Error:', otpError);
                return { status: 'ERROR', message: 'Sistem hatası.' };
            }

            // Send Email
            if (appData.email) {
                try {
                    await sendEmail({
                        to: appData.email,
                        subject: 'TALPA Başvuru Doğrulama Kodu',
                        html: getOtpEmailTemplate(code)
                    });
                } catch (e) {
                    console.error('Email Send Error:', e);
                    return { status: 'ERROR', message: 'Doğrulama kodu gönderilemedi. Lütfen sistem yöneticisi ile görüşün.' };
                }
            }

            return {
                status: 'EXISTS_NEEDS_OTP',
                message: 'Mevcut başvurunuz bulundu. Kayıtlı e-posta adresinize doğrulama kodu gönderildi.',
                maskedEmail: appData.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
            };
        } else {
            // NEW -> Proceed
            return { status: 'NEW_MEMBER', message: 'Yeni başvuru.', memberId: member.id };
        }

    } catch (error) {
        console.error('Check Status Error:', error);
        return { status: 'ERROR', message: 'Beklenmedik bir hata oluştu.' };
    }
}

// ----------------------------------------------------------------------
// ACTION: Verify OTP & Get Data
// ----------------------------------------------------------------------
export async function verifyOtpAndGetData(tckn: string, code: string, campaignId: string) {
    try {
        // Resolve campaign ID
        const targetCampaignId = campaignId || await getDefaultCampaignId();
        if (!targetCampaignId) {
            return { success: false, message: 'Aktif başvuru dönemi bulunamadı.' };
        }

        // 1. Verify Code
        const { data: otpRecord, error: otpError } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('tckn', tckn)
            .eq('code', code)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (otpError || !otpRecord) {
            return { success: false, message: 'Geçersiz veya süresi dolmuş kod.' };
        }

        // 2. Consume Code
        await supabase.from('otp_codes').delete().eq('id', otpRecord.id);

        // 3. Get Application Data (RPC)
        const { data: application, error: appError } = await supabase
            .rpc('get_application_data_rpc', {
                p_tckn: tckn,
                p_campaign_id: targetCampaignId
            });

        const appData = (application && Array.isArray(application) && application.length > 0) ? application[0] : null;

        if (appError || !appData) {
            return { success: false, message: 'Başvuru verisi alınamadı.' };
        }

        return {
            success: true,
            data: {
                tckn: tckn,
                fullName: appData.full_name,
                phone: appData.phone,
                email: appData.email,
                address: appData.address,
                city: appData.city,
                district: appData.district,
                kvkkConsent: appData.kvkk_consent,
                openConsent: appData.open_consent,
                communicationConsent: appData.communication_consent,
                ...appData.dynamic_data
            }
        };

    } catch (error) {
        console.error('Verify OTP Error:', error);
        return { success: false, message: 'Doğrulama hatası.' };
    }
}

export async function submitApplication(prevState: FormState, formData: FormData): Promise<FormState> {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = headersList.get('user-agent') || 'Unknown';

    // Separate fixed fields from dynamic fields
    // Updated for Denizbank specific fields which we will treat as "Dynamic" storage-wise 
    // BUT we need to parse them from formData manually since they are not in the old list.
    const fixedKeys = ['tckn', 'fullName', 'phone', 'email', 'address', 'city', 'district', 'kvkkConsent', 'openConsent', 'communicationConsent', 'campaignId',
        'isDenizbankCustomer', 'deliveryMethod', 'denizbankConsent', 'talpaDisclaimer'];

    const fixedData: any = {};
    const dynamicData: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
        if (fixedKeys.includes(key)) {
            fixedData[key] = value;
        } else if (!key.startsWith('$ACTION')) {
            dynamicData[key] = value;
        }
    }

    // Manual type conversion for booleans
    fixedData.kvkkConsent = fixedData.kvkkConsent === 'on' || fixedData.kvkkConsent === 'true';
    fixedData.openConsent = fixedData.openConsent === 'on' || fixedData.openConsent === 'true';
    fixedData.communicationConsent = fixedData.communicationConsent === 'on' || fixedData.communicationConsent === 'true';
    fixedData.denizbankConsent = fixedData.denizbankConsent === 'on' || fixedData.denizbankConsent === 'true';
    fixedData.talpaDisclaimer = fixedData.talpaDisclaimer === 'on' || fixedData.talpaDisclaimer === 'true';

    // 1. Validate Fixed Fields
    // If campaignId is missing, we need to fetch a default one or handle it.
    // Since we removed campaign selection from UI, we must ensure campaignId is populated.

    if (!fixedData.campaignId) {
        // Fetch default/active campaign
        fixedData.campaignId = await getDefaultCampaignId();

        if (!fixedData.campaignId) {
            // If NO campaign exists, we can't submit to a foreign key.
            return { success: false, message: 'Aktif başvuru dönemi bulunamadı.' };
        }
    }

    const validatedFields = formSchema.safeParse(fixedData);

    if (!validatedFields.success) {
        return {
            success: false,
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Lütfen form alanlarını kontrol ediniz."
        };
    }

    const data = validatedFields.data;

    try {
        // 2. Rate Limiting Check
        const { data: isAllowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
            p_ip_address: ip,
            p_endpoint: 'submit_application',
            p_max_requests: 10, // Increased for OTP flow loops
            p_window_minutes: 60
        });

        if (rateLimitError || !isAllowed) {
            return { success: false, message: 'Çok fazla işlem yaptınız. Lütfen bekleyiniz.' };
        }

        // 3. Encrypt TCKN for Storage
        const encryptionKey = process.env.TCKN_ENCRYPTION_KEY || 'mysecretkey';
        const { data: encryptedTckn, error: encryptionError } = await supabase
            .rpc('encrypt_tckn', {
                p_tckn: data.tckn,
                p_key: encryptionKey
            });

        if (encryptionError || !encryptedTckn) {
            return { success: false, message: 'Veri güvenliği hatası.' };
        }

        // 4. Prepare Metadata
        const consentMetadata = {
            ip,
            userAgent,
            timestamp: new Date().toISOString(),
            consentVersion: 'v1.0',
            kvkkAccepted: data.kvkkConsent,
            openConsentAccepted: data.openConsent
        };

        // 5. Save to Database (UPSERT via RPC)
        // RPC handles finding member_id and upsert logic
        const { data: rpcResult, error: dbError } = await supabase
            .rpc('upsert_application_rpc', {
                p_tckn: data.tckn,
                p_campaign_id: data.campaignId,
                p_encrypted_tckn: encryptedTckn,
                p_full_name: data.fullName,
                p_phone: data.phone,
                p_email: data.email,
                p_address: data.address,
                p_city: data.city,
                p_district: data.district,
                p_kvkk_consent: data.kvkkConsent,
                p_open_consent: data.openConsent,
                p_communication_consent: data.communicationConsent,
                p_consent_metadata: consentMetadata,
                p_dynamic_data: {
                    ...dynamicData,
                    isDenizbankCustomer: data.isDenizbankCustomer,
                    deliveryMethod: data.deliveryMethod,
                    denizbankConsent: data.denizbankConsent,
                    talpaDisclaimer: data.talpaDisclaimer
                }
            });

        if (dbError || (rpcResult && !rpcResult.success)) {
            console.error('Database/RPC Error:', dbError || rpcResult);
            return { success: false, message: 'Başvuru kaydedilemedi: ' + (dbError?.message || rpcResult?.message || '') };
        }

        // 7. Send Emails (SMTP)
        if (data.campaignId) {
            try {
                // Fetch email configurations for this campaign
                const { data: emailConfigs } = await supabase
                    .from('email_configurations')
                    .select('*')
                    .eq('campaign_id', data.campaignId)
                    .eq('is_active', true);

                if (emailConfigs && emailConfigs.length > 0) {
                    for (const config of emailConfigs) {
                        let toAddresses: string[] = [];

                        if (config.recipient_type === 'applicant') {
                            toAddresses = [data.email];
                        } else if (config.recipient_type === 'admin') {
                            toAddresses = [process.env.ADMIN_EMAIL || 'admin@example.com'];
                        } else if (config.recipient_type === 'custom' && config.recipient_email) {
                            toAddresses = [config.recipient_email];
                        }

                        if (toAddresses.length === 0) continue;

                        // Replace Variables in Subject & Body
                        let subject = config.subject_template || 'Talpa Bildirim';
                        let body = config.body_template || '';

                        const replacements: any = {
                            '{{name}}': data.fullName,
                            '{{tckn}}': data.tckn,
                            '{{email}}': data.email,
                            '{{phone}}': data.phone,
                            '{{address}}': data.address || '-',
                            '{{city}}': data.city || '-',
                            '{{district}}': data.district || '-',
                            '{{deliveryMethod}}': data.deliveryMethod === 'address' ? 'Adrese Teslim' : 'Şubeden Teslim',
                            '{{isDenizbankCustomer}}': data.isDenizbankCustomer === 'yes' ? 'Evet' : 'Hayır',
                            '{{consents}}': `KVKK: ${data.kvkkConsent ? 'Evet' : 'Hayır'}, Açık Rıza: ${data.openConsent ? 'Evet' : 'Hayır'}, İletişim: ${data.communicationConsent ? 'Evet' : 'Hayır'}, Denizbank: ${data.denizbankConsent ? 'Evet' : 'Hayır'},`,
                            '{{date}}': new Date().toLocaleDateString('tr-TR')
                        };

                        Object.keys(replacements).forEach(key => {
                            const val = replacements[key] || '';
                            // Case insensitive replacement
                            const regex = new RegExp(key, 'gi');
                            subject = subject.replace(regex, val);
                            body = body.replace(regex, val);
                        });

                        await sendEmail({
                            to: toAddresses,
                            subject: subject,
                            html: getGenericEmailTemplate(subject, body.replace(/\n/g, '<br>')),
                        });
                    }
                } else {
                    // Fallback to default if no config? Or silent?
                    // Let's keep silent to avoid spam if not configured.
                    logger.info('No email config found for campaign', { campaignId: data.campaignId });
                }

            } catch (e: any) {
                console.error('Email Send Error Details:', JSON.stringify(e, null, 2));
                logger.error('Email Send Failed', e, { campaignId: data.campaignId });
                // Don't fail the submission
            }
        }

        logger.applicationEvent('APPLICATION_SUBMITTED', undefined, {
            campaignId: data.campaignId || null,
            status: 'UPSERTED'
        });

        return { success: true, message: 'Başvurunuz başarıyla alınmıştır.' };

    } catch (error) {
        logger.error('Başvuru gönderim hatası', error as Error, { ip });
        return { success: false, message: 'Beklenmedik bir hata oluştu.' };
    }
}
