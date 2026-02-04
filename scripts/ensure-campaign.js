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
                const value = match[2].trim().replace(/^['"]|['"]$/g, '');
                process.env[key] = value;
            }
        });
    }
}

async function run() {
    loadEnv();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing URL or Anon Key');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Testing getDefaultCampaignId query (Anon Key)...');

    const { data: singleData, error: singleError } = await supabase
        .from('campaigns')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (singleError) {
        console.error('Query Failed:', singleError);
    } else {
        console.log('Query Success:', singleData);
    }

    console.log('-------------------');
    console.log('Listing all campaigns (Anon Key)...');
    const { data: list, error: listError } = await supabase.from('campaigns').select('id, name, is_active');
    if (listError) console.error('List Failed:', listError);
    else console.log('List Count:', list ? list.length : 0);
    if (list) console.log(list);
}

run();
