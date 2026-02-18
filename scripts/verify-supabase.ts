import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Verifying Supabase connection...');
    console.log(`URL: ${supabaseUrl}`);

    // Test 1: Query campaigns status
    const { data: campaigns, error: campError } = await supabase
        .from('campaigns')
        .select('id, name, status, is_active')
        .limit(5);

    if (campError) {
        console.error('Error fetching campaigns:', campError);
        process.exit(1);
    }
    console.log('Campaigns fetched successfully:', campaigns?.length);
    if (campaigns && campaigns.length > 0) {
        console.log('First campaign status:', campaigns[0].status);
    }

    // Test 2: Call submit_dynamic_application_secure with dummy data to check signature
    // We expect a failure (campaign not found or invalid TCKN), but NOT a "function does not exist" error.
    const { data: rpcData, error: rpcError } = await supabase.rpc('submit_dynamic_application_secure', {
        p_campaign_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        p_tckn: '11111111111',
        p_form_data: {}
    });

    if (rpcError) {
        console.log('RPC Call Result (Error as expected for dummy ID):', rpcError.message);
        if (rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
            console.error('CRITICAL: Function submit_dynamic_application_secure does not exist!');
            process.exit(1);
        }
    } else {
        console.log('RPC Call Result:', rpcData);
    }

    // Test 3: Check applications table for client_ip column (by selecting it)
    // If column doesn't exist, this will query error.
    const { error: colError } = await supabase
        .from('applications')
        .select('client_ip')
        .limit(1);

    if (colError) {
        console.error('Error selecting client_ip from applications:', colError.message);
        process.exit(1);
    }
    console.log('Column client_ip exists in applications table.');

    console.log('verification complete!');
}

verify();
