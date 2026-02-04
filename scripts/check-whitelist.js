const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // strip quotes
                process.env[key] = value;
            }
        });
    }
}

async function test() {
    loadEnv();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Force Anon Key
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('URL:', supabaseUrl);
    console.log('Key Length:', supabaseKey ? supabaseKey.length : 0);

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing URL or Key');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const tcknToTest = '15385845054';
    console.log(`Checking TCKN: ${tcknToTest}`);

    const { data, error } = await supabase
        .from('member_whitelist')
        .select('id, tckn')
        .eq('tckn', tcknToTest)
        .eq('is_active', true)
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Found:', data);
    }
}

test();
