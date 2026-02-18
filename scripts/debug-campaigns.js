const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCampaigns() {
    console.log('--- Fetching Active Campaigns WITH RELATION (as per getActiveCampaigns) ---');
    const { data: activeCampaigns, error: activeError } = await supabase
        .from('campaigns')
        .select('*, institution:institutions(name, logo_url, primary_color, secondary_color)')
        .or('status.eq.active,is_active.eq.true')
        .order('created_at', { ascending: false });

    if (activeError) {
        console.error('Error fetching active campaigns with relation:', activeError);
    } else {
        console.log(`Found ${activeCampaigns ? activeCampaigns.length : 0} active campaigns with relation.`);
        if (activeCampaigns) {
            activeCampaigns.forEach(c => {
                const instName = c.institution ? c.institution.name : 'NONE';
                console.log(`- [${c.id}] ${c.title || c.name} (Inst: ${instName})`);
            });
        }
    }

    console.log('\n--- Fetching ALL Campaigns (Basic) ---');
    const { data: allCampaigns, error: allError } = await supabase
        .from('campaigns')
        .select('id, name, status, is_active, institution_id'); // Check institution_id

    if (allError) {
        console.error('Error fetching all campaigns:', allError);
    } else {
        console.log(`Found ${allCampaigns ? allCampaigns.length : 0} total campaigns.`);
        if (allCampaigns) {
            allCampaigns.forEach(c => {
                console.log(`- [${c.id}] ${c.name} (Status: ${c.status}, Is Active: ${c.is_active}, InstID: ${c.institution_id})`);
            });
        }
    }
}

debugCampaigns();
