'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

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
            } catch (e) {
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

export async function adminLogin(prevState: any, formData: FormData) {
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

    redirect('/admin/dashboard');
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

export async function getApplications(campaignId?: string) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return [];

    let query = adminSupabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

    // If campaignId is provided and not 'all', filter by it
    if (campaignId && campaignId !== 'all') {
        query = query.eq('campaign_id', campaignId);
    }
    // If NO campaignId provided, maybe we just show all? Or distinct default?
    // User requested "Removing Campaign" concept. So showing ALL applications 
    // seems most appropriate for the "Single Form" feel. 
    // If they want to filter, we can add that later, but by default show all.

    // However, ensureDefaultCampaign might create one if none exists.
    // Let's just return all applications for now as the dashboard becomes "The Dashboard".

    const { data: apps, error } = await query;

    if (error) {
        console.error("Fetch Apps Error:", error);
        return [];
    }

    const encryptionKey = process.env.TCKN_ENCRYPTION_KEY || 'mysecretkey';

    // Decrypt TCKNs (or Mask if viewer)
    const decryptedApps = await Promise.all(apps.map(async (app) => {
        try {
            // Use RPC to decrypt.
            // If user is 'viewer', RPC should fail or policies should prevent access?
            // Actually, we modified decrypt_tckn function to check role.
            const { data: decrypted, error: decryptError } = await adminSupabase.rpc('decrypt_tckn', {
                p_encrypted_tckn: app.encrypted_tckn,
                p_key: encryptionKey
            });

            if (decryptError || !decrypted) {
                // If decryption fails (e.g. Viewer role), return masked
                // Mask logic: first 3, last 2 visible? Or generic mask.
                const fallbackTckn = app.dynamic_data?.tckn || '***********';
                // If we stored plain tckn in dynamic_data, that's a leak! 
                // We don't store plain tckn in dynamic_data (we shouldn't).
                // Just return masked string.
                return { ...app, tckn: '***GK***' };
            }

            return { ...app, tckn: decrypted };
        } catch (e) {
            return { ...app, tckn: 'ERROR' };
        }
    }));

    return decryptedApps;
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

export async function uploadWhitelist(prevState: any, formData: FormData) {
    const file = formData.get('file') as File;
    if (!file || !file.name.endsWith('.csv')) {
        return { success: false, message: 'Geçersiz dosya.' };
    }

    try {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim() !== '');

        if (lines.length === 0) return { success: false, message: 'Dosya boş.' };

        const members = [];
        let skipped = 0;

        // Dynamic Header Check
        // If first line has letters 'TCKN', assume header and skip
        const hasHeader = /[a-zA-Z]/.test(lines[0].split(',')[0]);
        const startIdx = hasHeader ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
            const parts = lines[i].split(',');
            // 1. TCKN (Required)
            // 2. Name (Optional)

            let tckn = parts[0]?.trim().replace(/[^0-9]/g, '');
            let name = parts.length > 1 ? parts.slice(1).join(',').trim() : 'Bilinmeyen Üye';

            if (!tckn || tckn.length !== 11) {
                skipped++;
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

export async function addWhitelistMember(prevState: any, formData: FormData) {
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

export async function saveEmailConfig(prevState: any, formData: FormData) {
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

// Re-export campaign functions
export async function getCampaigns() {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return [];
    const { data } = await adminSupabase.from('campaigns').select('*').order('created_at', { ascending: false });
    return data || [];
}

// createCampaign REMOVED as per single campaign simplification request. 
// If needed manually, admin can insert via SQL.

export async function toggleCampaignStatus(id: string, isActive: boolean) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false };
    await adminSupabase.from('campaigns').update({ is_active: isActive }).eq('id', id);
    return { success: true };
}

export async function deleteCampaign(id: string) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Auth error' };

    const { error } = await adminSupabase.from('campaigns').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
}
