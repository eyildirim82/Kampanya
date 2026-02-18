const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

console.log('Using key length:', supabaseKey.length);

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixData() {
    // 1. Get DenizBank Institution ID
    const { data: instData, error: instError } = await supabase
        .from('institutions')
        .select('id')
        .eq('code', 'DENIZBANK')
        .single();

    if (instError || !instData) {
        console.error('Could not find DENIZBANK institution:', instError);
        return;
    }

    const denizBankId = instData.id;
    console.log('Found DenizBank ID:', denizBankId);

    // 2. Find campaigns with null institution_id and update them
    const { data: campaigns, error: findError } = await supabase
        .from('campaigns')
        .select('id, name')
        .is('institution_id', null);

    if (findError) {
        console.error('Error finding orphan campaigns:', findError);
        return;
    }

    console.log(`Found ${campaigns.length} orphan campaigns.`);

    for (const campaign of campaigns) {
        console.log(`Updating campaign ${campaign.name} (${campaign.id})...`);
        const { data, error: updateError } = await supabase
            .from('campaigns')
            .update({ institution_id: denizBankId })
            .eq('id', campaign.id)
            .select();

        if (updateError) {
            console.error('Error updating campaign:', updateError);
        } else {
            console.log('Success! Updated:', data);
        }
    }
}

fixData();
