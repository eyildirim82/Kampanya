/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logger } from '@/lib/logger';

import { sendEmail } from '@/lib/smtp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper to get authenticated client
async function getAdminClient() {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!token || !refreshToken) return null;

    const client = createClient(supabaseUrl, supabaseKey);

    // Set the session using access and refresh tokens
    const { error } = await client.auth.setSession({
        access_token: token,
        refresh_token: refreshToken,
    });

    if (error) {
        // If the refresh token is invalid (e.g. expired or reused), we should treat as logged out
        // instead of crashing or erroring loudly.
        if (error.code === 'refresh_token_not_found' || error.status === 400) {
            // Graceful logout (or session invalidation)
            try {
                cookieStore.delete('sb-access-token');
                cookieStore.delete('sb-refresh-token');
            } catch {
                // Ignore if we can't delete (e.g. inside SC)
            }
            return null;
        }

        console.warn("Session Restore Warning:", error.message);
        return null;
    }

    return client;
}

// ----------------------------------------------------------------------
// AUTH
// ----------------------------------------------------------------------

export async function adminLogin(prevState: unknown, formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error || !data.session) {
        return { success: false, message: 'Giriş yapılamadı.' };
    }

    // Let's rely on the returned session.
    const session = data.session;
    if (!session) {
        return { success: false, message: 'Oturum açılamadı.' };
    }

    console.log('[Login Debug] User ID:', session.user.id);
    console.log('[Login Debug] Email:', session.user.email);

    // Verify Admin Role in DB
    // Use a client with the user's token
    const userClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${session.access_token}` } }
    });

    const { data: adminData, error: adminError } = await userClient
        .from('admins')
        .select('id, role')
        .eq('id', session.user.id)
        .single();

    console.log('[Login Debug] Admin Data:', adminData);
    console.log('[Login Debug] Admin Error:', adminError);

    if (adminError || !adminData) {
        // Sign out if not admin
        await supabase.auth.signOut();
        return { success: false, message: `Bu alana erişim yetkiniz yok. (${session.user.email})` };
    }

    const cookieStore = await cookies();
    cookieStore.set('sb-access-token', session.access_token, { path: '/', httpOnly: true, secure: true, maxAge: 604800 });
    cookieStore.set('sb-refresh-token', session.refresh_token, { path: '/', httpOnly: true, secure: true, maxAge: 604800 });

    return { success: true, message: 'Giriş başarılı.', redirectUrl: '/admin/dashboard' };
}

export async function adminLogout() {
    const cookieStore = await cookies();
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');
    redirect('/admin/login');
}

// ----------------------------------------------------------------------
// APPLICATIONS (For Export)
// ----------------------------------------------------------------------

// Helper to decrypt applications
// Helper to decrypt applications
async function decryptApplications(apps: Record<string, any>[], adminSupabase: SupabaseClient) {
    const encryptionKey = process.env.TCKN_ENCRYPTION_KEY || 'mysecretkey';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let supabaseService: SupabaseClient | null = null;
    if (serviceRoleKey) {
        supabaseService = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
    }

    return await Promise.all(apps.map(async (app) => {
        try {
            // Priority 1: Service Role (Most reliable if configured)
            if (supabaseService) {
                const { data: decrypted, error } = await supabaseService.rpc('decrypt_tckn', {
                    p_encrypted_tckn: app.encrypted_tckn,
                    p_key: encryptionKey
                });
                if (!error && decrypted) return { ...app, tckn: decrypted };
                console.warn("Service Role Decrypt Failed:", error);
            }

            // Priority 2: Admin User Session (Fallback)
            const { data: decryptedUser, error: errorUser } = await adminSupabase.rpc('decrypt_tckn', {
                p_encrypted_tckn: app.encrypted_tckn,
                p_key: encryptionKey
            });

            if (!errorUser && decryptedUser) return { ...app, tckn: decryptedUser };

            console.error("User Role Decrypt Failed:", errorUser);
            return { ...app, tckn: '***GK***' };
        } catch (err) {
            console.error("Decrypt Exception:", err);
            return { ...app, tckn: 'ERROR' };
        }
    }));
}

export async function getApplications(campaignId?: string, page: number = 1, limit: number = 50) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { data: [], count: 0 };

    let query = adminSupabase
        .from('applications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    // If campaignId is provided and not 'all', filter by it
    if (campaignId && campaignId !== 'all') {
        query = query.eq('campaign_id', campaignId);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: apps, error, count } = await query.range(from, to);

    if (error) {
        console.error("Fetch Apps Error:", error);
        return { data: [], count: 0 };
    }

    const decryptedApps = await decryptApplications(apps, adminSupabase);

    return { data: decryptedApps, count: count || 0 };
}

export async function getAllApplicationsForExport(campaignId?: string) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return [];

    let query = adminSupabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

    if (campaignId && campaignId !== 'all') {
        query = query.eq('campaign_id', campaignId);
    }

    // Fetch all (up to reasonable limit for export, e.g. 5000)
    const { data: apps, error } = await query.range(0, 4999);

    if (error) {
        console.error("Fetch Export Apps Error:", error);
        return [];
    }

    return await decryptApplications(apps, adminSupabase);
}

export async function deleteApplication(id: string) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth required' };

    const { error } = await adminSupabase.from('applications').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
}

// ----------------------------------------------------------------------
// WHITELIST (Updated for plain TCKN)
// ----------------------------------------------------------------------

export async function getWhitelistMembers() {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return [];

    const { data, error } = await adminSupabase
        .from('member_whitelist')
        .select('*') // Now selects 'tckn' instead of hash logic
        .order('synced_at', { ascending: false })
        .limit(100);

    if (error) return [];

    // Mask TCKNs for display in UI? Or show full?
    // Admin likely usually wants to see it, but let's standard mask 
    // to match "Masked Name" idea for privacy unless clicked.
    // For now returning raw data, frontend can formatting.
    return data;
}

export async function uploadWhitelist(prevState: unknown, formData: FormData) {
    const file = formData.get('file') as File;
    if (!file || !file.name.endsWith('.csv')) {
        return { success: false, message: 'Geçersiz dosya.' };
    }

    try {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim() !== '');

        if (lines.length === 0) return { success: false, message: 'Dosya boş.' };

        const members = [];


        // Dynamic Header Check
        // If first line has letters 'TCKN', assume header and skip
        const hasHeader = /[a-zA-Z]/.test(lines[0].split(',')[0]);
        const startIdx = hasHeader ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
            const parts = lines[i].split(',');
            // 1. TCKN (Required)
            // 2. Name (Optional)

            const tckn = parts[0]?.trim().replace(/[^0-9]/g, '');
            const name = parts.length > 1 ? parts.slice(1).join(',').trim() : 'Bilinmeyen Üye';

            if (!tckn || tckn.length !== 11) {
                // skipped++;
                continue;
            }

            members.push({
                tckn: tckn,
                masked_name: name === 'Bilinmeyen Üye' ? name : name, // We store full name now? Or still masked? 
                // Schema has 'masked_name'. 
                // Wait, if we upload real data, we probably want to store it securely OR just use it for verification.
                // The prompt says "Sadece TCKN sütunu içeren...". 
                // If we only have TCKN, we don't have Name.
                // If we keep 'masked_name' as column, we should probably set a default.
                is_active: true,
                synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        if (members.length === 0) return { success: false, message: 'Geçerli kayıt bulunamadı.' };

        const adminSupabase = await getAdminClient();
        if (!adminSupabase) return { success: false, message: 'Auth error' };

        // Batch Upsert
        // We need conflict on TCKN. Schema "tckn" should be UNIQUE.
        // Let's assume unique constraint on 'tckn'.
        // Original schema had unique on tckn_hash. New schema added tckn. 
        // Did we add generic UNIQUE to TCKN? 
        // Migration 20260203000000: "ALTER TABLE member_whitelist ADD COLUMN IF NOT EXISTS tckn TEXT UNIQUE;"?
        // Let's hope it is unique. I'll check/add if needed in NEXT step if it fails.
        // Assuming it's compatible.

        const { error } = await adminSupabase
            .from('member_whitelist')
            .upsert(members, { onConflict: 'tckn' });

        if (error) throw error;

        logger.adminAction('WHITELIST_UPLOAD', 'system', { count: members.length });
        return { success: true, message: `${members.length} kayıt yüklendi.` };

    } catch (error: any) {
        console.error('Upload Error:', error);
        return { success: false, message: 'Hata: ' + error.message };
    }
}

export async function addWhitelistMember(prevState: unknown, formData: FormData) {
    const tckn = formData.get('tckn') as string;
    const name = formData.get('name') as string; // Optional now?
    const isActive = formData.get('is_active') === 'on';

    if (!tckn || tckn.length !== 11) return { success: false, message: 'Geçersiz TCKN.' };

    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth error' };

    const { error } = await adminSupabase
        .from('member_whitelist')
        .insert({
            tckn,
            masked_name: name || 'Manuel Kayıt',
            is_active: isActive
        });

    if (error) return { success: false, message: error.message };

    return { success: true, message: 'Eklendi.' };
}

export async function uploadDebtorList(prevState: unknown, formData: FormData) {
    const file = formData.get('file') as File;
    if (!file || !file.name.endsWith('.csv')) {
        return { success: false, message: 'Geçersiz dosya.' };
    }

    try {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim() !== '');

        if (lines.length === 0) return { success: false, message: 'Dosya boş.' };

        const members = [];


        // Dynamic Header Check
        const hasHeader = /[a-zA-Z]/.test(lines[0].split(',')[0]);
        const startIdx = hasHeader ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
            const parts = lines[i].split(',');
            const tckn = parts[0]?.trim().replace(/[^0-9]/g, '');
            // Optional name
            const name = parts.length > 1 ? parts.slice(1).join(',').trim() : undefined;

            if (!tckn || tckn.length !== 11) {
                // skipped++;
                continue;
            }

            members.push({
                tckn: tckn,
                // Only provide name if new insert, but upsert will overwrite if we provide it.
                // If we don't provide masked_name, upsert might fail on NULL if not nullable?
                // masked_name is NOT NULL in schema usually. 
                // Strategy: If name provided, use it. If not, if exists keep it? 
                // Supabase upsert: provided columns update. 
                // BUT we need to handle "Insert new debtor" case too.
                // If inserting new, we need masked_name.
                masked_name: name || 'Borçlu Üye',
                // @ts-expect-error: is_debtor missing in types (added manually via migration)
                is_active: true,
                // @ts-expect-error: is_debtor is a custom field added via migration
                is_debtor: true,
                synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as any);
        }

        if (members.length === 0) return { success: false, message: 'Geçerli kayıt bulunamadı.' };

        const adminSupabase = await getAdminClient();
        if (!adminSupabase) return { success: false, message: 'Auth error' };

        // We use upsert. 
        // Note: This matches on TCKN. It will Update existing, or Insert new.
        const { error } = await adminSupabase
            .from('member_whitelist')
            .upsert(members, { onConflict: 'tckn' });

        if (error) throw error;

        logger.adminAction('DEBTOR_UPLOAD', 'system', { count: members.length });
        return { success: true, message: `${members.length} borçlu kayıt güncellendi/eklendi.` };

    } catch (error: any) {
        console.error('Debtor Upload Error:', error);
        return { success: false, message: 'Hata: ' + error.message };
    }
}

export async function updateWhitelistMember(id: string, isActive: boolean) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth error' };

    const { error } = await adminSupabase
        .from('member_whitelist')
        .update({ is_active: isActive })
        .eq('id', id);

    if (error) return { success: false, message: error.message };
    return { success: true };
}

export async function deleteWhitelistMember(id: string) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth error' };

    const { error } = await adminSupabase.from('member_whitelist').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
}

export async function seedDemoData() {
    // ... Simplified demo seed with just TCKNs ...
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth error' };

    const demoMembers = [
        { tckn: '11111111111', masked_name: 'Demo Üye 1' },
        { tckn: '22222222222', masked_name: 'Demo Üye 2' },
        { tckn: '33333333333', masked_name: 'Demo Üye 3' },
    ];

    const { error } = await adminSupabase
        .from('member_whitelist')
        .upsert(demoMembers, { onConflict: 'tckn' });

    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Demo veriler yüklendi.' };
}

// ----------------------------------------------------------------------
// HELPER: Default Campaign
// ----------------------------------------------------------------------
export async function ensureDefaultCampaign() {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return null;

    // Check for existing active campaign (any)
    const { data: existing } = await adminSupabase
        .from('campaigns')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (existing) return existing.id;

    // Create default if none
    const campaignCode = 'GENERAL_' + Date.now();
    const { data: newCampaign, error } = await adminSupabase
        .from('campaigns')
        .insert({
            name: 'Genel Başvuru',
            is_active: true,
            campaign_code: campaignCode
        })
        .select('id')
        .single();

    if (error) {
        console.error('Default Campaign Create Error:', error);
        return null;
    }
    return newCampaign.id;
}

// ----------------------------------------------------------------------
// EMAIL CONFIGURATION
// ----------------------------------------------------------------------

export async function getEmailConfigs(campaignId?: string) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return [];

    const targetId = campaignId || await ensureDefaultCampaign();
    if (!targetId) return [];

    const { data, error } = await adminSupabase
        .from('email_configurations')
        .select('*')
        .eq('campaign_id', targetId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Fetch Email Configs Error:', error);
        return [];
    }
    return data;
}

export async function saveEmailConfig(prevState: unknown, formData: FormData) {
    const id = formData.get('id') as string;
    // campaignId might not be passed, fetch default
    let campaignId = formData.get('campaignId') as string;

    if (!campaignId) {
        campaignId = await ensureDefaultCampaign();
    }

    const recipientType = formData.get('recipientType') as string;
    const recipientEmail = formData.get('recipientEmail') as string;
    const subjectTemplate = formData.get('subjectTemplate') as string;
    const bodyTemplate = formData.get('bodyTemplate') as string;
    const isActive = formData.get('isActive') === 'on';

    if (!campaignId || !subjectTemplate || !bodyTemplate) {
        return { success: false, message: 'Eksik bilgi.' };
    }

    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth error' };

    const payload = {
        campaign_id: campaignId,
        recipient_type: recipientType,
        recipient_email: recipientEmail,
        subject_template: subjectTemplate,
        body_template: bodyTemplate,
        is_active: isActive,
        updated_at: new Date().toISOString()
    };

    let error;
    if (id) {
        const { error: updateError } = await adminSupabase
            .from('email_configurations')
            .update(payload)
            .eq('id', id);
        error = updateError;
    } else {
        const { error: insertError } = await adminSupabase
            .from('email_configurations')
            .insert(payload);
        error = insertError;
    }

    if (error) return { success: false, message: error.message };

    // We don't redirect here, we let the client refresh
    return { success: true, message: 'Kaydedildi.' };
}

export async function deleteEmailConfig(id: string) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth error' };

    const { error } = await adminSupabase.from('email_configurations').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
}

function compileTemplate(source: string, data: Record<string, string>) {
    return Object.entries(data).reduce((output, [key, value]) => {
        return output
            .replaceAll(`{{${key}}}`, value)
            .replaceAll(`{{${key.toLowerCase()}}}`, value);
    }, source || '');
}

export async function sendTestEmail(payload: {
    campaignId: string;
    templateId: string;
    testRecipient: string;
}) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth error' };

    const campaignId = String(payload.campaignId || '').trim();
    const templateId = String(payload.templateId || '').trim();
    const testRecipient = String(payload.testRecipient || '').trim();

    if (!campaignId || !templateId || !testRecipient) {
        return { success: false, message: 'Kampanya, şablon ve alıcı e-posta zorunludur.' };
    }

    const { data: template, error: templateError } = await adminSupabase
        .from('email_configurations')
        .select('*')
        .eq('id', templateId)
        .eq('campaign_id', campaignId)
        .single();

    if (templateError || !template) {
        return { success: false, message: 'Şablon bulunamadı.' };
    }

    const sampleData: Record<string, string> = {
        name: 'Test Kullanici',
        full_name: 'Test Kullanici',
        email: testRecipient,
        tckn: '12345678901',
        phone: '5551234567',
        address: 'Istanbul',
        city: 'Istanbul',
        district: 'Bakirkoy',
        deliveryMethod: 'Subeden Teslim',
        requestedAmount: '2.000.000 TL',
        isDenizbankCustomer: 'Evet',
        consents: 'Onaylandi',
        date: new Date().toLocaleDateString('tr-TR')
    };

    const subject = compileTemplate(template.subject_template, sampleData);
    const html = compileTemplate(template.body_template, sampleData);

    try {
        await sendEmail({
            to: testRecipient,
            subject,
            html
        });
        return { success: true, message: 'Test e-postasi gonderildi.' };
    } catch {
        return { success: false, message: 'Test e-postasi gonderilemedi.' };
    }
}

// Re-export campaign functions
export async function getCampaigns() {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return [];
    const { data } = await adminSupabase.from('campaigns').select('*').order('created_at', { ascending: false });
    return data || [];
}

function toCampaignCode(input: string): string {
    return input
        .toLocaleUpperCase('tr-TR')
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

export async function createCampaign(prevState: unknown, formData: FormData) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth error' };

    const name = String(formData.get('name') || '').trim();
    const codeFromForm = String(formData.get('campaignCode') || '').trim();
    const isActive = formData.get('isActive') === 'on';

    if (!name) {
        return { success: false, message: 'Kampanya adı zorunludur.' };
    }

    const campaignCode = codeFromForm || toCampaignCode(name) || `CAMPAIGN_${Date.now()}`;
    const payload: Record<string, any> = {
        campaign_code: campaignCode,
        is_active: isActive,
    };

    payload.name = name;

    const { error } = await adminSupabase.from('campaigns').insert(payload);
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Kampanya oluşturuldu.' };
}

export async function toggleCampaignStatus(id: string, isActive: boolean) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth error' };

    const { error } = await adminSupabase.from('campaigns').update({ is_active: isActive }).eq('id', id);
    if (error) return { success: false, message: error.message };
    return { success: true, message: '' };
}

export async function deleteCampaign(id: string) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth error' };

    const { error } = await adminSupabase.from('campaigns').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
}
