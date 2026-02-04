
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Configuration
const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Error: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const ADMIN_EMAIL = 'admin@talpa.com';
const ADMIN_PASSWORD = 'TalpaAdmin123!';

async function createAdmin() {
    console.log(`Creating admin user: ${ADMIN_EMAIL}...`);

    // 1. Check if user already exists
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

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
            console.error('Error creating user:', createError.message);
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
        const { error: insertError } = await supabase
            .from('admins')
            .insert({
                id: userId,
                email: ADMIN_EMAIL,
                full_name: 'System Administrator',
                role: 'super_admin',
                is_active: true
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
