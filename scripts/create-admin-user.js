/**
 * İlk admin kullanıcıyı oluşturur (Supabase Auth + public.admins).
 * Önce: npx supabase start  ve  supabase/migrations  uygulanmış olmalı (admins tablosu).
 * .env.local'de: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (npx supabase status → Secret).
 * Çalıştırma: node scripts/create-admin-user.js
 */
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envLocal = path.resolve(__dirname, '../.env.local');
const envRoot = path.resolve(__dirname, '../.env');
const envPath = fs.existsSync(envLocal) ? envLocal : envRoot;
if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local or .env not found. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local (Secret key: npx supabase status)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

const ADMIN_EMAIL = 'admin@talpa.com';
const ADMIN_PASSWORD = 'TalpaAdmin123!';

async function createAdmin() {
    console.log(`Creating admin user: ${ADMIN_EMAIL}...`);

    // 1. Check if user already exists
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('Error listing users:', listError.message || JSON.stringify(listError));
        return;
    }

    let userId;
    const existingUser = users?.users?.find(u => u.email === ADMIN_EMAIL);

    if (existingUser) {
        console.log('User already exists in Auth.');
        userId = existingUser.id;
    } else {
        // 2. Create user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: 'System Administrator' }
        });

        if (createError) {
            console.error('Error creating user:', createError.message || createError.error_description || createError.msg || String(createError));
            console.error('Full error:', JSON.stringify(createError, null, 2));
            return;
        }
        userId = newUser.user.id;
        console.log('User created in Auth.');
    }

    // 3. Add to public.admins table
    console.log('Adding to public.admins table...');

    // Check if exists in table
    const { data: existingAdmin, error: checkError } = await supabase
        .from('admins')
        .select('id')
        .eq('id', userId)
        .single();

    if (existingAdmin) {
        console.log('User is already in admins table.');
    } else {
        // Minimal insert: id + role (local schema may only have id, created_at, role)
        const { error: insertError } = await supabase
            .from('admins')
            .insert({
                id: userId,
                role: 'admin'
            });

        if (insertError) {
            console.error('Error adding to admins table:', insertError.message);
            return;
        }
        console.log('Successfully added to admins table.');
    }

    console.log('\n✅ Admin user ready!');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('You can now login at: http://localhost:3000/admin/login');
}

createAdmin();
