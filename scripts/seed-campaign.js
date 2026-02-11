const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const SUPABASE_URL = 'http://127.0.0.1:54321'; // Explicitly local host
const SERVICE_ROLE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function seed() {
    console.log('Seeding default active campaign...');

    const campaignCode = 'DEFAULT_2026';

    const { data: existing } = await supabase
        .from('campaigns')
        .select('id')
        .eq('campaign_code', campaignCode)
        .maybeSingle();

    if (existing) {
        console.log('Campaign already exists. Ensuring it is active and has valid dates...');
        await supabase.from('campaigns').update({
            is_active: true,
            name: 'Genel Başvuru (Yerel)',
            start_date: '2024-01-01',
            end_date: '2030-01-01'
        }).eq('id', existing.id);
    } else {
        const { data, error } = await supabase
            .from('campaigns')
            .insert({
                name: 'Genel Başvuru (Yerel)',
                campaign_code: campaignCode,
                is_active: true,
                start_date: '2024-01-01',
                end_date: '2030-01-01'
            })
            .select();

        if (error) console.error('Error seeding campaign:', error);
        else console.log('Successfully seeded campaign.');
    }

    // Seed test member
    console.log('Seeding test member...');
    const testTckn = '11111111110';
    const { data: existingMember } = await supabase
        .from('member_whitelist')
        .select('id')
        .eq('tckn', testTckn)
        .maybeSingle();

    if (existingMember) {
        console.log('Test member already exists.');
    } else {
        const { error: memberError } = await supabase
            .from('member_whitelist')
            .insert({
                tckn: testTckn,
                masked_name: 'TALPA TEST K...',
                is_active: true
            });

        if (memberError) console.error('Error seeding member:', memberError);
        else console.log('Successfully seeded test member (TCKN: 11111111110).');
    }
}

seed();
