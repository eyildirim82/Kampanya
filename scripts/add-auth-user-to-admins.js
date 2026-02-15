/**
 * Auth'da zaten oluşturulmuş bir kullanıcıyı public.admins tablosuna ekler.
 * Kullanım: node scripts/add-auth-user-to-admins.js [email]
 * Örnek: node scripts/add-auth-user-to-admins.js admin@talpa.com
 */
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local not found.');
    process.exit(1);
}
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

const EMAIL = process.argv[2] || 'admin@talpa.com';

async function addToAdmins() {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
        console.error('Error listing users:', listErr.message);
        process.exit(1);
    }
    const user = list?.users?.find(u => u.email === EMAIL);
    if (!user) {
        console.error(`User not found: ${EMAIL}. Create the user in Studio (Authentication → Users → Add user) first.`);
        process.exit(1);
    }

    const { data: existing } = await supabase.from('admins').select('id').eq('id', user.id).single();
    if (existing) {
        console.log('User is already in admins table.');
        console.log('Email:', EMAIL, '| ID:', user.id);
        return;
    }

    const { error: insertErr } = await supabase.from('admins').insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 'Admin',
        role: 'admin',
        is_active: true
    });

    if (insertErr) {
        console.error('Error adding to admins:', insertErr.message);
        process.exit(1);
    }

    console.log('✅ Added to admins:', EMAIL, '(id:', user.id, ')');
    console.log('You can now login at: http://localhost:3000/admin/login');
}

addToAdmins();
